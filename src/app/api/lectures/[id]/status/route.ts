import { NextResponse } from "next/server";
import { getLecture, isLectureId } from "@/lib/lectures";

/*
  GET /api/lectures/[id]/status

  The one thing the processing page polls. It reads the lecture row, not the AI
  service: the database is where a stage is actually recorded, so a status here
  is never ahead of the work.
*/

export async function GET(
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
  if (found.state !== "found") {
    return NextResponse.json(
      { error: "Lecture status could not be read." },
      { status: found.state === "unconfigured" ? 503 : 500 },
    );
  }

  return NextResponse.json({
    status: found.lecture.status,
    errorMessage: found.lecture.errorMessage,
  });
}
