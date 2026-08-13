"""
Lecture analysis with a local Ollama model.

One request per lecture, containing the whole transcript, producing every
educational output at once (CLAUDE.md §6). Ollama's structured-output `format`
field is given a JSON schema so the response is parsed rather than scraped, and
the result is still normalised defensively before it reaches the database.
"""

from __future__ import annotations

import json
import logging
from typing import Any

import requests

from config import Settings

logger = logging.getLogger(__name__)


class AnalysisError(RuntimeError):
    """The lecture could not be analysed."""


IMPORTANCE_LEVELS = ("important", "very important", "high priority")

# Mirrors the lecture_notes columns. Sent to Ollama as the enforced output shape.
NOTES_SCHEMA: dict[str, Any] = {
    "type": "object",
    "properties": {
        "quick_summary": {"type": "string"},
        "full_summary": {"type": "string"},
        "key_points": {"type": "array", "items": {"type": "string"}},
        "definitions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "term": {"type": "string"},
                    "definition": {"type": "string"},
                },
                "required": ["term", "definition"],
            },
        },
        "examples": {"type": "array", "items": {"type": "string"}},
        "important_points": {"type": "array", "items": {"type": "string"}},
        "exam_questions": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "importance": {"type": "string", "enum": list(IMPORTANCE_LEVELS)},
                },
                "required": ["question", "importance"],
            },
        },
        "revision_notes": {"type": "string"},
    },
    "required": [
        "quick_summary",
        "full_summary",
        "key_points",
        "definitions",
        "examples",
        "important_points",
        "exam_questions",
        "revision_notes",
    ],
}

SYSTEM_PROMPT = """\
You turn a classroom lecture transcript into study material for the students who \
attended it.

The transcript is your only source. Follow these rules exactly:

- Use only what the transcript actually contains.
- Never invent definitions, examples, formulas, numbers, or statements the \
teacher did not make.
- Silently correct obvious speech-recognition errors when the surrounding \
context makes the intended word clear, and keep technical terminology intact.
- If the lecture does not cover something, leave that array empty rather than \
filling it.
- Write for a student revising the lecture: plain, direct, and specific to this \
material.
- Write notes, not a copy of the transcript. Leave out greetings, admin talk, \
and asides, and turn spoken sentences into clear written ones.
- Exam questions are questions worth being able to answer, not predictions. \
Never claim a question will appear in an exam.

Respond with JSON only."""


def _user_prompt(
    subject: str, title: str, transcript: str, truncated: bool
) -> str:
    parts = [
        f"Subject: {subject or 'Not given'}",
        f"Lecture title: {title or 'Not given'}",
        "",
        "Produce, from the transcript below:",
        "- quick_summary: one or two sentences a student can read in five seconds.",
        "- full_summary: the lecture written out as flowing paragraphs, in the "
        "order it was taught. Separate paragraphs with a blank line.",
        "- key_points: the main things taught, one short sentence each. Cover "
        "every distinct idea in the lecture, not just the first one.",
        "- definitions: terms the lecture defines, with the meaning given in the "
        "lecture. Include every term it explains.",
        "- examples: examples the teacher actually used.",
        "- important_points: what a student must carry out of this lecture.",
        "- exam_questions: questions worth being able to answer, each with an "
        f"importance of {', '.join(IMPORTANCE_LEVELS)}.",
        "- revision_notes: a compressed list for last-minute revision, one point "
        "per line.",
        "",
    ]
    if truncated:
        parts.append(
            "Note: the transcript below was cut short at the length limit, so it "
            "may end mid-sentence. Work only with what is present.",
        )
        parts.append("")
    parts.append("Transcript:")
    parts.append(transcript)
    return "\n".join(parts)


def _as_text(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _as_text_list(value: Any) -> list[str]:
    """Keeps non-empty strings; tolerates the model wrapping items in objects."""
    if not isinstance(value, list):
        return []

    items: list[str] = []
    for entry in value:
        if isinstance(entry, str):
            text = entry.strip()
        elif isinstance(entry, dict):
            text = ""
            for key in ("text", "point", "example", "detail", "description", "title"):
                text = _as_text(entry.get(key))
                if text:
                    break
        else:
            text = ""
        if text:
            items.append(text)
    return items


def _as_definitions(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []

    definitions: list[dict[str, str]] = []
    for entry in value:
        if not isinstance(entry, dict):
            continue
        term = _as_text(entry.get("term")) or _as_text(entry.get("name"))
        meaning = (
            _as_text(entry.get("definition"))
            or _as_text(entry.get("meaning"))
            or _as_text(entry.get("description"))
        )
        if term and meaning:
            definitions.append({"term": term, "definition": meaning})
    return definitions


def _as_exam_questions(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        return []

    questions: list[dict[str, str]] = []
    for entry in value:
        if isinstance(entry, str):
            question, importance = entry.strip(), "important"
        elif isinstance(entry, dict):
            question = _as_text(entry.get("question")) or _as_text(entry.get("text"))
            importance = _as_text(entry.get("importance")).lower()
        else:
            continue

        if not question:
            continue
        if importance not in IMPORTANCE_LEVELS:
            importance = "important"
        questions.append({"question": question, "importance": importance})
    return questions


def _normalise(raw: dict[str, Any]) -> dict[str, Any]:
    notes = {
        "quick_summary": _as_text(raw.get("quick_summary")),
        "full_summary": _as_text(raw.get("full_summary")),
        "key_points": _as_text_list(raw.get("key_points")),
        "definitions": _as_definitions(raw.get("definitions")),
        "examples": _as_text_list(raw.get("examples")),
        "important_points": _as_text_list(raw.get("important_points")),
        "exam_questions": _as_exam_questions(raw.get("exam_questions")),
        "revision_notes": _as_text(raw.get("revision_notes")),
    }

    # A response with no summary at all is not usable material; failing here is
    # what stops an empty set of notes being presented as a finished lecture.
    if not notes["quick_summary"] and not notes["full_summary"]:
        raise AnalysisError(
            "The local model did not return usable notes for this lecture."
        )

    return notes


def analyse_transcript(
    settings: Settings, subject: str, title: str, transcript: str
) -> dict[str, Any]:
    """Sends the whole transcript to Ollama once and returns validated notes."""
    text = transcript.strip()
    truncated = len(text) > settings.max_transcript_chars
    if truncated:
        logger.warning(
            "Transcript is %d characters; truncating to %d for analysis",
            len(text),
            settings.max_transcript_chars,
        )
        text = text[: settings.max_transcript_chars]

    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _user_prompt(subject, title, text, truncated),
            },
        ],
        "stream": False,
        "format": NOTES_SCHEMA,
        "options": {"temperature": 0.2, "num_ctx": settings.ollama_num_ctx},
    }

    try:
        response = requests.post(
            f"{settings.ollama_url}/api/chat",
            json=payload,
            timeout=settings.ollama_timeout_seconds,
        )
    except requests.RequestException as cause:
        raise AnalysisError(
            f"Could not reach Ollama at {settings.ollama_url}. Is it running?"
        ) from cause

    if not response.ok:
        detail = response.text[:200].replace("\n", " ")
        raise AnalysisError(
            f"Ollama rejected the analysis request ({response.status_code}): {detail}"
        )

    try:
        content = response.json()["message"]["content"]
    except (ValueError, KeyError, TypeError) as cause:
        raise AnalysisError("Ollama returned an unreadable response.") from cause

    try:
        raw = json.loads(content)
    except ValueError as cause:
        raise AnalysisError(
            "The local model did not return valid JSON for this lecture."
        ) from cause

    if not isinstance(raw, dict):
        raise AnalysisError("The local model returned JSON of the wrong shape.")

    return _normalise(raw)
