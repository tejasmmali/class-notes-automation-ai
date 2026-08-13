"use client";

import { useState } from "react";
import type { NotesView } from "@/lib/notes-view";

/*
  Export PPT.

  On click it dynamically imports the pptx builder (which pulls in pptxgenjs only
  at that point) and generates a slide deck from the notes it was given. The notes
  are already on the client, so no request is made — not to the AI service, not
  even to this app's server. The deck is deterministic from the stored notes.
*/
export function ExportPptButton({
  meta,
  notes,
}: {
  meta: { title: string; subject: string; teacherName: string | null };
  notes: NotesView;
}) {
  const [state, setState] = useState<"idle" | "working" | "error">("idle");

  async function exportPptx() {
    if (state === "working") return;
    setState("working");
    try {
      const { downloadLecturePptx } = await import("@/lib/build-pptx");
      await downloadLecturePptx(meta, notes);
      setState("idle");
    } catch (cause) {
      console.error("PPTX export failed", cause);
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-3">
      {state === "error" ? (
        <span className="font-mono text-[11px] text-signal/90">
          Export failed — try again
        </span>
      ) : null}
      <button
        type="button"
        onClick={exportPptx}
        disabled={state === "working"}
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border border-rule bg-surface px-3.5 font-display text-sm font-semibold text-paper transition-colors hover:border-graphite/60 hover:bg-surface/70 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 1.5v8.5M4.5 6.5 8 10l3.5-3.5M2.5 13.5h11" />
        </svg>
        {state === "working" ? "Building…" : "Export PPT"}
      </button>
    </div>
  );
}
