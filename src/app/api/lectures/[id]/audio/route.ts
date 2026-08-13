import { NextResponse } from "next/server";
import { confirmLectureAudio, isLectureId } from "@/lib/lectures";
import { SupabaseNotConfiguredError } from "@/lib/supabase-admin";

/*
  POST /api/lectures/[id]/audio

  Called after the browser finishes uploading to the signed URL. The claim is
  not taken at face value: the object has to be present in the private bucket
  with a non-zero size before `audio_url` is written and the lecture counts as
  uploaded.

  Nothing about the storage path comes from the request body — it is derived
  from the validated lecture id in the URL.
*/

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!isLectureId(id)) {
    return NextResponse.json({ error: "That lecture link is not valid." }, { status: 400 });
  }

  try {
    const result = await confirmLectureAudio(id);

    if (result.ok) {
      return NextResponse.json({ status: result.lecture.status });
    }

    switch (result.reason) {
      case "missing":
        return NextResponse.json(
          { error: "That lecture no longer exists." },
          { status: 404 },
        );
      case "no_audio":
        return NextResponse.json(
          {
            error:
              "The audio did not reach storage. Nothing was saved — please try submitting again.",
          },
          { status: 400 },
        );
      case "empty_audio":
        return NextResponse.json(
          {
            error:
              "The uploaded audio file was empty. Please record or choose the file again.",
          },
          { status: 400 },
        );
      default:
        return NextResponse.json(
          { error: "We could not confirm the upload. Please try again." },
          { status: 500 },
        );
    }
  } catch (cause) {
    if (cause instanceof SupabaseNotConfiguredError) {
      return NextResponse.json(
        {
          error:
            "Class AI is not connected to its storage yet. Add the Supabase environment variables and try again.",
        },
        { status: 503 },
      );
    }
    console.error("POST /api/lectures/[id]/audio failed", cause);
    return NextResponse.json(
      { error: "We could not confirm the upload. Please try again." },
      { status: 500 },
    );
  }
}
