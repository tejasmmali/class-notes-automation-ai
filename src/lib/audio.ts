/*
  Audio rules shared by the browser and the server.

  Nothing secret lives here, so both sides can import it and agree on one set of
  limits. The server still re-validates everything it is told — the client's
  numbers are a courtesy, not a source of truth.
*/

/* Change the limit here. Raising it also needs the `lectures` bucket's
   file_size_limit raised (supabase/migrations/0001_lectures.sql) and the
   project-wide storage limit in the Supabase dashboard. */
export const AUDIO_MAX_BYTES = 50 * 1024 * 1024;
export const AUDIO_MAX_LABEL = "50 MB";

export const TITLE_MAX_LENGTH = 200;
export const SUBJECT_MAX_LENGTH = 120;
export const TEACHER_MAX_LENGTH = 120;

/*
  Canonical audio types → the extension used in the storage path.

  The extension always comes from this map, never from a client-supplied
  filename, so nothing user-controlled reaches the storage path. Keys must match
  the bucket's allowed_mime_types.
*/
const CANONICAL_AUDIO: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/aac": "aac",
  "audio/flac": "flac",
};

/* Browsers disagree about names for the same container. */
const MIME_ALIASES: Record<string, string> = {
  "audio/mp3": "audio/mpeg",
  "audio/mpeg3": "audio/mpeg",
  "audio/x-mpeg": "audio/mpeg",
  "audio/x-m4a": "audio/mp4",
  "audio/m4a": "audio/mp4",
  "audio/aacp": "audio/aac",
  "audio/x-aac": "audio/aac",
  "audio/wave": "audio/wav",
  "audio/x-wav": "audio/wav",
  "audio/vnd.wave": "audio/wav",
  "audio/x-flac": "audio/flac",
  "audio/vorbis": "audio/ogg",
  "audio/x-ogg": "audio/ogg",
  "application/ogg": "audio/ogg",
};

/* Last resort when a browser reports an empty or unknown type for a picked
   file, which happens when the OS has no mapping for the extension. */
const EXTENSION_MIMES: Record<string, string> = {
  webm: "audio/webm",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  wav: "audio/wav",
  aac: "audio/aac",
  flac: "audio/flac",
};

/* Human-readable list for the UI. */
export const SUPPORTED_AUDIO_LABELS = ["MP3", "WAV", "M4A", "WebM", "OGG"];

/* `accept` value for the file input. Extensions are included because some
   systems report no MIME type at all for audio files. */
export const AUDIO_ACCEPT = [
  ...Object.keys(CANONICAL_AUDIO),
  ...Object.keys(MIME_ALIASES).filter((m) => m.startsWith("audio/")),
  ...Object.keys(EXTENSION_MIMES).map((e) => `.${e}`),
].join(",");

/* Audio captured in the browser, either recorded or picked from disk. */
export type CapturedAudio = {
  blob: Blob;
  /** Canonical MIME type — what gets sent as the upload Content-Type. */
  mimeType: string;
  /** Display name only. Never used to build a storage path. */
  fileName: string;
  sizeBytes: number;
  source: "recording" | "upload";
};

export type AudioCheck =
  | { ok: true; contentType: string; extension: string }
  | { ok: false; message: string };

function normalise(mimeType: string): string {
  /* MediaRecorder reports things like `audio/webm;codecs=opus`. */
  const base = mimeType.split(";")[0].trim().toLowerCase();
  return MIME_ALIASES[base] ?? base;
}

function fromFileName(fileName: string): string | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_MIMES[ext] ?? null;
}

/*
  Validates a piece of audio before it is stored. Used by the browser to fail
  fast with a clear message, and again by the API route as the real gate.
*/
export function checkAudio({
  mimeType,
  fileName,
  sizeBytes,
}: {
  mimeType: string;
  fileName: string;
  sizeBytes: number;
}): AudioCheck {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return {
      ok: false,
      message:
        "That audio file is empty. Record again, or pick a different file.",
    };
  }

  if (sizeBytes > AUDIO_MAX_BYTES) {
    return {
      ok: false,
      message: `That file is ${formatBytes(sizeBytes)}. The limit is ${AUDIO_MAX_LABEL} — try a shorter recording or a compressed format such as MP3.`,
    };
  }

  const canonical = normalise(mimeType);
  const contentType = CANONICAL_AUDIO[canonical]
    ? canonical
    : (fromFileName(fileName) ?? "");

  if (!contentType || !CANONICAL_AUDIO[contentType]) {
    return {
      ok: false,
      message: `That file is not a supported audio format. Use ${SUPPORTED_AUDIO_LABELS.join(", ")}.`,
    };
  }

  return { ok: true, contentType, extension: CANONICAL_AUDIO[contentType] };
}

export function isAllowedExtension(extension: string): boolean {
  return Object.values(CANONICAL_AUDIO).includes(extension);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "--:--";
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
