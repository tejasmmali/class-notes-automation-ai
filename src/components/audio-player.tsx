/*
  Lecture audio playback.

  The bucket is private, so `src` is a short-lived signed URL minted server-side;
  the storage path is never exposed. Native controls are used deliberately —
  seeking, buffering, and keyboard support come for free and are more reliable
  than a hand-built transport, which matters more here than a custom look.
*/
export function AudioPlayer({
  src,
  legend = "Lecture audio",
  note,
}: {
  src: string;
  legend?: string;
  note?: string;
}) {
  return (
    <div className="rounded-card border border-rule bg-slate p-4">
      <p className="legend mb-3">{legend}</p>
      <audio controls preload="metadata" src={src} className="w-full">
        Your browser cannot play this audio file.
      </audio>
      {note ? (
        <p className="mt-3 font-mono text-[11px] text-graphite/70">{note}</p>
      ) : null}
    </div>
  );
}

/* Shown in place of the player when there is no audio to play. */
export function AudioUnavailable({ message }: { message: string }) {
  return (
    <div className="rounded-card border border-rule bg-slate p-4">
      <p className="legend mb-2">Lecture audio</p>
      <p className="text-sm leading-relaxed text-graphite">{message}</p>
    </div>
  );
}
