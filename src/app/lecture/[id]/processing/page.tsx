import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ProcessingLive } from "@/components/processing-live";
import { ButtonLink } from "@/components/ui";
import { getLecture, type LectureStatus } from "@/lib/lectures";

export const metadata: Metadata = {
  title: "Processing your lecture · Class AI",
  description: "Upload and processing status for your lecture.",
};

/* Lecture status changes outside this render, so nothing here may be cached. */
export const dynamic = "force-dynamic";

/*
  Real pipeline state, read from lectures.status.

  The stage list mirrors the status column exactly, so a stage is only ever shown
  as done or running because the database says so. The client component at the
  bottom starts the work and refreshes this page when the stored stage changes —
  it never advances the list on its own (CLAUDE.md §25).
*/
const STAGES: { status: LectureStatus; label: string; detail: string }[] = [
  {
    status: "uploaded",
    label: "Audio uploaded",
    detail: "Your recording is stored privately.",
  },
  {
    status: "transcribing",
    label: "Transcribing lecture",
    detail: "Speech to text — the whole lecture, in order.",
  },
  {
    status: "analyzing",
    label: "Understanding lecture",
    detail: "Reading for meaning, not just words.",
  },
  {
    status: "generating",
    label: "Creating notes",
    detail: "Summary, concepts, definitions, and questions.",
  },
];

/*
  Splits the status into "stages finished" and "stage currently running".

  The two are not the same thing: `uploaded` names a stage that has *finished*
  (the upload), while `transcribing`, `analyzing`, and `generating` name a stage
  that is *running*. Collapsing them would mark a running stage as done.
*/
function stageState(status: LectureStatus): { done: number; active: number } {
  if (status === "completed") return { done: STAGES.length, active: -1 };
  if (status === "uploaded") return { done: 1, active: -1 };

  const index = STAGES.findIndex((stage) => stage.status === status);
  return index < 0 ? { done: 0, active: -1 } : { done: index, active: index };
}

export default async function ProcessingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getLecture(id);

  if (result.state === "missing") notFound();

  if (result.state !== "found") {
    return (
      <Shell legend="Lecture status" title="We could not load this lecture">
        <p className="max-w-md font-body text-base leading-relaxed text-graphite">
          {result.state === "unconfigured"
            ? "Class AI is not connected to its database, so lecture status cannot be read."
            : "The database could not be reached. Please try again in a moment."}
        </p>
      </Shell>
    );
  }

  const { lecture } = result;

  /* A row with no audio means the upload never finished. Saying anything else
     would claim a recording that is not there. */
  if (!lecture.audioPath) {
    return (
      <Shell
        legend={`${lecture.subject} — ${lecture.title}`}
        title="This lecture has no audio"
      >
        <p className="max-w-md font-body text-base leading-relaxed text-graphite">
          The upload did not finish, so there is nothing to process. Create the
          lecture again and submit the recording once more.
        </p>
        <div className="mt-7">
          <ButtonLink href="/lecture/new">Create a lecture</ButtonLink>
        </div>
      </Shell>
    );
  }

  if (lecture.status === "failed") {
    return (
      <Shell
        legend={`${lecture.subject} — ${lecture.title}`}
        title="Processing failed"
      >
        <p className="max-w-md font-body text-base leading-relaxed text-graphite">
          {lecture.errorMessage ??
            "Something went wrong while processing this lecture."}
        </p>
        <div className="mt-7">
          <ProcessingLive lectureId={lecture.id} status={lecture.status} />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <ButtonLink href={`/lecture/${lecture.id}`} variant="secondary">
            Open lecture
          </ButtonLink>
          <ButtonLink href="/lecture/new" variant="ghost">
            Create a lecture
          </ButtonLink>
        </div>
      </Shell>
    );
  }

  const { done, active: activeIndex } = stageState(lecture.status);
  const percent = Math.round((done / STAGES.length) * 100);
  const isComplete = lecture.status === "completed";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex items-center gap-4">
        <span className="legend truncate">
          {lecture.subject} — {lecture.title}
        </span>
        <span className="h-px flex-1 bg-rule" />
        <span className="font-mono text-[10px] tracking-widest text-graphite uppercase">
          {done}/{STAGES.length}
        </span>
      </div>

      <div className="mb-11">
        <h1 className="text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
          {isComplete
            ? "Your lecture is ready"
            : activeIndex >= 0
              ? "Processing your lecture"
              : "Lecture uploaded successfully"}
        </h1>
        <p className="mt-3 max-w-md font-body text-base leading-relaxed text-graphite">
          {isComplete
            ? "Notes, key concepts, and revision are ready to read."
            : activeIndex >= 0
              ? "You can close the tab — your lecture keeps processing."
              : "Your recording is stored privately. Transcription and analysis start automatically."}
        </p>
      </div>

      <ol className="mb-10 space-y-1.5" aria-label="Processing stages">
        {STAGES.map((stage, i) => {
          const isDone = i < done;
          const isActive = i === activeIndex;
          return (
            <li key={stage.status}>
              <div
                className={`flex items-start gap-4 rounded-md border px-4 py-3.5 ${
                  isDone
                    ? "border-rule bg-slate/70"
                    : isActive
                      ? "border-signal/35 bg-signal/[0.05]"
                      : "border-rule/70"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    isDone
                      ? "border-signal/50 bg-signal/15 text-signal"
                      : isActive
                        ? "border-signal text-signal"
                        : "border-rule text-graphite/45"
                  }`}
                >
                  {isDone ? (
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  )}
                </span>

                <div className="flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      isDone || isActive ? "text-paper" : "text-graphite/60"
                    }`}
                  >
                    {stage.label}
                  </p>
                  <p
                    className={`mt-0.5 text-xs leading-relaxed ${
                      isActive ? "text-graphite" : "text-graphite/55"
                    }`}
                  >
                    {stage.detail}
                  </p>
                </div>

                <span className="self-center font-mono text-[10px] tracking-widest uppercase">
                  {isDone ? (
                    <span className="text-signal/70">Done</span>
                  ) : isActive ? (
                    <span className="flex items-end gap-[2px]" aria-hidden="true">
                      {[0, 1, 2, 3, 4].map((bar) => (
                        <span
                          key={bar}
                          style={{ animationDelay: `${bar * 120}ms` }}
                          className="animate-bar h-3.5 w-[3px] origin-bottom rounded-full bg-signal"
                        />
                      ))}
                    </span>
                  ) : (
                    <span className="text-graphite/40">Waiting</span>
                  )}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <span className="legend">Overall progress</span>
          <span className="font-mono text-xs text-graphite tabular-nums">
            {percent}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Lecture processing progress"
          className="h-1.5 overflow-hidden rounded-full bg-rule"
        >
          <div
            className="h-full rounded-full bg-signal"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {isComplete ? (
        <ButtonLink href={`/lecture/${lecture.id}`}>Read the notes</ButtonLink>
      ) : (
        <ProcessingLive lectureId={lecture.id} status={lecture.status} />
      )}
    </div>
  );
}

function Shell({
  legend,
  title,
  children,
}: {
  legend: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-10 flex items-center gap-4">
        <span className="legend truncate">{legend}</span>
        <span className="h-px flex-1 bg-rule" />
      </div>
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
        {title}
      </h1>
      {children}
    </div>
  );
}
