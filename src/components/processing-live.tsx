"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { LectureStatus } from "@/lib/lectures";

const POLL_INTERVAL_MS = 3000;

const RUNNING: LectureStatus[] = ["transcribing", "analyzing", "generating"];

/*
  Starts processing and follows it.

  The lecture's stored status stays the single source of truth: this component
  only asks the server to begin, then polls the status endpoint and refreshes the
  page when the stored stage actually changes, so the stage list above is never
  ahead of the work. Nothing here invents progress.

  Processing continues on the server whether or not this page is open — the
  request only queues the job.
*/
export function ProcessingLive({
  lectureId,
  status,
}: {
  lectureId: string;
  status: LectureStatus;
}) {
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [queued, setQueued] = useState(false);
  /* Whether a start has been asked for in this page view — drives polling. */
  const [attempted, setAttempted] = useState(false);
  const requested = useRef(false);

  const running = RUNNING.includes(status);

  const start = useCallback(async () => {
    setStarting(true);
    setError(null);
    setQueued(false);
    setAttempted(true);

    try {
      const response = await fetch(`/api/lectures/${lectureId}/process`, {
        method: "POST",
      });
      const body = (await response.json().catch(() => ({}))) as {
        state?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(body.error ?? "Processing could not be started.");
        return;
      }
      /* The service runs one lecture at a time; anything else waits. */
      setQueued(body.state === "queued" || body.state === "already_queued");
      router.refresh();
    } catch {
      setError(
        "The processing service could not be reached. Check that it is running and try again.",
      );
    } finally {
      setStarting(false);
    }
  }, [lectureId, router]);

  /* Arriving here straight after upload: begin without making the teacher press
     a second button. Guarded so a re-render cannot start it twice. */
  useEffect(() => {
    if (status === "uploaded" && !requested.current) {
      requested.current = true;
      void start();
    }
  }, [status, start]);

  const watching = running || (attempted && status !== "completed");

  useEffect(() => {
    if (!watching) return;

    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/lectures/${lectureId}/status`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const body = (await response.json()) as { status?: LectureStatus };
        if (body.status && body.status !== status) router.refresh();
      } catch {
        /* A dropped poll is not worth reporting — the next one retries. */
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [lectureId, status, watching, router]);

  if (error) {
    return (
      <div className="rounded-card border border-rule bg-slate p-5">
        <p className="legend mb-2.5">Processing could not start</p>
        <p className="mb-4 max-w-prose text-sm leading-relaxed text-graphite">
          {error}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button onClick={() => void start()} disabled={starting}>
            {starting ? "Starting…" : "Try again"}
          </Button>
          <OpenLectureLink lectureId={lectureId} />
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button onClick={() => void start()} disabled={starting}>
          {starting ? "Starting…" : "Try processing again"}
        </Button>
        <OpenLectureLink lectureId={lectureId} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p
        aria-live="polite"
        className="font-mono text-[11px] tracking-widest text-graphite uppercase"
      >
        {starting
          ? "Starting…"
          : queued && !running
            ? "Waiting for the machine to finish another lecture"
            : running
              ? "Processing on this machine — you can close the tab"
              : "Handing the lecture to the AI service"}
      </p>
      <OpenLectureLink lectureId={lectureId} />
    </div>
  );
}

function OpenLectureLink({ lectureId }: { lectureId: string }) {
  return (
    <Link
      href={`/lecture/${lectureId}`}
      className="font-mono text-[11px] tracking-widest text-graphite uppercase transition-colors hover:text-paper"
    >
      Open lecture and play audio
    </Link>
  );
}
