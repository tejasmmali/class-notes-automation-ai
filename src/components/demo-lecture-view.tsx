import { AudioUnavailable } from "@/components/audio-player";
import { ExamQuestions, RevisionNotes } from "@/components/exam-revision";
import { ExportPptButton } from "@/components/export-ppt-button";
import { Flashcards } from "@/components/flashcards";
import { FullNotes } from "@/components/full-notes";
import { LectureChat } from "@/components/lecture-chat";
import { LectureHeader } from "@/components/lecture-header";
import { LectureTranscript } from "@/components/lecture-transcript";
import {
  Definitions,
  KeyConcepts,
  PointList,
} from "@/components/lecture-sections";
import { QuickSummary } from "@/components/quick-summary";
import { RevisionCards } from "@/components/revision-cards";
import { SectionNav } from "@/components/section-nav";
import {
  definitions,
  examQuestions,
  examples,
  fullNotes,
  importantPoints,
  keyConcepts,
  lecture,
  quickSummary,
  revisionPoints,
  signalChain,
  suggestedPrompts,
  transcript,
} from "@/lib/demo-lecture";
import type { NotesView } from "@/lib/notes-view";
import { toFlashcards } from "@/lib/flashcards";
import { toRevisionCards } from "@/lib/revision-cards";

/*
  Design preview for the lecture result page, served at /lecture/demo.

  Every word of it is hand-written sample content, not AI output, and it is
  labelled as such on the page. It exists so the reading experience can be
  reviewed with fuller material than a short test lecture produces — a real
  lecture renders the same components from its own stored notes.
*/

/* The demo content in the same NotesView shape the real pipeline produces, so
   the derived Revision cards and the PPT export run over it unchanged. */
const demoNotesView: NotesView = {
  quickSummary,
  paragraphs: fullNotes.flatMap((section) => section.body),
  keyPoints: keyConcepts.map((concept) => `${concept.term}: ${concept.note}`),
  definitions,
  examples,
  importantPoints,
  examQuestions,
  revisionPoints,
  hasContent: true,
};

const demoCards = toRevisionCards(demoNotesView);
const demoFlashcards = toFlashcards(demoNotesView);

const sections = [
  { href: "#quick-understanding", label: "Quick" },
  { href: "#full-notes", label: "Notes" },
  { href: "#key-concepts", label: "Concepts" },
  { href: "#definitions", label: "Definitions" },
  { href: "#examples", label: "Examples" },
  { href: "#important-points", label: "Important" },
  { href: "#exam-questions", label: "Questions" },
  { href: "#revision-cards", label: "Revision" },
  { href: "#flashcards", label: "Flashcards" },
  { href: "#revision", label: "Cheat sheet" },
  { href: "#transcript", label: "Transcript" },
  { href: "#ask", label: "Ask" },
];

export function DemoLectureView() {
  return (
    <>
      <LectureHeader
        subject={lecture.subject}
        title={lecture.title}
        meta={[
          { label: "Teacher", value: lecture.teacher },
          { label: "Recorded", value: lecture.date },
          { label: "Duration", value: lecture.duration },
        ]}
      >
        <AudioUnavailable message="This is a sample lecture, so there is no recording attached. Create a lecture to record or upload real audio." />
      </LectureHeader>

      <SectionNav sections={sections} />

      <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="legend">Sample lecture · demo content, not AI output</p>
          <ExportPptButton
            meta={{
              title: lecture.title,
              subject: lecture.subject,
              teacherName: lecture.teacher,
            }}
            notes={demoNotesView}
          />
        </div>

        <div className="space-y-14 sm:space-y-20">
          <QuickSummary
            summary={quickSummary}
            chain={signalChain}
            footnote="Energy flows one way: the world is measured, never the reverse."
          />
          <FullNotes sections={fullNotes} />
          <KeyConcepts items={keyConcepts} />
          <Definitions items={definitions} />
          <PointList
            anchor="examples"
            legend="Examples"
            title="Examples used in class"
            points={examples}
          />
          <PointList
            anchor="important-points"
            legend="Important points"
            title="What to carry out of this lecture"
            points={importantPoints}
          />
          <ExamQuestions questions={examQuestions} />
          <RevisionCards cards={demoCards} />
          <Flashcards cards={demoFlashcards} />
          <RevisionNotes points={revisionPoints} />
          <LectureTranscript transcript={transcript} />
          <LectureChat prompts={suggestedPrompts} />
        </div>
      </div>
    </>
  );
}
