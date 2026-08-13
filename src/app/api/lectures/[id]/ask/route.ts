import { NextResponse } from "next/server";
import { askLecture } from "@/lib/ai-service";
import { isLectureId } from "@/lib/lectures";

/*
  POST /api/lectures/[id]/ask

  "Ask this lecture". The answer is produced by the local model from this
  lecture's transcript and notes only (CLAUDE.md §9); the service refuses when
  the lecture has no transcript yet, and says so when the lecture does not cover
  the question.

  A local model on one GPU takes a while, so this request is deliberately slow
  rather than streamed — one request, one answer.
*/

const MAX_QUESTION_CHARS = 500;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!isLectureId(id)) {
    return NextResponse.json(
      { error: "That lecture link is not valid." },
      { status: 400 },
    );
  }

  let question: unknown;
  try {
    const body = (await request.json()) as { question?: unknown };
    question = body.question;
  } catch {
    return NextResponse.json({ error: "That request was not valid." }, { status: 400 });
  }

  if (typeof question !== "string" || !question.trim()) {
    return NextResponse.json(
      { error: "Type a question about this lecture first." },
      { status: 400 },
    );
  }
  if (question.length > MAX_QUESTION_CHARS) {
    return NextResponse.json(
      { error: `Please keep the question under ${MAX_QUESTION_CHARS} characters.` },
      { status: 400 },
    );
  }

  const result = await askLecture(id, question.trim());

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  return NextResponse.json({ answer: result.data.answer });
}
