"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, LectureSection, SectionHeading } from "@/components/ui";
import type { Flashcard } from "@/lib/flashcards";

/*
  Flash question cards — a local study session over cards derived from this
  lecture's notes (see lib/flashcards.ts). Everything here is client-side React
  state: revealing, shuffling, and marking a card "got it" never touches the
  server, so working through the deck costs no AI request and stores nothing.

  Reduced-motion is handled globally in globals.css (all transitions collapse to
  ~0ms), so the flip degrades to an instant swap for those who ask for it.
*/

type Mark = "known" | "review";

function shuffled(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function Flashcards({ cards }: { cards: Flashcard[] }) {
  /* Identity order on first render so server and client markup match; shuffling
     only happens later inside event handlers. */
  const [order, setOrder] = useState<number[]>(() =>
    Array.from({ length: cards.length }, (_, i) => i),
  );
  const [pos, setPos] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [marks, setMarks] = useState<Record<number, Mark>>({});
  const [done, setDone] = useState(false);

  const total = cards.length;
  const card = total > 0 ? cards[order[pos]] : null;
  const knownCount = useMemo(
    () => Object.values(marks).filter((m) => m === "known").length,
    [marks],
  );
  const reviewCount = useMemo(
    () => Object.values(marks).filter((m) => m === "review").length,
    [marks],
  );

  const goto = useCallback((next: number) => {
    setPos(next);
    setRevealed(false);
  }, []);

  const prev = useCallback(() => {
    if (done || pos === 0) return;
    goto(pos - 1);
  }, [done, pos, goto]);

  const next = useCallback(() => {
    if (done) return;
    if (pos >= total - 1) {
      setDone(true);
      setRevealed(false);
      return;
    }
    goto(pos + 1);
  }, [done, pos, total, goto]);

  const toggleReveal = useCallback(() => {
    if (done) return;
    setRevealed((r) => !r);
  }, [done]);

  const mark = useCallback(
    (value: Mark) => {
      if (!card) return;
      setMarks((prevMarks) => ({ ...prevMarks, [order[pos]]: value }));
      next();
    },
    [card, order, pos, next],
  );

  const restart = useCallback(
    (reshuffle: boolean) => {
      setOrder(reshuffle ? shuffled(total) : Array.from({ length: total }, (_, i) => i));
      setMarks({});
      setPos(0);
      setRevealed(false);
      setDone(false);
    },
    [total],
  );

  const shuffleNow = useCallback(() => {
    setOrder(shuffled(total));
    setPos(0);
    setRevealed(false);
    setDone(false);
  }, [total]);

  /* Keyboard support is scoped to the widget (the container is focusable), so it
     never hijacks the page's Space/scroll or the Ask-this-lecture textarea. */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      next();
    } else if (e.key === " " || e.key === "Spacebar") {
      /* Let a focused button handle its own Space; only the card reveal uses it
         otherwise. */
      if ((e.target as HTMLElement).closest("button")) return;
      e.preventDefault();
      toggleReveal();
    }
  };

  if (total === 0) {
    return (
      <LectureSection anchor="flashcards" labelledBy="flashcards-h">
        <SectionHeading
          id="flashcards-h"
          legend="Flashcards"
          title="Test yourself on this lecture"
        />
        <div className="flex flex-col items-center rounded-card border border-dashed border-rule bg-slate px-6 py-14 text-center">
          <div
            aria-hidden="true"
            className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-rule text-graphite"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-paper">
            Not enough lecture material yet
          </h3>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-graphite">
            Complete the lecture processing first to generate study cards.
          </p>
        </div>
      </LectureSection>
    );
  }

  const humanPos = pos + 1;
  const remaining = total - knownCount;

  return (
    <LectureSection anchor="flashcards" labelledBy="flashcards-h">
      <SectionHeading
        id="flashcards-h"
        legend="Flashcards"
        title="Test yourself on this lecture"
        note="Question first — think it through, then reveal the answer. Built from this lecture's notes, so nothing here is new content."
      />

      <div
        role="group"
        aria-label="Flashcards study session"
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="mx-auto max-w-2xl rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-signal/60"
      >
        {done ? (
          <CompletionPanel
            total={total}
            knownCount={knownCount}
            reviewCount={reviewCount}
            onAgain={() => restart(false)}
            onShuffle={() => restart(true)}
          />
        ) : (
          <>
            <ProgressRow
              humanPos={humanPos}
              total={total}
              remaining={remaining}
            />

            <CardFace
              card={card!}
              revealed={revealed}
              onReveal={toggleReveal}
              onMark={mark}
            />

            <Controls
              revealed={revealed}
              atStart={pos === 0}
              onPrev={prev}
              onNext={next}
              onReveal={toggleReveal}
              onShuffle={shuffleNow}
            />

            <p className="mt-4 text-center font-mono text-[11px] tracking-wide text-graphite/70">
              Space reveals · ← previous · → next
            </p>
          </>
        )}
      </div>
    </LectureSection>
  );
}

function ProgressRow({
  humanPos,
  total,
  remaining,
}: {
  humanPos: number;
  total: number;
  remaining: number;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="legend">
          Card {humanPos} of {total}
        </span>
        <span className="font-mono text-[11px] tracking-wider text-graphite">
          {pad(humanPos)} / {pad(total)}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={humanPos}
        aria-label="Deck progress"
        className="h-1 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-signal transition-[width] duration-300"
          style={{ width: `${(humanPos / total) * 100}%` }}
        />
      </div>
      <p className="mt-1.5 text-right font-mono text-[11px] text-graphite/70">
        {remaining} remaining
      </p>
    </div>
  );
}

function Controls({
  revealed,
  atStart,
  onPrev,
  onNext,
  onReveal,
  onShuffle,
}: {
  revealed: boolean;
  atStart: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReveal: () => void;
  onShuffle: () => void;
}) {
  return (
    <div className="mt-5 flex items-center justify-between gap-2 sm:gap-3">
      <Button variant="secondary" onClick={onPrev} disabled={atStart} aria-label="Previous card">
        <span aria-hidden="true">←</span> Prev
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="ghost" onClick={onReveal}>
          {revealed ? "Hide" : "Reveal"}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onShuffle}
          aria-label="Shuffle the deck"
          title="Shuffle"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
          </svg>
        </Button>
      </div>
      <Button variant="primary" onClick={onNext} aria-label="Next card">
        Next <span aria-hidden="true">→</span>
      </Button>
    </div>
  );
}

function CardFace({
  card,
  revealed,
  onReveal,
  onMark,
}: {
  card: Flashcard;
  revealed: boolean;
  onReveal: () => void;
  onMark: (mark: Mark) => void;
}) {
  return (
    <div className="[perspective:1600px]">
      <div
        className="grid min-h-[18rem] transition-transform duration-500 [transform-style:preserve-3d] sm:min-h-[20rem]"
        style={{ transform: revealed ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front — the question */}
        <button
          type="button"
          onClick={onReveal}
          disabled={revealed}
          aria-hidden={revealed}
          className="group flex h-full w-full flex-col rounded-2xl border border-rule bg-slate px-6 py-6 text-left transition-colors [grid-area:1/1] [backface-visibility:hidden] hover:border-graphite/50 sm:px-8 sm:py-8"
        >
          <span className="legend">{card.category}</span>
          <span className="flex flex-1 items-center py-4">
            <span className="font-display text-2xl leading-snug font-semibold text-paper text-balance sm:text-[1.75rem]">
              {card.question}
            </span>
          </span>
          <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wider text-signal uppercase">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11V6a3 3 0 0 1 6 0v5M7 11h10a1 1 0 0 1 1 1v6a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3v-6a1 1 0 0 1 1-1Z" />
            </svg>
            Tap to reveal answer
          </span>
        </button>

        {/* Back — the answer */}
        <div
          aria-hidden={!revealed}
          className="flex h-full w-full flex-col rounded-2xl border border-signal/30 bg-slate px-6 py-6 [grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)] sm:px-8 sm:py-8"
        >
          <span className="legend text-signal/90">Answer</span>
          <div className="flex-1 overflow-y-auto py-4">
            {card.answer.length === 1 ? (
              <p className="prose-notes text-[1.0625rem]">{card.answer[0]}</p>
            ) : (
              <ul className="space-y-2.5">
                {card.answer.map((point, i) => (
                  <li key={i} className="flex gap-2.5 prose-notes text-base">
                    <span aria-hidden="true" className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-signal" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-rule pt-4">
            <Button variant="primary" onClick={() => onMark("known")} disabled={!revealed} tabIndex={revealed ? 0 : -1}>
              <span aria-hidden="true">✓</span> Got it
            </Button>
            <Button variant="secondary" onClick={() => onMark("review")} disabled={!revealed} tabIndex={revealed ? 0 : -1}>
              <span aria-hidden="true">↻</span> Review again
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompletionPanel({
  total,
  knownCount,
  reviewCount,
  onAgain,
  onShuffle,
}: {
  total: number;
  knownCount: number;
  reviewCount: number;
  onAgain: () => void;
  onShuffle: () => void;
}) {
  return (
    <div className="rounded-2xl border border-rule bg-slate px-6 py-12 text-center sm:px-8">
      <div aria-hidden="true" className="text-3xl">
        🎉
      </div>
      <h3 className="mt-3 text-xl font-semibold text-paper">Session complete</h3>
      <p className="mt-2 text-graphite">
        You reviewed {total} {total === 1 ? "card" : "cards"}.
      </p>
      {knownCount > 0 || reviewCount > 0 ? (
        <p className="mt-1 font-mono text-[11px] tracking-wide text-graphite/70">
          {knownCount} known · {reviewCount} to review
        </p>
      ) : null}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Button variant="primary" onClick={onAgain}>
          Study again
        </Button>
        <Button variant="secondary" onClick={onShuffle}>
          Shuffle &amp; restart
        </Button>
      </div>
    </div>
  );
}
