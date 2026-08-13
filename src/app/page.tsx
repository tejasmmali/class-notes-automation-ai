import { ButtonLink } from "@/components/ui";

const steps = [
  {
    label: "Record or upload",
    detail:
      "Start recording in the browser, or drop in an audio file you already have.",
  },
  {
    label: "AI listens",
    detail:
      "The lecture is transcribed, then read for meaning — not just words.",
  },
  {
    label: "Notes arrive",
    detail:
      "Structured notes, concepts, questions, and revision, ready to study.",
  },
];

const deliverables = [
  ["Quick Understanding", "The idea in one paragraph."],
  ["Full Class Notes", "The lecture, written out in order."],
  ["Key Concepts", "The terms it turns on."],
  ["Definitions", "Precise wording worth memorising."],
  ["Examples", "The cases the teacher actually used."],
  ["Important Points", "What to carry out of the room."],
  ["Potential Exam Questions", "Practice, ranked by weight."],
  ["Quick Revision", "The whole thing, compressed."],
];

export default function Home() {
  return (
    <>
      {/* Hero — restrained height so the product itself appears above the fold. */}
      <section className="border-b border-rule">
        <div className="mx-auto w-full max-w-6xl px-4 pt-16 pb-14 sm:px-6 sm:pt-20">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
            <div className="animate-rise">
              <p className="legend mb-4">AI classroom assistant</p>
              <h1 className="max-w-xl text-4xl leading-[1.08] font-semibold tracking-tight text-paper sm:text-5xl lg:text-[3.4rem]">
                Turn every lecture into knowledge.
              </h1>
              <p className="mt-5 max-w-md font-body text-lg leading-relaxed text-graphite">
                Record a lecture. Let AI understand it. Get clear notes, quick
                revision, and useful questions.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/lecture/new">Create a Lecture</ButtonLink>
                <ButtonLink href="#how-it-works" variant="secondary">
                  See How It Works
                </ButtonLink>
              </div>
            </div>

            <LecturePreview />
          </div>
        </div>
      </section>

      {/* How it works — a real sequence, so the ordering carries meaning. */}
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="scroll-mt-20 border-b border-rule"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="legend mb-2.5">How it works</p>
          <h2
            id="how-heading"
            className="mb-9 text-2xl font-semibold tracking-tight text-paper"
          >
            Three steps, one recording
          </h2>

          <ol className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10">
            {steps.map((step, i) => (
              <li key={step.label}>
                <div className="tick-rule mb-4" aria-hidden="true" />
                <div className="mb-2 flex items-center gap-2.5">
                  <span className="font-mono text-xs text-signal tabular-nums">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[15px] font-semibold text-paper">
                    {step.label}
                  </h3>
                </div>
                <p className="max-w-xs text-sm leading-relaxed text-graphite">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* What students receive */}
      <section
        aria-labelledby="receive-heading"
        className="border-b border-rule"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <p className="legend mb-2.5">What students receive</p>
          <h2
            id="receive-heading"
            className="mb-9 max-w-xl text-2xl font-semibold tracking-tight text-paper"
          >
            Every lecture returns the same eight things
          </h2>

          <dl className="grid grid-cols-1 gap-x-12 border-t border-rule sm:grid-cols-2">
            {deliverables.map(([term, note]) => (
              <div
                key={term}
                className="flex items-baseline justify-between gap-6 border-b border-rule py-3.5"
              >
                <dt className="text-sm font-medium text-paper">{term}</dt>
                <dd className="text-right text-xs text-graphite">{note}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="rounded-card border border-rule bg-slate px-6 py-12 text-center sm:px-10">
          <h2 className="mx-auto max-w-lg text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
            Your next lecture could study itself.
          </h2>
          <p className="mx-auto mt-3 max-w-md font-body text-base text-graphite">
            Start with one recording and see what comes back.
          </p>
          <div className="mt-7 flex justify-center">
            <ButtonLink href="/lecture/new">Create a Lecture</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

/*
  Product preview — a still of the result screen rather than a screenshot, so it
  stays truthful about the layout students actually get.
*/
function LecturePreview() {
  const bars = [30, 52, 38, 68, 44, 76, 56, 40, 70, 48, 82, 60, 36, 64, 46, 74];

  return (
    <div
      aria-hidden="true"
      className="animate-rise rounded-card border border-rule bg-slate p-4 shadow-2xl shadow-black/40 sm:p-5"
      style={{ animationDelay: "120ms" }}
    >
      <div className="mb-4 flex items-center justify-between">
        <span className="legend">Automation &amp; Robotics</span>
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-signal uppercase">
          <span className="animate-blip h-1.5 w-1.5 rounded-full bg-signal" />
          Complete
        </span>
      </div>

      <h3 className="mb-4 text-2xl font-semibold tracking-tight text-paper">
        Sensors
      </h3>

      <div className="mb-4 flex items-center gap-2.5 rounded-md border border-rule bg-surface px-3 py-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-signal text-ink">
          <svg viewBox="0 0 24 24" className="h-3 w-3">
            <path d="M8 5v14l11-7z" fill="currentColor" />
          </svg>
        </span>
        <span className="flex h-6 flex-1 items-end gap-[2px]">
          {bars.map((h, i) => (
            <span
              key={i}
              style={{ height: `${h}%` }}
              className="w-full rounded-full bg-graphite/30"
            />
          ))}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-graphite">
          48:12
        </span>
      </div>

      <div className="mb-4 rounded-md border border-signal/25 bg-signal/[0.05] p-3.5">
        <p className="legend mb-1.5 text-signal/80">Quick understanding</p>
        <p className="font-body text-[13px] leading-relaxed text-paper/90">
          A sensor detects a physical quantity and converts it into a usable
          signal.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md border border-rule bg-rule">
        {["World", "Sensor", "Signal", "Controller"].map((label) => (
          <span
            key={label}
            className="bg-surface px-1.5 py-2 text-center font-mono text-[9px] tracking-wide text-graphite uppercase"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-4 space-y-2">
        {[
          ["Full class notes", "5 sections"],
          ["Key concepts", "8 terms"],
          ["Exam questions", "6 ranked"],
        ].map(([label, meta]) => (
          <div
            key={label}
            className="flex items-center justify-between border-b border-rule pb-2 last:border-0"
          >
            <span className="text-[13px] text-paper/85">{label}</span>
            <span className="font-mono text-[10px] text-graphite">{meta}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
