"""
"Ask this lecture" — grounded Q&A over one lecture.

The transcript is the source, with the generated notes added as a condensed
second pass over the same material. The model is told to answer from that
context only and to say so when the lecture does not cover the question
(CLAUDE.md §9), so an answer here can be trusted to come from the class.

One Ollama request per question. No history is kept: each question carries its
own context, which keeps the prompt small and the behaviour predictable.
"""

from __future__ import annotations

import logging
from typing import Any

import requests

from config import Settings

logger = logging.getLogger(__name__)

MAX_QUESTION_CHARS = 500
NOT_FOUND_ANSWER = "I couldn't find that information in this lecture."

SYSTEM_PROMPT = f"""\
You answer a student's question about one specific lecture they attended.

The lecture material below is your only source. Follow these rules exactly:

- Answer only from the lecture material.
- If the material does not contain the answer, reply exactly: {NOT_FOUND_ANSWER}
- Never invent definitions, examples, formulas, numbers, or statements the \
teacher did not make.
- Do not add outside knowledge, even when you know it.
- Be direct and specific. A few sentences is usually enough.
- Write plainly for a student revising. No preamble about being an AI."""


class AskError(RuntimeError):
    """The question could not be answered."""


def _notes_context(notes: dict[str, Any] | None) -> str:
    """Flattens the stored notes into a short block of extra context."""
    if not notes:
        return ""

    lines: list[str] = []
    for label, key in (
        ("Summary", "quick_summary"),
        ("Lecture summary", "full_summary"),
        ("Revision notes", "revision_notes"),
    ):
        value = notes.get(key)
        if isinstance(value, str) and value.strip():
            lines.append(f"{label}: {value.strip()}")

    for label, key in (("Key points", "key_points"), ("Examples", "examples")):
        values = notes.get(key)
        if isinstance(values, list):
            items = [str(item).strip() for item in values if isinstance(item, str)]
            if items:
                lines.append(f"{label}:\n" + "\n".join(f"- {item}" for item in items))

    definitions = notes.get("definitions")
    if isinstance(definitions, list):
        pairs = [
            f"- {entry.get('term')}: {entry.get('definition')}"
            for entry in definitions
            if isinstance(entry, dict) and entry.get("term") and entry.get("definition")
        ]
        if pairs:
            lines.append("Definitions:\n" + "\n".join(pairs))

    return "\n\n".join(lines)


def answer_question(
    settings: Settings,
    *,
    subject: str,
    title: str,
    transcript: str,
    notes: dict[str, Any] | None,
    question: str,
) -> str:
    """Sends the lecture context and the question to Ollama once."""
    text = (transcript or "").strip()
    if not text:
        raise AskError(
            "This lecture has not been transcribed yet, so there is nothing to ask about."
        )
    if len(text) > settings.max_transcript_chars:
        # Keep the end of the transcript as well: a question about the last
        # thing taught would otherwise fall outside the window entirely.
        half = settings.max_transcript_chars // 2
        text = f"{text[:half]}\n\n[...]\n\n{text[-half:]}"

    parts = [
        f"Subject: {subject or 'Not given'}",
        f"Lecture title: {title or 'Not given'}",
        "",
    ]
    notes_context = _notes_context(notes)
    if notes_context:
        parts += ["Notes generated from this lecture:", notes_context, ""]
    parts += ["Lecture transcript:", text, "", f"Student's question: {question}"]

    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": "\n".join(parts)},
        ],
        "stream": False,
        "options": {
            "temperature": 0.2,
            "num_ctx": settings.ollama_num_ctx,
            "num_predict": 600,
        },
    }

    try:
        response = requests.post(
            f"{settings.ollama_url}/api/chat",
            json=payload,
            timeout=settings.ollama_timeout_seconds,
        )
    except requests.RequestException as cause:
        raise AskError(
            f"Could not reach Ollama at {settings.ollama_url}. Is it running?"
        ) from cause

    if not response.ok:
        detail = response.text[:200].replace("\n", " ")
        raise AskError(f"Ollama rejected the question ({response.status_code}): {detail}")

    try:
        answer = response.json()["message"]["content"]
    except (ValueError, KeyError, TypeError) as cause:
        raise AskError("Ollama returned an unreadable response.") from cause

    answer = (answer or "").strip()
    if not answer:
        raise AskError("The local model returned an empty answer.")

    logger.info("Answered a question in %d characters", len(answer))
    return answer
