"use client";

import { useState } from "react";
import { SectionHeading, PreviewNote } from "@/components/ui";

const DEFAULT_PROMPTS = [
  "Explain this lecture simply",
  "What are the key points?",
  "Give me an example from the lecture",
  "Which parts should I revise first?",
];

/*
  Ask This Lecture.

  One question, one answer, no history: the answer comes from this lecture's
  transcript and notes on the server, so there is nothing to carry between
  questions and nothing invented locally.

  Without a lectureId this renders as the design preview — send stays disabled
  and nothing is answered, rather than showing a made-up reply.
*/
export function LectureChat({
  lectureId,
  prompts = DEFAULT_PROMPTS,
}: {
  lectureId?: string;
  prompts?: string[];
}) {
  const preview = !lectureId;

  const [value, setValue] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function ask(event: React.FormEvent) {
    event.preventDefault();

    const question = value.trim();
    if (!lectureId || !question || pending) return;

    setPending(true);
    setError(null);
    setAnswer(null);
    setAsked(question);

    try {
      const response = await fetch(`/api/lectures/${lectureId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        answer?: string;
        error?: string;
      };

      if (!response.ok || !body.answer) {
        setError(body.error ?? "That question could not be answered right now.");
        return;
      }
      setAnswer(body.answer);
      setValue("");
    } catch {
      setError("The connection dropped before an answer came back. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section id="ask" aria-labelledby="ask-h">
      <SectionHeading
        id="ask-h"
        legend="Ask this lecture"
        title="Still unclear on something?"
        note="Answers come from this lecture's transcript and notes, so you can trust what they are based on."
      />

      <div className="rounded-card border border-rule bg-slate p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setValue(prompt)}
              disabled={pending}
              className="rounded-md border border-rule bg-surface px-3 py-1.5 text-xs text-graphite transition-colors hover:border-graphite/50 hover:text-paper disabled:opacity-50"
            >
              {prompt}
            </button>
          ))}
        </div>

        <form onSubmit={ask} className="flex flex-col gap-2.5 sm:flex-row">
          <label htmlFor="ask-input" className="sr-only">
            Ask a question about this lecture
          </label>
          <input
            id="ask-input"
            type="text"
            value={value}
            maxLength={500}
            disabled={pending}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask anything about this lecture..."
            className="h-11 flex-1 rounded-md border border-rule bg-ink px-3.5 text-sm text-paper placeholder:text-graphite/60 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={preview || pending || !value.trim()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-signal px-5 font-display text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-45"
          >
            {pending ? "Reading the lecture…" : "Ask"}
          </button>
        </form>

        <div aria-live="polite" className="mt-4 empty:mt-0">
          {pending ? (
            <p className="font-mono text-[11px] tracking-wider text-graphite uppercase">
              Answering from the transcript — this runs on your machine and can
              take a moment.
            </p>
          ) : null}

          {error ? (
            <p className="rounded-md border border-rule bg-surface px-4 py-3 text-sm leading-relaxed text-paper">
              {error}
            </p>
          ) : null}

          {answer ? (
            <div className="rounded-md border border-rule bg-surface px-4 py-3.5">
              <p className="legend mb-2">{asked}</p>
              <p className="prose-notes max-w-prose text-base whitespace-pre-line">
                {answer}
              </p>
            </div>
          ) : null}
        </div>

        {preview ? (
          <div className="mt-4">
            <PreviewNote>
              This is a sample lecture, so there is no transcript to ask about.
              Create a real lecture to use Ask This Lecture.
            </PreviewNote>
          </div>
        ) : null}
      </div>
    </section>
  );
}
