import { LectureSection, SectionHeading } from "@/components/ui";
import { transcriptParagraphs, transcriptWordCount } from "@/lib/transcript";

/*
  Real Transcript.

  Shows the exact text Whisper produced for this lecture, straight from the
  database — not summarised, not regenerated, no AI request. The only processing
  is grouping the words into paragraphs so a long lecture reads comfortably.

  The body scrolls inside its own box so a 45-minute transcript does not push the
  rest of the page out of reach.
*/
export function LectureTranscript({ transcript }: { transcript: string }) {
  const paragraphs = transcriptParagraphs(transcript);
  if (paragraphs.length === 0) return null;

  const words = transcriptWordCount(transcript);

  return (
    <LectureSection anchor="transcript" labelledBy="transcript-h">
      <SectionHeading
        id="transcript-h"
        legend="Real transcript"
        title="Exactly what was said"
        note="The verbatim speech-to-text output for this recording. Nothing here is summarised or rewritten."
      />

      <div className="rounded-card border border-rule bg-slate">
        <div className="flex items-center justify-between border-b border-rule px-4 py-2.5 sm:px-5">
          <span className="legend">Transcript</span>
          <span className="font-mono text-[11px] text-graphite/70 tabular-nums">
            {words.toLocaleString("en-GB")} words
          </span>
        </div>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {paragraphs.map((paragraph, i) => (
            <p key={i} className="prose-notes max-w-prose text-base">
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </LectureSection>
  );
}
