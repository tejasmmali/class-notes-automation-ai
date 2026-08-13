import { LectureSection, SectionHeading } from "@/components/ui";
import type { RevisionCard } from "@/lib/revision-cards";

/*
  Revision snap cards.

  Small, self-contained study cards regrouped from this lecture's own notes —
  concept cards first, then whatever themed points are left over. They are built
  at render time from the stored notes, so showing them costs no AI request.
*/
export function RevisionCards({ cards }: { cards: RevisionCard[] }) {
  if (cards.length === 0) return null;

  return (
    <LectureSection anchor="revision-cards" labelledBy="revision-cards-h">
      <SectionHeading
        id="revision-cards-h"
        legend="Revision"
        title="Snap cards for quick study"
        note="Bite-sized cards built from this lecture's notes — no new content, just regrouped for revision."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.title}
            className="flex flex-col overflow-hidden rounded-card border border-rule bg-slate"
          >
            <div className="border-b border-rule bg-surface/60 px-4 py-2.5">
              <h3 className="font-mono text-[12px] font-semibold tracking-wider text-signal uppercase">
                {card.title}
              </h3>
            </div>
            <ul className="flex-1 space-y-2.5 px-4 py-3.5">
              {card.points.map((point, i) => (
                <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-paper/85">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-signal"
                  />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </LectureSection>
  );
}
