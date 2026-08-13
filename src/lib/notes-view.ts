/*
  Turns a stored lecture_notes row into the shapes the note components render.

  The structured columns are JSONB written by the AI service, so nothing in them
  is assumed: every field is checked and anything unusable is dropped rather than
  rendered. That is also what keeps an empty analysis from looking like finished
  notes — `hasContent` is false and the page says so.
*/

import type { LectureNotes } from "@/lib/lectures";

export const IMPORTANCE_LEVELS = [
  "important",
  "high priority",
  "very important",
] as const;

export type Importance = (typeof IMPORTANCE_LEVELS)[number];

export type Definition = { term: string; meaning: string };
export type ExamQuestion = { question: string; importance: Importance };

export type NotesView = {
  quickSummary: string | null;
  /** full_summary, split into paragraphs. */
  paragraphs: string[];
  keyPoints: string[];
  definitions: Definition[];
  examples: string[];
  importantPoints: string[];
  examQuestions: ExamQuestion[];
  /** revision_notes, one point per line. */
  revisionPoints: string[];
  hasContent: boolean;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function textList(values: unknown[]): string[] {
  return values.map(text).filter(Boolean);
}

function paragraphsOf(value: string | null): string[] {
  const body = text(value);
  if (!body) return [];
  /* Blank-line separated, which is what the analysis prompt asks for. A model
     that used single newlines still splits correctly on the fallback. */
  const blocks = body.split(/\n\s*\n/).map((block) => block.trim());
  const kept = blocks.filter(Boolean);
  return kept.length > 1 ? kept : lines(body);
}

/* Strips list markers a model may add, so bullets are not rendered twice. */
function lines(value: string | null): string[] {
  return text(value)
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-*•·]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);
}

function definitionsOf(values: unknown[]): Definition[] {
  const definitions: Definition[] = [];
  for (const entry of values) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const term = text(row.term) || text(row.name);
    const meaning = text(row.definition) || text(row.meaning);
    if (term && meaning) definitions.push({ term, meaning });
  }
  return definitions;
}

function importanceOf(value: unknown): Importance {
  const level = text(value).toLowerCase();
  return (IMPORTANCE_LEVELS as readonly string[]).includes(level)
    ? (level as Importance)
    : "important";
}

function examQuestionsOf(values: unknown[]): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  for (const entry of values) {
    if (typeof entry === "string") {
      const question = entry.trim();
      if (question) questions.push({ question, importance: "important" });
      continue;
    }
    if (!entry || typeof entry !== "object") continue;

    const row = entry as Record<string, unknown>;
    const question = text(row.question) || text(row.text);
    if (question) {
      questions.push({ question, importance: importanceOf(row.importance) });
    }
  }
  return questions;
}

export function toNotesView(notes: LectureNotes): NotesView {
  const view: Omit<NotesView, "hasContent"> = {
    quickSummary: text(notes.quickSummary) || null,
    paragraphs: paragraphsOf(notes.fullSummary),
    keyPoints: textList(notes.keyPoints),
    definitions: definitionsOf(notes.definitions),
    examples: textList(notes.examples),
    importantPoints: textList(notes.importantPoints),
    examQuestions: examQuestionsOf(notes.examQuestions),
    revisionPoints: lines(notes.revisionNotes),
  };

  const hasContent = Boolean(
    view.quickSummary ||
      view.paragraphs.length ||
      view.keyPoints.length ||
      view.definitions.length ||
      view.examples.length ||
      view.importantPoints.length ||
      view.examQuestions.length ||
      view.revisionPoints.length,
  );

  return { ...view, hasContent };
}
