"""
Speech-to-text with faster-whisper on the local GPU.

The model is loaded once and kept, because loading costs seconds and every
lecture uses the same model. Device and compute type default to the verified
CUDA/float16 setup; if the GPU is unavailable the error is surfaced rather than
silently falling back to CPU, which would look like a hang.
"""

from __future__ import annotations

import logging
import os
import tempfile
from pathlib import Path

from config import Settings

logger = logging.getLogger(__name__)

_model = None
_model_key: tuple[str, str, str] | None = None

# Reported by /health so the app can tell "still loading" from "broken".
_state = "unloaded"
_state_detail = ""


class TranscriptionError(RuntimeError):
    """Transcription could not be completed."""


def model_state() -> tuple[str, str]:
    """One of unloaded / loading / ready / error, with a detail for error."""
    return _state, _state_detail


def _register_cuda_libraries() -> None:
    """
    Makes the pip-installed CUDA DLLs findable on Windows.

    `nvidia-cublas-cu12` and `nvidia-cudnn-cu12` ship their DLLs inside the
    `nvidia` package rather than on PATH, and CTranslate2 loads them by bare
    name at first use. On Linux the wheels' RPATHs handle it. On Windows nothing
    does, so the directories go on PATH (which is what a plain LoadLibrary call
    searches) and through `add_dll_directory` as well, for anything loaded with
    the newer search flags. Without this, the model loads and then transcription
    fails with "Library cublas64_12.dll is not found".
    """
    if os.name != "nt":
        return

    try:
        import nvidia
    except ImportError:
        return

    directories: list[str] = []
    for root in getattr(nvidia, "__path__", []):
        for bin_dir in sorted(Path(root).glob("*/bin")):
            if any(bin_dir.glob("*.dll")):
                directories.append(str(bin_dir))

    for directory in directories:
        try:
            os.add_dll_directory(directory)
        except OSError:
            logger.warning("Could not register CUDA directory %s", directory)

    if directories:
        existing = os.environ.get("PATH", "")
        missing = [d for d in directories if d not in existing]
        if missing:
            os.environ["PATH"] = os.pathsep.join([*missing, existing])
        logger.info("Registered %d CUDA library directories", len(directories))


def load_model(settings: Settings):
    """Returns the cached WhisperModel, loading it on first use."""
    global _model, _model_key, _state, _state_detail

    key = (
        settings.whisper_model,
        settings.whisper_device,
        settings.whisper_compute_type,
    )
    if _model is not None and _model_key == key:
        return _model

    _register_cuda_libraries()
    from faster_whisper import WhisperModel

    logger.info(
        "Loading Whisper model %s on %s (%s)",
        settings.whisper_model,
        settings.whisper_device,
        settings.whisper_compute_type,
    )
    _state, _state_detail = "loading", ""
    try:
        _model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute_type,
        )
    except Exception as cause:  # noqa: BLE001 - reported to the caller as-is
        _state = "error"
        _state_detail = f"{settings.whisper_model} on {settings.whisper_device}: {cause}"
        raise TranscriptionError(
            f"Could not load the Whisper model on {settings.whisper_device}: {cause}"
        ) from cause

    _model_key = key
    _state, _state_detail = "ready", ""
    return _model


def transcribe_audio(settings: Settings, audio: bytes, extension: str) -> str:
    """
    Writes the audio to a temp file and transcribes it.

    faster-whisper reads from a path, and the audio arrives here as bytes from
    Supabase Storage, so a temp file is the handoff. It is always removed.
    """
    model = load_model(settings)

    suffix = f".{extension.lstrip('.')}" if extension else ".audio"
    handle = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        handle.write(audio)
        handle.close()

        try:
            segments, info = model.transcribe(
                handle.name,
                beam_size=5,
                vad_filter=settings.whisper_vad,
            )
            # `segments` is a generator — the work happens while consuming it.
            text = " ".join(segment.text.strip() for segment in segments).strip()
        except Exception as cause:  # noqa: BLE001 - reported to the caller as-is
            raise TranscriptionError(f"Transcription failed: {cause}") from cause

        if not text:
            raise TranscriptionError(
                "No speech was detected in this recording, so there is nothing to analyse."
            )

        logger.info(
            "Transcribed %.1fs of audio (%s) into %d characters",
            getattr(info, "duration", 0.0) or 0.0,
            getattr(info, "language", "unknown"),
            len(text),
        )
        return text
    finally:
        try:
            os.unlink(handle.name)
        except OSError:
            logger.warning("Could not remove temp audio file %s", handle.name)
