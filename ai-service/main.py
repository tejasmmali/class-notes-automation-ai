"""
Class AI local AI service.

FastAPI over two local models: faster-whisper for speech-to-text and an Ollama
model for lecture analysis and Q&A. The Next.js app calls this service, and the
service reads the lecture and its audio straight from Supabase with the
service-role key, then writes the transcript, the notes, and the status back.

One lecture at a time. Both models share a single GPU, so jobs run on one worker
thread and anything else waits in a queue instead of competing for VRAM.

Run it from this directory:

    uvicorn main:app --host 127.0.0.1 --port 8001

Bind to localhost: this process holds the Supabase service-role key and must not
be reachable from outside the machine.
"""

from __future__ import annotations

import logging
import queue
import secrets
import threading
from contextlib import asynccontextmanager
from typing import Any

import requests
from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from analyze import AnalysisError, analyse_transcript
from ask import MAX_QUESTION_CHARS, AskError, answer_question
from config import Settings, load_settings
from supabase_io import SupabaseClient, SupabaseError, is_lecture_id
from transcribe import (
    TranscriptionError,
    load_model,
    model_state,
    transcribe_audio,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger("class-ai")

# Loaded at import so a missing service-role key stops the service at startup
# with a readable message, rather than failing on the first lecture.
SETTINGS: Settings = load_settings()

# Sentinel job: loads the Whisper model on the worker thread at startup, so the
# first real lecture does not pay for the load (or discover a broken GPU).
WARMUP = "__warmup__"


class JobRunner:
    """Processes lectures one at a time on a single background thread."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._client = SupabaseClient(settings)
        self._queue: queue.Queue[str] = queue.Queue()
        self._lock = threading.Lock()
        self._waiting: list[str] = []
        self._current: str | None = None
        self._thread = threading.Thread(
            target=self._loop, name="lecture-worker", daemon=True
        )

    @property
    def client(self) -> SupabaseClient:
        return self._client

    def start(self) -> None:
        self._thread.start()

    def warm_up(self) -> None:
        self._queue.put(WARMUP)

    def submit(self, lecture_id: str) -> str:
        """
        Queues a lecture. Returns started / queued / already_running /
        already_queued so the caller can say what actually happened.
        """
        with self._lock:
            if lecture_id == self._current:
                return "already_running"
            if lecture_id in self._waiting:
                return "already_queued"
            idle = self._current is None and not self._waiting
            self._waiting.append(lecture_id)

        self._queue.put(lecture_id)
        return "started" if idle else "queued"

    def state(self) -> dict[str, Any]:
        with self._lock:
            return {"running": self._current, "queued": len(self._waiting)}

    # ------------------------------------------------------------- worker

    def _loop(self) -> None:
        while True:
            lecture_id = self._queue.get()

            if lecture_id == WARMUP:
                try:
                    load_model(self._settings)
                except TranscriptionError as cause:
                    # Not fatal: /health reports the error and each lecture
                    # retries the load, so fixing the GPU needs no restart.
                    logger.error("Whisper warm-up failed: %s", cause)
                continue

            with self._lock:
                if lecture_id in self._waiting:
                    self._waiting.remove(lecture_id)
                self._current = lecture_id
            try:
                self._process(lecture_id)
            finally:
                with self._lock:
                    self._current = None

    def _process(self, lecture_id: str) -> None:
        """Runs the whole pipeline for one lecture, recording each stage."""
        try:
            lecture = self._client.get_lecture(lecture_id)
        except SupabaseError as cause:
            logger.error("Could not read lecture %s: %s", lecture_id, cause)
            return

        if lecture is None:
            logger.warning("Lecture %s no longer exists; skipping", lecture_id)
            return

        logger.info("Processing lecture %s (%s)", lecture_id, lecture.title)
        try:
            if not lecture.audio_path:
                raise SupabaseError("This lecture has no stored audio.")

            self._client.set_status(lecture_id, "transcribing")
            audio = self._client.download_audio(lecture)
            extension = lecture.audio_path.rpartition(".")[2]
            transcript = transcribe_audio(self._settings, audio, extension)
            self._client.set_transcript(lecture_id, transcript)

            self._client.set_status(lecture_id, "analyzing")
            notes = analyse_transcript(
                self._settings, lecture.subject, lecture.title, transcript
            )

            self._client.set_status(lecture_id, "generating")
            self._client.save_notes(lecture_id, notes)
            self._client.set_status(lecture_id, "completed")
            logger.info("Lecture %s completed", lecture_id)
        except (TranscriptionError, AnalysisError, SupabaseError) as failure:
            # These messages are written for the student reading the page.
            self._fail(lecture_id, str(failure))
        except Exception:  # noqa: BLE001 - never leave a lecture mid-pipeline
            logger.exception("Unexpected failure processing lecture %s", lecture_id)
            self._fail(
                lecture_id, "Something went wrong while processing this lecture."
            )

    def _fail(self, lecture_id: str, message: str) -> None:
        logger.error("Lecture %s failed: %s", lecture_id, message)
        try:
            self._client.set_failed(lecture_id, message)
        except SupabaseError:
            logger.exception("Could not record the failure for lecture %s", lecture_id)

RUNNER = JobRunner(SETTINGS)


@asynccontextmanager
async def lifespan(_: FastAPI):
    RUNNER.start()
    RUNNER.warm_up()
    logger.info(
        "Class AI service ready — whisper=%s on %s, ollama=%s",
        SETTINGS.whisper_model,
        SETTINGS.whisper_device,
        SETTINGS.ollama_model,
    )
    yield


app = FastAPI(title="Class AI local AI service", lifespan=lifespan)


def require_token(x_class_ai_token: str | None = Header(default=None)) -> None:
    """
    Optional shared secret, on top of binding to localhost.

    Compared in constant time. When AI_SERVICE_TOKEN is unset the check is off,
    which keeps a single-machine setup to zero configuration.
    """
    expected = SETTINGS.service_token
    if not expected:
        return
    if not x_class_ai_token or not secrets.compare_digest(x_class_ai_token, expected):
        raise HTTPException(status_code=401, detail="Invalid service token.")


def _require_lecture_id(lecture_id: str) -> None:
    if not is_lecture_id(lecture_id):
        raise HTTPException(status_code=400, detail="That lecture id is not valid.")


def _ollama_status() -> dict[str, Any]:
    """Whether Ollama is up and has the configured model pulled."""
    try:
        response = requests.get(f"{SETTINGS.ollama_url}/api/tags", timeout=3)
        response.raise_for_status()
        names = {
            str(entry.get("name", ""))
            for entry in response.json().get("models", [])
            if isinstance(entry, dict)
        }
    except (requests.RequestException, ValueError, AttributeError):
        return {"model": SETTINGS.ollama_model, "reachable": False, "model_pulled": False}

    return {
        "model": SETTINGS.ollama_model,
        "reachable": True,
        "model_pulled": SETTINGS.ollama_model in names,
    }

@app.get("/health")
def health() -> dict[str, Any]:
    """Reports what the service can currently do. No secrets, no lecture data."""
    state, detail = model_state()
    whisper: dict[str, Any] = {
        "model": SETTINGS.whisper_model,
        "device": SETTINGS.whisper_device,
        "state": state,
    }
    if detail:
        whisper["detail"] = detail

    return {
        "ok": True,
        "whisper": whisper,
        "ollama": _ollama_status(),
        "job": RUNNER.state(),
    }


@app.post("/lectures/{lecture_id}/process")
def process_lecture(
    lecture_id: str, _: None = Depends(require_token)
) -> dict[str, Any]:
    """
    Queues a lecture for transcription and analysis, and returns immediately.

    Nothing but the lecture id is taken from the caller: the audio path, subject,
    and title are read from the database here.
    """
    _require_lecture_id(lecture_id)

    try:
        lecture = RUNNER.client.get_lecture(lecture_id)
    except SupabaseError as cause:
        raise HTTPException(status_code=502, detail=str(cause)) from cause

    if lecture is None:
        raise HTTPException(status_code=404, detail="That lecture does not exist.")
    if not lecture.audio_path:
        raise HTTPException(
            status_code=409,
            detail="This lecture has no audio, so there is nothing to process.",
        )

    state = RUNNER.submit(lecture_id)
    logger.info("Process request for lecture %s: %s", lecture_id, state)
    return {"state": state, "job": RUNNER.state()}


class AskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=MAX_QUESTION_CHARS)


@app.post("/lectures/{lecture_id}/ask")
def ask_lecture(
    lecture_id: str, body: AskRequest, _: None = Depends(require_token)
) -> dict[str, str]:
    """Answers a question from this lecture's transcript and notes only."""
    _require_lecture_id(lecture_id)

    question = body.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="Please type a question first.")

    try:
        lecture = RUNNER.client.get_lecture(lecture_id)
        if lecture is None:
            raise HTTPException(status_code=404, detail="That lecture does not exist.")

        transcript = RUNNER.client.get_transcript(lecture_id) or ""
        if not transcript.strip():
            raise HTTPException(
                status_code=409,
                detail="This lecture has not been transcribed yet, so there is nothing to ask about.",
            )
        notes = RUNNER.client.get_notes(lecture_id)
    except SupabaseError as cause:
        raise HTTPException(status_code=502, detail=str(cause)) from cause

    try:
        answer = answer_question(
            SETTINGS,
            subject=lecture.subject,
            title=lecture.title,
            transcript=transcript,
            notes=notes,
            question=question,
        )
    except AskError as cause:
        raise HTTPException(status_code=502, detail=str(cause)) from cause

    return {"answer": answer}
