import type { Definition } from "@/lib/notes-view";
import { SectionHeading, LectureSection } from "@/components/ui";

export type Concept = { term: string; note: string };

/*
  A plain two-column term list. Deliberately not cards: eight small boxes would
  add seven borders and no meaning.
*/
export function KeyConcepts({ items }: { items: Concept[] }) {
  return (
    <LectureSection anchor="key-concepts" labelledBy="key-concepts-h">
      <SectionHeading
        id="key-concepts-h"
        legend="Key concepts"
        title="Terms this lecture turns on"
      />
      <dl className="grid grid-cols-1 gap-x-10 border-t border-rule sm:grid-cols-2">
        {items.map((concept) => (
          <div
            key={concept.term}
            className="flex flex-col gap-0.5 border-b border-rule py-3"
          >
            <dt className="text-sm font-semibold text-paper">{concept.term}</dt>
            <dd className="text-sm leading-relaxed text-graphite">
              {concept.note}
            </dd>
          </div>
        ))}
      </dl>
    </LectureSection>
  );
}

export function Definitions({ items }: { items: Definition[] }) {
  return (
    <LectureSection anchor="definitions" labelledBy="definitions-h">
      <SectionHeading
        id="definitions-h"
        legend="Definitions"
        title="Say it precisely"
      />
      <dl className="space-y-5">
        {items.map((definition) => (
          <div
            key={definition.term}
            className="border-l-2 border-signal/40 pl-4"
          >
            <dt className="mb-1 font-mono text-sm font-semibold tracking-wide text-signal">
              {definition.term}
            </dt>
            <dd className="prose-notes max-w-prose text-base">
              {definition.meaning}
            </dd>
          </div>
        ))}
      </dl>
    </LectureSection>
  );
}

/*
  One shape for every "list of sentences" section — key points, examples, and
  important points all arrive from the analysis as plain strings, and reading
  them should feel the same.
*/
export function PointList({
  anchor,
  legend,
  title,
  note,
  points,
}: {
  anchor: string;
  legend: string;
  title: string;
  note?: string;
  points: string[];
}) {
  return (
    <LectureSection anchor={anchor} labelledBy={`${anchor}-h`}>
      <SectionHeading id={`${anchor}-h`} legend={legend} title={title} note={note} />
      <ul className="space-y-3">
        {points.map((point, i) => (
          <li
            key={i}
            className="flex gap-3.5 rounded-md border border-rule bg-slate px-4 py-3.5"
          >
            <span
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-signal"
            />
            <p className="prose-notes max-w-prose text-base">{point}</p>
          </li>
        ))}
      </ul>
    </LectureSection>
  );
}
