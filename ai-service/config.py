"""
Configuration for the local AI service.

Secrets are read from the environment. To avoid keeping a second copy of the
Supabase service-role key on disk, the process env is checked first, then
`ai-service/.env`, then the Next.js app's `../.env.local` — so the existing
project secrets work with no duplication.

The tiny parser below exists so this service does not need python-dotenv: the
verified environment gets no new dependencies beyond FastAPI/uvicorn.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

SERVICE_DIR = Path(__file__).resolve().parent
PROJECT_DIR = SERVICE_DIR.parent

AUDIO_BUCKET = "lectures"


class ConfigError(RuntimeError):
    """Raised when required configuration is missing."""


def _parse_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    try:
        raw = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return values

    for line in raw.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()

        key, separator, value = line.partition("=")
        if not separator:
            continue

        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        if key:
            values[key] = value

    return values


# `.env` is read first, so a value set there wins over `../.env.local`.
_FILE_ENV: dict[str, str] = {}
for _candidate in (SERVICE_DIR / ".env", PROJECT_DIR / ".env.local"):
    for _key, _value in _parse_env_file(_candidate).items():
        _FILE_ENV.setdefault(_key, _value)


def _read(*names: str, default: str = "") -> str:
    """First non-empty value across the real environment, then the env files."""
    for source in (os.environ, _FILE_ENV):
        for name in names:
            value = source.get(name)
            if value and value.strip():
                return value.strip()
    return default


def _read_int(name: str, default: int) -> int:
    raw = _read(name)
    if not raw:
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _read_bool(name: str, default: bool) -> bool:
    raw = _read(name).lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    supabase_url: str
    service_role_key: str
    service_token: str
    whisper_model: str
    whisper_device: str
    whisper_compute_type: str
    whisper_vad: bool
    ollama_url: str
    ollama_model: str
    ollama_num_ctx: int
    ollama_timeout_seconds: int
    max_transcript_chars: int


def load_settings() -> Settings:
    """
    Reads configuration and fails loudly if Supabase is not configured.

    `NEXT_PUBLIC_SUPABASE_URL` is accepted as an alias so the app's existing
    `.env.local` works unchanged. Only the URL is shared that way — the
    service-role key is server-only in both places.
    """
    supabase_url = _read("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL").rstrip("/")
    service_role_key = _read("SUPABASE_SERVICE_ROLE_KEY")

    missing = [
        name
        for name, value in (
            ("SUPABASE_URL", supabase_url),
            ("SUPABASE_SERVICE_ROLE_KEY", service_role_key),
        )
        if not value
    ]
    if missing:
        raise ConfigError(
            "Missing required environment variables: "
            + ", ".join(missing)
            + ". Set them in ai-service/.env or the app's .env.local."
        )

    return Settings(
        supabase_url=supabase_url,
        service_role_key=service_role_key,
        # Optional shared secret. The service binds to localhost, so this is a
        # second line rather than the only one; set it in both this service's
        # env and the app's to require it on every request.
        service_token=_read("AI_SERVICE_TOKEN"),
        whisper_model=_read("WHISPER_MODEL", default="small"),
        whisper_device=_read("WHISPER_DEVICE", default="cuda"),
        whisper_compute_type=_read("WHISPER_COMPUTE_TYPE", default="float16"),
        whisper_vad=_read_bool("WHISPER_VAD", True),
        ollama_url=_read("OLLAMA_URL", default="http://localhost:11434").rstrip("/"),
        ollama_model=_read("OLLAMA_MODEL", default="llama3.2:3b"),
        # 8192 keeps the KV cache comfortably inside 6 GB of VRAM while Whisper
        # is also resident. Raise it (and MAX_TRANSCRIPT_CHARS) on a bigger card.
        ollama_num_ctx=_read_int("OLLAMA_NUM_CTX", 8192),
        ollama_timeout_seconds=_read_int("OLLAMA_TIMEOUT_SECONDS", 900),
        # Roughly 6000 words. Analysis is one request by design (CLAUDE.md §6),
        # so the transcript has to fit the context window above.
        max_transcript_chars=_read_int("MAX_TRANSCRIPT_CHARS", 24000),
    )
