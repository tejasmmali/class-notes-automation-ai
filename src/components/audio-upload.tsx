"use client";

import { useRef, useState } from "react";
import { AudioPreview } from "@/components/audio-preview";
import {
  AUDIO_ACCEPT,
  AUDIO_MAX_LABEL,
  SUPPORTED_AUDIO_LABELS,
  checkAudio,
  type CapturedAudio,
} from "@/lib/audio";

/*
  Picks an existing audio file. Format and size are checked here so the teacher
  finds out immediately rather than after a long upload — the API route checks
  the same rules again, since a client-side check is a courtesy, not a gate.
*/
export function AudioUpload({
  value,
  onChange,
  disabled = false,
}: {
  value: CapturedAudio | null;
  onChange: (audio: CapturedAudio | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = value?.source === "upload" ? value : null;

  function handleFile(file: File | undefined) {
    setError(null);
    if (!file) return;

    const check = checkAudio({
      mimeType: file.type,
      fileName: file.name,
      sizeBytes: file.size,
    });

    if (!check.ok) {
      setError(check.message);
      onChange(null);
      return;
    }

    onChange({
      /* Re-wrapped so the blob carries the canonical type rather than whatever
         the operating system reported. */
      blob: file.slice(0, file.size, check.contentType),
      mimeType: check.contentType,
      fileName: file.name,
      sizeBytes: file.size,
      source: "upload",
    });
  }

  return (
    <div className="rounded-card border border-dashed border-rule bg-slate/60 p-5 sm:p-6">
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="mb-1 text-[15px] font-semibold text-paper">
            Upload audio instead
          </h3>
          <p className="text-sm leading-relaxed text-graphite">
            Already have the recording? Add the file directly — up to{" "}
            {AUDIO_MAX_LABEL}.
          </p>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {SUPPORTED_AUDIO_LABELS.map((format) => (
              <li
                key={format}
                className="rounded border border-rule px-2 py-0.5 font-mono text-[10px] tracking-widest text-graphite uppercase"
              >
                {format}
              </li>
            ))}
          </ul>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={AUDIO_ACCEPT}
          className="sr-only"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            /* Reset so picking the same file twice still fires a change. */
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="inline-flex h-11 shrink-0 items-center gap-2.5 rounded-md border border-rule bg-surface px-5 font-display text-sm font-semibold text-paper transition-colors hover:border-graphite/60 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 16V4M7 9l5-5 5 5M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
          </svg>
          {selected ? "Choose another file" : "Choose file"}
        </button>
      </div>

      {selected ? (
        <div className="mt-4 space-y-3">
          <AudioPreview audio={selected} />
          <button
            type="button"
            onClick={() => onChange(null)}
            disabled={disabled}
            className="font-mono text-[11px] tracking-widest text-graphite uppercase transition-colors hover:text-paper disabled:opacity-45"
          >
            Remove file
          </button>
        </div>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-md border border-signal/30 bg-signal/[0.07] px-3 py-2 text-sm leading-relaxed text-signal"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
