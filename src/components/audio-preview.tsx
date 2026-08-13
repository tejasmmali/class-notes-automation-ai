"use client";

import { useEffect, useMemo, useState } from "react";
import { formatBytes, formatDuration, type CapturedAudio } from "@/lib/audio";

/*
  Playback for audio held in the browser, before anything is uploaded.

  Native <audio controls> on purpose: a hand-built transport would add seek,
  buffering, and keyboard handling for no gain here, and the browser's own
  controls already follow the dark colour-scheme.

  MediaRecorder blobs often report an Infinite duration until the file is
  seeked, so `knownSeconds` (the recorder's own measured elapsed time) is used
  when the element cannot supply a real number. Nothing is guessed — if neither
  is available the readout stays blank.
*/
export function AudioPreview({
  audio,
  knownSeconds,
}: {
  audio: CapturedAudio;
  knownSeconds?: number | null;
}) {
  /* One object URL per blob, revoked as soon as it is replaced or unmounted. */
  const url = useMemo(() => URL.createObjectURL(audio.blob), [audio.blob]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);

  /* Stored with the URL it was measured from, so a new recording never shows
     the previous one's length while its metadata is still loading. */
  const [measured, setMeasured] = useState<{
    url: string;
    seconds: number;
  } | null>(null);
  const duration = measured?.url === url ? measured.seconds : null;

  const seconds =
    duration ??
    (typeof knownSeconds === "number" && Number.isFinite(knownSeconds)
      ? knownSeconds
      : null);

  return (
    <div className="rounded-md border border-rule bg-ink p-3.5">
      <div className="mb-3 flex items-center justify-between gap-4">
        <span className="legend truncate" title={audio.fileName}>
          {audio.source === "recording" ? "Your recording" : audio.fileName}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-graphite tabular-nums">
          {seconds !== null ? `${formatDuration(seconds)} · ` : ""}
          {formatBytes(audio.sizeBytes)}
        </span>
      </div>

      {url ? (
        <audio
          controls
          preload="metadata"
          src={url}
          className="w-full"
          onLoadedMetadata={(event) => {
            const value = event.currentTarget.duration;
            setMeasured(
              Number.isFinite(value) && value > 0 ? { url, seconds: value } : null,
            );
          }}
        >
          Your browser cannot play this audio file.
        </audio>
      ) : null}
    </div>
  );
}
