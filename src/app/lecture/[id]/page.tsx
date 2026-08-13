import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AudioPlayer, AudioUnavailable } from "@/components/audio-player";
import { DemoLectureView } from "@/components/demo-lecture-view";
import { LectureHeader } from "@/components/lecture-header";
import { LectureNotesView } from "@/components/lecture-notes-view";
import { ButtonLink, SectionHeading } from "@/components/ui";
import {
  getAudioPlaybackUrl,
  getLecture,
  getLectureNotes,
  isLectureId,
  type Lecture,
} from "@/lib/lectures";
import { toNotesView } from "@/lib/notes-view";

/* Reserved id for the design preview at /lecture/demo. Real lectures are UUIDs,
   so this can never collide with one. */
const DEMO_ID = "demo";

/* Lecture rows and signed audio URLs are both request-time data. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  /* Deliberately does not query the database — the page itself already reads the
     lecture, and a second read for a page title is not worth it. */
  return id === DEMO_ID
    ? {
        title: "Sample lecture · Class AI",
        description: "A design preview of the Class AI lecture notes interface.",
      }
    : {
        title: "Lecture · Class AI",
        description: "Lecture notes, key concepts, and revision from Class AI.",
      };
}

const STATUS_LABEL: Record<Lecture["status"], string> = {
  uploaded: "Uploaded",
  transcribing: "Transcribing",
  analyzing: "Analysing",
  generating: "Generating notes",
  completed: "Completed",
  failed: "Failed",
};

/* The outputs the analysis step will produce, per CLAUDE.md §30. Listed so a
   student can see what is coming — not presented as existing content. */
const PLANNED_SECTIONS = [
  "Quick Understanding",
  "Full Class Notes",
  "Key Concepts",
  "Definitions",
  "Examples",
  "Important Points",
  "Potential Exam Questions",
  "Quick Revision",
];

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export default async function LecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (id === DEMO_ID) return <DemoLectureView />;
  if (!isLectureId(id)) notFound();

  const result = await getLecture(id);
  if (result.state === "missing") notFound();

  if (result.state !== "found") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <p className="legend mb-3">Lecture</p>
        <h1 className="mb-4 text-3xl font-semibold tracking-tight text-paper">
          We could not load this lecture
        </h1>
        <p className="max-w-md font-body text-base leading-relaxed text-graphite">
          {result.state === "unconfigured"
            ? "Class AI is not connected to its database yet, so lectures cannot be read."
            : "The database could not be reached. Please try again in a moment."}
        </p>
      </div>
    );
  }

  const { lecture } = result;
  const stored = await getLectureNotes(lecture.id);
  const notes = stored ? toNotesView(stored) : null;
  const audioUrl = lecture.audioPath
    ? await getAudioPlaybackUrl(lecture.audioPath)
    : null;

  return (
    <>
      <LectureHeader
        subject={lecture.subject}
        title={lecture.title}
        meta={[
          { label: "Teacher", value: lecture.teacherName ?? "Not given" },
          { label: "Recorded", value: formatDate(lecture.createdAt) },
          { label: "Status", value: STATUS_LABEL[lecture.status] },
        ]}
      >
        {audioUrl ? (
          <AudioPlayer
            src={audioUrl}
            note="Private recording. This playback link is temporary and expires on its own."
          />
        ) : (
          <AudioUnavailable
            message={
              lecture.audioPath
                ? "The recording could not be loaded right now. Reload the page to try again."
                : "This lecture has no audio — the upload did not finish."
            }
          />
        )}
      </LectureHeader>

      {notes?.hasContent ? (
        <LectureNotesView
          lectureId={lecture.id}
          notes={notes}
          transcript={lecture.transcript}
          meta={{
            title: lecture.title,
            subject: lecture.subject,
            teacherName: lecture.teacherName,
          }}
        />
      ) : (
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
          <NotesPending lecture={lecture} emptyNotes={notes !== null} />
        </div>
      )}
    </>
  );
}

const IN_PROGRESS: Lecture["status"][] = [
  "transcribing",
  "analyzing",
  "generating",
];

/*
  Everything that is not readable notes: not started, running, failed, and the
  odd case of an analysis that returned nothing usable. Each says which it is,
  because "no notes" for four different reasons needs four different next steps.
*/
function NotesPending({
  lecture,
  emptyNotes,
}: {
  lecture: Lecture;
  emptyNotes: boolean;
}) {
  const failed = lecture.status === "failed";
  const running = IN_PROGRESS.includes(lecture.status);

  const legend = failed
    ? "Processing failed"
    : running
      ? "Processing now"
      : emptyNotes
        ? "Nothing usable"
        : "Not processed yet";

  const title = failed
    ? "This lecture could not be processed"
    : running
      ? "This lecture is being processed"
      : emptyNotes
        ? "The analysis did not produce readable notes"
        : "No notes have been generated for this lecture";

  const note = failed
    ? (lecture.errorMessage ??
      "Something went wrong while processing this lecture.")
    : running
      ? "Transcription and analysis are running on this machine. The processing page follows each stage."
      : emptyNotes
        ? "The recording was transcribed, but the analysis came back empty. Running it again is worth a try — a longer or clearer recording usually helps."
        : "The recording is stored and ready. Start processing to turn it into notes.";

  return (
    <div className="max-w-2xl">
      <SectionHeading legend={legend} title={title} note={note} />

      {failed || running || emptyNotes ? null : (
        <div className="rounded-card border border-rule bg-slate p-5">
          <p className="legend mb-3">What will be generated</p>
          <ul className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
            {PLANNED_SECTIONS.map((section) => (
              <li
                key={section}
                className="flex items-center gap-3 border-b border-rule py-2.5 text-sm text-graphite last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
              >
                <span
                  aria-hidden="true"
                  className="h-1 w-1 shrink-0 rounded-full bg-graphite/50"
                />
                {section}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <ButtonLink href={`/lecture/${lecture.id}/processing`}>
          {failed || emptyNotes
            ? "Try processing again"
            : running
              ? "Follow processing"
              : "Start processing"}
        </ButtonLink>
        <ButtonLink href="/lecture/demo" variant="ghost">
          See a sample of the finished notes
        </ButtonLink>
      </div>
    </div>
  );
}
