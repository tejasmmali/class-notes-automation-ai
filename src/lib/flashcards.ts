/*
  Flash question cards — derived, never generated.

  Built at render time from the same lecture_notes that feed the reading view.
  There is no extra Whisper or Ollama request and no new database column: a
  definition becomes a "What is X?" card, an exam question is answered from the
  notes that define its terms, an important point becomes a fill-in-the-blank.
  Every answer is a verbatim piece of the stored notes, so a card can only ever
  ask about what the lecture actually covered. When a reliable answer cannot be
  found in the notes, the card is not created rather than invented.
*/

import type { NotesView } from "@/lib/notes-view";

export type Flashcard = {
  id: string;
  category: string;
  question: string;
  /** One or more concise bullets, each verbatim-derived from the notes. */
  answer: string[];
};

const MAX_CARDS = 20;
const MAX_ANSWER_BULLETS = 4;
/* Above this length a single meaning is split into sentence bullets so no card
   back becomes a wall of text. */
const LONG_ANSWER = 160;

/* Strips inline **bold** markers and collapses whitespace so a card reads as
   plain, scannable text. */
function plain(value: string): string {
  return value.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SENTENCE_BOUNDARY = /(?<=[.!?]["')\]]?)\s+(?=[A-Z0-9"'(\[])/;

/* Long meanings become a few sentence bullets; short ones stay a single bullet.
   Nothing is added or rewritten — the text is only split on sentence ends. */
function toBullets(value: string): string[] {
  const clean = plain(value);
  if (clean.length <= LONG_ANSWER) return [clean];
  const sentences = clean
    .split(SENTENCE_BOUNDARY)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences.slice(0, MAX_ANSWER_BULLETS) : [clean];
}

/* A distinctive term mention — mirrors revision-cards' rule so a short word
   never pulls in unrelated lines. */
function mentions(term: string, line: string): boolean {
  const needle = term.toLowerCase();
  if (needle.length < 4) return false;
  return line.toLowerCase().includes(needle);
}

/* Lower-cases a term for natural reading ("configuration space"), but leaves an
   acronym untouched ("ADC"). */
function displayTerm(term: string): string {
  const t = term.trim();
  return t === t.toUpperCase() ? t : t.charAt(0).toLowerCase() + t.slice(1);
}

function questionForTerm(term: string): string {
  return `What is ${displayTerm(term)}?`;
}

/* Key points are often written "Term: explanation" (or with a dash). When they
   are, they split into a question/answer the same way a definition does. */
function splitTermExplanation(
  line: string,
): { term: string; explanation: string } | null {
  const match = plain(line).match(/^(.{2,40}?)\s*[:—–-]\s+(.{4,})$/);
  if (!match) return null;
  const term = match[1].trim();
  const explanation = match[2].trim();
  /* A term is a short label, not a whole sentence. */
  if (term.split(/\s+/).length > 6 || /[.!?]$/.test(term)) return null;
  return { term, explanation };
}

/*
  Builds the deck in priority order — concepts and definitions first, then
  important points, examples, and exam questions. Terms collected from the
  definition and concept cards are reused to answer exam questions and to blank
  out cloze cards, which is what keeps every answer grounded in the notes.
*/
export function toFlashcards(notes: NotesView): Flashcard[] {
  const cards: Flashcard[] = [];
  const seen = new Set<string>();
  const conceptTerms: string[] = [];

  const add = (card: Flashcard) => {
    if (cards.length >= MAX_CARDS) return;
    const key = card.question.toLowerCase();
    if (card.answer.length === 0 || seen.has(key)) return;
    seen.add(key);
    cards.push(card);
  };

  /* 1. Definitions — the cleanest question/answer source. */
  notes.definitions.forEach((def, i) => {
    conceptTerms.push(def.term);
    add({
      id: `def-${i}`,
      category: "Definition",
      question: questionForTerm(def.term),
      answer: toBullets(def.meaning),
    });
  });

  /* 2. Key points written as "Term: explanation" become concept cards. */
  notes.keyPoints.forEach((point, i) => {
    const split = splitTermExplanation(point);
    if (!split) return;
    conceptTerms.push(split.term);
    add({
      id: `key-${i}`,
      category: "Concept",
      question: questionForTerm(split.term),
      answer: toBullets(split.explanation),
    });
  });

  /* 3. Important points that name a known concept become fill-in-the-blank
        recall cards: the concept is blanked out, the full statement revealed. */
  notes.importantPoints.forEach((point, i) => {
    const clean = plain(point);
    const term = conceptTerms.find((t) => mentions(t, clean));
    if (!term) return;
    const blanked = clean.replace(new RegExp(escapeRegExp(term), "i"), "______");
    if (blanked === clean) return;
    add({ id: `imp-${i}`, category: "Recall", question: blanked, answer: [clean] });
  });

  /* 4. Examples that illustrate a known concept. */
  notes.examples.forEach((example, i) => {
    const clean = plain(example);
    const term = conceptTerms.find((t) => mentions(t, clean));
    if (!term) return;
    add({
      id: `ex-${i}`,
      category: "Example",
      question: `Give an example of ${displayTerm(term)}.`,
      answer: [clean],
    });
  });

  /* 5. Exam questions — kept as questions, but only when the notes actually
        answer them (they name a defined term). Otherwise skipped, not guessed. */
  notes.examQuestions.forEach((q, i) => {
    const answer: string[] = [];
    for (const def of notes.definitions) {
      if (answer.length >= MAX_ANSWER_BULLETS) break;
      if (mentions(def.term, q.question)) {
        answer.push(`${def.term}: ${plain(def.meaning)}`);
      }
    }
    if (answer.length === 0) return;
    add({ id: `exam-${i}`, category: "Exam question", question: plain(q.question), answer });
  });

  /* 6. Fallback for a thin lecture: turn "A = B" revision points into cards so
        the deck stays usable when the structured fields were sparse. */
  if (cards.length < 4) {
    notes.revisionPoints.forEach((point, i) => {
      const split = plain(point).match(/^(.{2,40}?)\s*[=:]\s*(.{2,})$/);
      if (!split || split[1].trim().split(/\s+/).length > 6) return;
      add({
        id: `rev-${i}`,
        category: "Revision",
        question: questionForTerm(split[1].trim()),
        answer: toBullets(split[2].trim()),
      });
    });
  }

  return cards.slice(0, MAX_CARDS);
}
