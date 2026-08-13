/*
  Revision snap cards — derived, never generated.

  These cards are built at render time from the notes the analysis already
  produced. There is no extra Ollama request and no new database column: the same
  `lecture_notes` that feed the reading view are regrouped into small, scannable
  study cards.

  Every bullet is a verbatim piece of the stored notes. Nothing is invented, so a
  card can only ever say what the lecture actually covered.
*/

import type { NotesView } from "@/lib/notes-view";

export type RevisionCard = { title: string; points: string[] };

const MAX_CARDS = 12;
const MAX_POINTS_PER_CARD = 5;
const MAX_GROUP_POINTS = 5;

/* Strips inline **bold** markers so a card bullet is plain, scannable text. */
function plain(value: string): string {
  return value.replace(/\*\*/g, "").trim();
}

/* Does a note line genuinely mention this concept? Only counts reasonably
   distinctive terms, so a two-letter word never pulls in unrelated lines. */
function mentions(term: string, line: string): boolean {
  const needle = term.toLowerCase();
  if (needle.length < 4) return false;
  return line.toLowerCase().includes(needle);
}

function shorten(list: string[], limit: number): string[] {
  return list.slice(0, limit).map(plain);
}

/*
  Concept cards come first: each definition becomes a card titled with its term,
  and any key point, important point, or example that literally names that term
  is grouped underneath it. Whatever is not pulled into a concept card is then
  offered as its own themed card, so nothing from the notes is lost.
*/
export function toRevisionCards(notes: NotesView): RevisionCard[] {
  const cards: RevisionCard[] = [];
  const used = new Set<string>();

  const pool = [...notes.keyPoints, ...notes.importantPoints, ...notes.examples];

  for (const definition of notes.definitions) {
    if (cards.length >= MAX_CARDS) break;

    const points = [plain(definition.meaning)];
    for (const line of pool) {
      if (points.length >= MAX_POINTS_PER_CARD) break;
      if (used.has(line)) continue;
      if (mentions(definition.term, line)) {
        points.push(plain(line));
        used.add(line);
      }
    }

    cards.push({ title: definition.term, points });
  }

  const remaining = (list: string[]) => list.filter((line) => !used.has(line));

  const groups: { title: string; source: string[] }[] = [
    { title: "Key points", source: remaining(notes.keyPoints) },
    { title: "Important to remember", source: remaining(notes.importantPoints) },
    { title: "Examples from class", source: remaining(notes.examples) },
  ];

  for (const group of groups) {
    if (cards.length >= MAX_CARDS) break;
    if (group.source.length === 0) continue;
    cards.push({ title: group.title, points: shorten(group.source, MAX_GROUP_POINTS) });
  }

  /* Fallbacks for a thin lecture that produced few structured fields, so the
     Revision tab is never empty when any notes exist at all. */
  if (cards.length === 0 && notes.revisionPoints.length > 0) {
    for (let i = 0; i < notes.revisionPoints.length && cards.length < MAX_CARDS; i += MAX_GROUP_POINTS) {
      cards.push({
        title: cards.length === 0 ? "Quick revision" : "More revision",
        points: shorten(notes.revisionPoints.slice(i, i + MAX_GROUP_POINTS), MAX_GROUP_POINTS),
      });
    }
  }

  if (cards.length === 0 && notes.quickSummary) {
    cards.push({ title: "In one line", points: [plain(notes.quickSummary)] });
  }

  return cards.slice(0, MAX_CARDS);
}
