"""
Supabase access for the AI service.

Uses the REST and Storage HTTP APIs directly with `requests` (already present in
the verified environment) rather than adding supabase-py for four calls.

Every request here carries the service-role key, so this module is server-side
only — it bypasses RLS exactly like the Next.js app's admin client does.
"""

from __future__ import annotations

import re
import threading
from dataclasses import dataclass
from typing import Any

import requests

from config import AUDIO_BUCKET, Settings

TIMEOUT_SECONDS = 30
DOWNLOAD_TIMEOUT_SECONDS = 300

UUID_PATTERN = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

# `<lecture_id>/original.<ext>` — the only shape the app ever writes.
AUDIO_PATH_PATTERN = re.compile(r"^[0-9a-f-]{36}/original\.[a-z0-9]{1,5}$", re.IGNORECASE)


class SupabaseError(RuntimeError):
    """A Supabase request failed."""


@dataclass(frozen=True)
class Lecture:
    id: str
    title: str
    subject: str
    teacher_name: str | None
    audio_path: str | None
    status: str


def is_lecture_id(value: str) -> bool:
    return bool(UUID_PATTERN.match(value or ""))


class SupabaseClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._local = threading.local()

    @property
    def _session(self) -> requests.Session:
        """
        One session per thread, with the service-role headers already set.

        The background lecture worker and the request handlers share this client,
        and a `requests.Session` is not safe to use from several threads at once,
        so each thread keeps its own (and its own connection pool).
        """
        session = getattr(self._local, "session", None)
        if session is None:
            session = requests.Session()
            session.headers.update(
                {
                    "apikey": self._settings.service_role_key,
                    "Authorization": f"Bearer {self._settings.service_role_key}",
                }
            )
            self._local.session = session
        return session

    # ------------------------------------------------------------------ reads

    def get_lecture(self, lecture_id: str) -> Lecture | None:
        if not is_lecture_id(lecture_id):
            return None

        response = self._session.get(
            f"{self._settings.supabase_url}/rest/v1/lectures",
            params={
                "id": f"eq.{lecture_id}",
                "select": "id,title,subject,teacher_name,audio_url,status",
                "limit": "1",
            },
            timeout=TIMEOUT_SECONDS,
        )
        if not response.ok:
            raise SupabaseError(f"Lecture lookup failed ({response.status_code}).")

        rows = response.json()
        if not isinstance(rows, list) or not rows:
            return None

        row = rows[0]
        return Lecture(
            id=str(row["id"]),
            title=str(row.get("title") or ""),
            subject=str(row.get("subject") or ""),
            teacher_name=row.get("teacher_name"),
            audio_path=row.get("audio_url"),
            status=str(row.get("status") or ""),
        )

    def get_transcript(self, lecture_id: str) -> str | None:
        """The stored transcript, read separately because it is large."""
        if not is_lecture_id(lecture_id):
            return None

        response = self._session.get(
            f"{self._settings.supabase_url}/rest/v1/lectures",
            params={"id": f"eq.{lecture_id}", "select": "transcript", "limit": "1"},
            timeout=TIMEOUT_SECONDS,
        )
        if not response.ok:
            raise SupabaseError(f"Transcript lookup failed ({response.status_code}).")

        rows = response.json()
        if not isinstance(rows, list) or not rows:
            return None
        return rows[0].get("transcript")

    def get_notes(self, lecture_id: str) -> dict[str, Any] | None:
        """The generated notes for a lecture, or None if it has none yet."""
        if not is_lecture_id(lecture_id):
            return None

        response = self._session.get(
            f"{self._settings.supabase_url}/rest/v1/lecture_notes",
            params={
                "lecture_id": f"eq.{lecture_id}",
                "select": (
                    "quick_summary,full_summary,key_points,definitions,examples,"
                    "important_points,exam_questions,revision_notes"
                ),
                "limit": "1",
            },
            timeout=TIMEOUT_SECONDS,
        )
        if not response.ok:
            raise SupabaseError(f"Notes lookup failed ({response.status_code}).")

        rows = response.json()
        if not isinstance(rows, list) or not rows:
            return None
        return rows[0] if isinstance(rows[0], dict) else None

    def download_audio(self, lecture: Lecture) -> bytes:
        """
        Fetches the lecture's audio from the private bucket.

        The object path is checked against the expected shape and against the
        lecture's own id, so a tampered `audio_url` cannot point this service at
        another lecture's object (CLAUDE.md §15).
        """
        path = (lecture.audio_path or "").strip()
        if not path:
            raise SupabaseError("This lecture has no stored audio.")
        if not AUDIO_PATH_PATTERN.match(path) or not path.startswith(f"{lecture.id}/"):
            raise SupabaseError("The stored audio path for this lecture is not valid.")

        response = self._session.get(
            f"{self._settings.supabase_url}/storage/v1/object/{AUDIO_BUCKET}/{path}",
            timeout=DOWNLOAD_TIMEOUT_SECONDS,
        )
        if not response.ok:
            raise SupabaseError(
                f"Could not download the lecture audio ({response.status_code})."
            )
        if not response.content:
            raise SupabaseError("The stored lecture audio is empty.")

        return response.content

    # ----------------------------------------------------------------- writes

    def _patch_lecture(self, lecture_id: str, payload: dict[str, Any]) -> None:
        response = self._session.patch(
            f"{self._settings.supabase_url}/rest/v1/lectures",
            params={"id": f"eq.{lecture_id}"},
            json=payload,
            headers={"Content-Type": "application/json", "Prefer": "return=minimal"},
            timeout=TIMEOUT_SECONDS,
        )
        if not response.ok:
            raise SupabaseError(f"Lecture update failed ({response.status_code}).")

    def set_status(self, lecture_id: str, status: str) -> None:
        """Moves the lecture to a new stage and clears any previous error."""
        self._patch_lecture(lecture_id, {"status": status, "error_message": None})

    def set_transcript(self, lecture_id: str, transcript: str) -> None:
        self._patch_lecture(lecture_id, {"transcript": transcript})

    def set_failed(self, lecture_id: str, message: str) -> None:
        self._patch_lecture(
            lecture_id, {"status": "failed", "error_message": message[:500]}
        )

    def save_notes(self, lecture_id: str, notes: dict[str, Any]) -> None:
        """
        Writes the one notes row for this lecture.

        Upserts on `lecture_id` (unique in the schema) so re-processing a lecture
        replaces its notes instead of failing on the constraint.
        """
        payload = {"lecture_id": lecture_id, **notes}
        response = self._session.post(
            f"{self._settings.supabase_url}/rest/v1/lecture_notes",
            params={"on_conflict": "lecture_id"},
            json=payload,
            headers={
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates,return=minimal",
            },
            timeout=TIMEOUT_SECONDS,
        )
        if not response.ok:
            raise SupabaseError(f"Saving lecture notes failed ({response.status_code}).")
