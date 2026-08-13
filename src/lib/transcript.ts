/*
  Transcript formatting — presentation only.

  Whisper stores the transcript as one long string of sentences joined by
  spaces, with no paragraph breaks. This groups that verbatim text into readable
  paragraphs so a long lecture is not a single wall of text.

  It never rewrites, summarises, or drops a word: the only thing inserted is a
  paragraph boundary. No AI is involved.
*/

/* Sentences per paragraph. Small enough to give the eye a rest, large enough
   that paragraphs are not one sentence each. */
const SENTENCES_PER_PARAGRAPH = 4;

/* Splits after ., ?, ! (optionally followed by quotes/brackets) when the next
   character starts a new sentence. Keeps the punctuation with its sentence. */
const SENTENCE_BOUNDARY = /(?<=[.!?]["')\]]?)\s+(?=[A-Z0-9"'(\[])/;

export function transcriptParagraphs(transcript: string): string[] {
  const text = transcript.trim();
  if (!text) return [];

  /* If the transcript already carries its own line breaks, respect them —
     that structure is more meaningful than any regrouping we could do. */
  const explicit = text
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (explicit.length > 1) return explicit;

  const flat = text.replace(/\s+/g, " ");
  const sentences = flat.split(SENTENCE_BOUNDARY).map((s) => s.trim()).filter(Boolean);
  if (sentences.length <= 1) return [flat];

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += SENTENCES_PER_PARAGRAPH) {
    paragraphs.push(sentences.slice(i, i + SENTENCES_PER_PARAGRAPH).join(" "));
  }
  return paragraphs;
}

/* Rough word count for the transcript header. */
export function transcriptWordCount(transcript: string): number {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  return words.length;
}
