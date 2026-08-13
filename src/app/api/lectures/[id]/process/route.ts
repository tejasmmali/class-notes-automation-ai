import { NextResponse } from "next/server";
import { startProcessing } from "@/lib/ai-service";
import { getLecture, isLectureId } from "@/lib/lectures";

/*
  POST /api/lectures/[id]/process

  Hands the lecture to the local AI service for transcription and analysis. The
  request returns as soon as the job is queued — a lecture takes minutes, so the
  page follows the lecture's real status instead of holding a connection open.

  Only the lecture id crosses the wire. The service reads the audio path, subject
  and title from the database itself, so a crafted request cannot point it at
  another lecture's audio.
*/

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!isLectureId(id)) {
    return NextResponse.json(
      { error: "That lecture link is not valid." },
      { status: 400 },
    );
  }

  const found = await getLecture(id);

  if (found.state === "missing") {
    return NextResponse.json(
      { error: "That lecture no longer exists." },
      { status: 404 },
    );
  }
  if (found.state === "unconfigured") {
    return NextResponse.json(
      { error: "Class AI is not connected to its database yet." },
      { status: 503 },
    );
  }
  if (found.state === "error") {
    return NextResponse.json(
      { error: "The database could not be reached. Please try again." },
      { status: 500 },
    );
  }

  const { lecture } = found;

  if (!lecture.audioPath) {
    return NextResponse.json(
      {
        error:
          "This lecture has no audio, so there is nothing to process. Create the lecture again.",
      },
      { status: 409 },
    );
  }

  const result = await startProcessing(lecture.id);

  if (!result.ok) {
    /* The service's own message is written for the user — pass it through. */
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ state: result.data.state, status: lecture.status });
}
