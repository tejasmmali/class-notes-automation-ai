import { NextResponse } from "next/server";
import { discardIncompleteLecture, isLectureId } from "@/lib/lectures";
import { SupabaseNotConfiguredError } from "@/lib/supabase-admin";

/*
  DELETE /api/lectures/[id]

  Cleanup for a submission that failed part-way: removes the lecture row and any
  partial object in storage so a failed upload does not leave a permanent
  half-made lecture behind.

  Only lectures with no audio can be removed. There are no accounts yet, so
  there is nothing to authorise a delete with — restricting it to still-
  incomplete rows means a finished lecture cannot be destroyed by guessing its
  id.
*/

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!isLectureId(id)) {
    return NextResponse.json({ error: "That lecture link is not valid." }, { status: 400 });
  }

  try {
    const result = await discardIncompleteLecture(id);

    switch (result) {
      case "discarded":
        return new NextResponse(null, { status: 204 });
      case "missing":
        return NextResponse.json(
          { error: "That lecture no longer exists." },
          { status: 404 },
        );
      case "has_audio":
        return NextResponse.json(
          { error: "This lecture already has audio and cannot be discarded." },
          { status: 409 },
        );
      default:
        return NextResponse.json(
          { error: "We could not discard that lecture." },
          { status: 500 },
        );
    }
  } catch (cause) {
    if (cause instanceof SupabaseNotConfiguredError) {
      return NextResponse.json({ error: "Storage is not configured." }, { status: 503 });
    }
    console.error("DELETE /api/lectures/[id] failed", cause);
    return NextResponse.json(
      { error: "We could not discard that lecture." },
      { status: 500 },
    );
  }
}
