import { RichText } from "@/components/rich-text";
import { SectionHeading, LectureSection } from "@/components/ui";

export type NoteSection = {
  /** Omitted when the notes are one continuous piece of writing. */
  heading?: string;
  body: string[];
  list?: string[];
};

/*
  Full class notes.

  Headed sections are numbered because the order IS the lecture's own running
  order. A single unheaded section — what the generated full summary produces —
  drops the numbering, since numbering one item says nothing.
*/
export function FullNotes({ sections }: { sections: NoteSection[] }) {
  return (
    <LectureSection anchor="full-notes" labelledBy="full-notes-h">
      <SectionHeading
        id="full-notes-h"
        legend="Full class notes"
        title="The lecture, written out"
      />

      <div className="space-y-9">
        {sections.map((section, i) => (
          <article key={section.heading ?? i}>
            {section.heading ? (
              <h3 className="mb-3 flex gap-3 text-base font-semibold text-paper sm:text-lg">
                <span
                  aria-hidden="true"
                  className="mt-1 font-mono text-xs text-signal tabular-nums"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {section.heading}
              </h3>
            ) : null}

            <div className="space-y-4 border-l border-rule pl-4 sm:pl-6">
              {section.body.map((para, j) => (
                <p key={j} className="prose-notes max-w-prose">
                  <RichText text={para} />
                </p>
              ))}

              {section.list ? (
                <ul className="space-y-2.5 pt-1">
                  {section.list.map((item, j) => (
                    <li
                      key={j}
                      className="prose-notes flex max-w-prose gap-3 text-base"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-signal"
                      />
                      <span>
                        <RichText text={item} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </LectureSection>
  );
}
