import { NextResponse } from "next/server";
import {
  SUBJECT_MAX_LENGTH,
  TEACHER_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  checkAudio,
} from "@/lib/audio";
import { createLectureWithUpload } from "@/lib/lectures";
import { SupabaseNotConfiguredError } from "@/lib/supabase-admin";

/*
  POST /api/lectures

  Creates the lecture row and hands back a one-time signed URL the browser uses
  to upload the audio straight to Supabase Storage. The audio itself never
  travels through this route, so a long lecture is not limited by the
  request-body size cap of a serverless function.

  The lecture is not considered to have audio until
  POST /api/lectures/[id]/audio verifies the object in storage.
*/

const NOT_CONFIGURED =
  "Class AI is not connected to its database yet. Add the Supabase environment variables and try again.";

function readText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : NaN;
}

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return bad("That request could not be read. Please try again.");
  }

  if (typeof body !== "object" || body === null) {
    return bad("That request could not be read. Please try again.");
  }

  const payload = body as Record<string, unknown>;
  const audio =
    typeof payload.audio === "object" && payload.audio !== null
      ? (payload.audio as Record<string, unknown>)
      : null;

  const subject = readText(payload.subject);
  const title = readText(payload.title);
  const teacherName = readText(payload.teacherName);

  if (!subject) return bad("Add the subject before submitting.");
  if (!title) return bad("Add a lecture title before submitting.");
  if (subject.length > SUBJECT_MAX_LENGTH) {
    return bad(`Keep the subject under ${SUBJECT_MAX_LENGTH} characters.`);
  }
  if (title.length > TITLE_MAX_LENGTH) {
    return bad(`Keep the title under ${TITLE_MAX_LENGTH} characters.`);
  }
  if (teacherName.length > TEACHER_MAX_LENGTH) {
    return bad(`Keep the teacher name under ${TEACHER_MAX_LENGTH} characters.`);
  }

  if (!audio) return bad("Record or choose an audio file before submitting.");

  const check = checkAudio({
    mimeType: readText(audio.mimeType),
    fileName: readText(audio.fileName),
    sizeBytes: readNumber(audio.sizeBytes),
  });
  if (!check.ok) return bad(check.message);

  try {
    const created = await createLectureWithUpload({
      title,
      subject,
      teacherName: teacherName || null,
      contentType: check.contentType,
      extension: check.extension,
    });

    return NextResponse.json(
      {
        lectureId: created.lectureId,
        uploadUrl: created.uploadUrl,
        contentType: created.contentType,
      },
      { status: 201 },
    );
  } catch (cause) {
    if (cause instanceof SupabaseNotConfiguredError) {
      return bad(NOT_CONFIGURED, 503);
    }
    console.error("POST /api/lectures failed", cause);
    return bad(
      "We could not start the upload. Please check your connection and try again.",
      500,
    );
  }
}
