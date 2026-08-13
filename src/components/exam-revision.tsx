import type { ExamQuestion, Importance } from "@/lib/notes-view";
import { SectionHeading, LectureSection } from "@/components/ui";

/* Stored lowercase (and enforced as an enum in the analysis schema), shown in
   the reader's capitalisation. */
const importanceLabels: Record<Importance, string> = {
  important: "Important",
  "high priority": "High Priority",
  "very important": "Very Important",
};

const importanceStyles: Record<Importance, string> = {
  important: "border-graphite/40 text-graphite",
  "high priority": "border-signal/45 text-signal/90",
  "very important": "border-signal bg-signal/12 text-signal",
};

export function ExamQuestions({ questions }: { questions: ExamQuestion[] }) {
  return (
    <LectureSection anchor="exam-questions" labelledBy="exam-questions-h">
      <SectionHeading
        id="exam-questions-h"
        legend="Potential exam questions"
        title="Worth being able to answer"
        note="Generated from what this lecture covered. These are practice questions for revision — not a prediction of the paper."
      />
      <ol className="space-y-2.5">
        {questions.map((question, i) => (
          <li
            key={i}
            className="flex flex-col gap-2.5 rounded-md border border-rule bg-slate px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
          >
            <p className="prose-notes max-w-prose text-base">{question.question}</p>
            <span
              className={`inline-flex shrink-0 items-center self-start rounded border px-2 py-0.5 font-mono text-[10px] tracking-widest whitespace-nowrap uppercase ${
                importanceStyles[question.importance]
              }`}
            >
              {importanceLabels[question.importance]}
            </span>
          </li>
        ))}
      </ol>
    </LectureSection>
  );
}

/*
  Quick revision. Tight, scannable, no prose — this is the screen a student
  reads on a phone ten minutes before the exam, so it stays dense on purpose.
*/
export function RevisionNotes({ points }: { points: string[] }) {
  return (
    <LectureSection anchor="revision" labelledBy="revision-h">
      <SectionHeading
        id="revision-h"
        legend="Quick revision"
        title="The whole lecture, compressed"
      />
      <div className="rounded-card border border-rule bg-slate">
        <ul className="divide-y divide-rule">
          {points.map((point, i) => (
            <li
              key={i}
              className="flex items-baseline gap-3 px-4 py-2.5 font-mono text-[13px] leading-relaxed text-paper/90"
            >
              <span
                aria-hidden="true"
                className="text-[10px] text-graphite/60 tabular-nums"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              {point}
            </li>
          ))}
        </ul>
      </div>
    </LectureSection>
  );
}
