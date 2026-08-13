/*
  Lecture data access. Server-only — every function here talks to Supabase with
  the service-role client.

  Failures are returned, not thrown, wherever a caller has a sensible way to
  render them, so no Supabase or Postgres text ever reaches the user.
*/

import { isAllowedExtension } from "@/lib/audio";
import {
  AUDIO_BUCKET,
  SupabaseNotConfiguredError,
  supabaseAdmin,
} from "@/lib/supabase-admin";

export const LECTURE_STATUSES = [
  "uploaded",
  "transcribing",
  "analyzing",
  "generating",
  "completed",
  "failed",
] as const;

export type LectureStatus = (typeof LECTURE_STATUSES)[number];

export type Lecture = {
  id: string;
  title: string;
  subject: string;
  teacherName: string | null;
  /** Object path in the private `lectures` bucket, or null when no audio. */
  audioPath: string | null;
  transcript: string | null;
  status: LectureStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LectureNotes = {
  quickSummary: string | null;
  fullSummary: string | null;
  keyPoints: unknown[];
  definitions: unknown[];
  examples: unknown[];
  importantPoints: unknown[];
  examQuestions: unknown[];
  revisionNotes: string | null;
  createdAt: string;
};

type LectureRow = {
  id: string;
  title: string;
  subject: string;
  teacher_name: string | null;
  audio_url: string | null;
  transcript: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

type LectureNotesRow = {
  quick_summary: string | null;
  full_summary: string | null;
  key_points: unknown;
  definitions: unknown;
  examples: unknown;
  important_points: unknown;
  exam_questions: unknown;
  revision_notes: string | null;
  created_at: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* Lecture IDs arrive from the URL, so they are validated before they are used
   in a query or a storage path. */
export function isLectureId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

function asStatus(value: string): LectureStatus {
  return (LECTURE_STATUSES as readonly string[]).includes(value)
    ? (value as LectureStatus)
    : "failed";
}

function toLecture(row: LectureRow): Lecture {
  return {
    id: row.id,
    title: row.title,
    subject: row.subject,
    teacherName: row.teacher_name,
    audioPath: row.audio_url,
    transcript: row.transcript,
    status: asStatus(row.status),
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/* ------------------------------------------------------------------ reads */

export type LectureResult =
  | { state: "found"; lecture: Lecture }
  | { state: "missing" }
  | { state: "unconfigured" }
  | { state: "error" };

export async function getLecture(id: string): Promise<LectureResult> {
  if (!isLectureId(id)) return { state: "missing" };

  try {
    const { data, error } = await supabaseAdmin()
      .from("lectures")
      .select(
        "id, title, subject, teacher_name, audio_url, transcript, status, error_message, created_at, updated_at",
      )
      .eq("id", id)
      .maybeSingle<LectureRow>();

    if (error) {
      console.error("getLecture failed", error);
      return { state: "error" };
    }
    if (!data) return { state: "missing" };
    return { state: "found", lecture: toLecture(data) };
  } catch (cause) {
    if (cause instanceof SupabaseNotConfiguredError) return { state: "unconfigured" };
    console.error("getLecture threw", cause);
    return { state: "error" };
  }
}

/* Returns null both when no notes row exists yet and when the read fails; the
   caller shows the same "not processed yet" state either way. */
export async function getLectureNotes(
  lectureId: string,
): Promise<LectureNotes | null> {
  if (!isLectureId(lectureId)) return null;

  try {
    const { data, error } = await supabaseAdmin()
      .from("lecture_notes")
      .select(
        "quick_summary, full_summary, key_points, definitions, examples, important_points, exam_questions, revision_notes, created_at",
      )
      .eq("lecture_id", lectureId)
      .maybeSingle<LectureNotesRow>();

    if (error) {
      console.error("getLectureNotes failed", error);
      return null;
    }
    if (!data) return null;

    return {
      quickSummary: data.quick_summary,
      fullSummary: data.full_summary,
      keyPoints: asArray(data.key_points),
      definitions: asArray(data.definitions),
      examples: asArray(data.examples),
      importantPoints: asArray(data.important_points),
      examQuestions: asArray(data.exam_questions),
      revisionNotes: data.revision_notes,
      createdAt: data.created_at,
    };
  } catch (cause) {
    if (cause instanceof SupabaseNotConfiguredError) return null;
    console.error("getLectureNotes threw", cause);
    return null;
  }
}

/* --------------------------------------------------------------- creation */

export function audioObjectPath(lectureId: string, extension: string): string {
  if (!isLectureId(lectureId) || !isAllowedExtension(extension)) {
    /* Both are validated upstream; this is the last line of defence against a
       crafted value reaching a storage path. */
    throw new Error("Refusing to build a storage path from unvalidated input.");
  }
  return `${lectureId}/original.${extension}`;
}

export type CreatedLecture = {
  lectureId: string;
  storagePath: string;
  uploadUrl: string;
  contentType: string;
};

/*
  Creates the lecture row and a one-time signed upload URL for its audio.

  The browser uploads straight to Supabase Storage with that URL. Audio never
  passes through this app's server, which keeps large lectures clear of the
  request-body limit on serverless platforms, and keeps the service-role key on
  the server.

  `audio_url` deliberately stays null here: it is only set once the object has
  been verified in storage, so a half-finished upload can never look complete.
*/
export async function createLectureWithUpload(input: {
  title: string;
  subject: string;
  teacherName: string | null;
  contentType: string;
  extension: string;
}): Promise<CreatedLecture> {
  const supabase = supabaseAdmin();

  const { data, error } = await supabase
    .from("lectures")
    .insert({
      title: input.title,
      subject: input.subject,
      teacher_name: input.teacherName,
      status: "uploaded" satisfies LectureStatus,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    console.error("createLecture insert failed", error);
    throw new Error("DB_INSERT_FAILED");
  }

  const storagePath = audioObjectPath(data.id, input.extension);

  const signed = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: true });

  if (signed.error || !signed.data) {
    /* No upload URL means the row can never be completed — drop it now rather
       than leave a lecture that will always look broken. */
    await supabase.from("lectures").delete().eq("id", data.id);
    console.error("createSignedUploadUrl failed", signed.error);
    throw new Error("STORAGE_SIGN_FAILED");
  }

  return {
    lectureId: data.id,
    storagePath,
    uploadUrl: signed.data.signedUrl,
    contentType: input.contentType,
  };
}

/* ------------------------------------------------------- upload completion */

/*
  Looks in storage for the lecture's audio object.

  The browser reports success after its upload, but that claim is not trusted:
  the object has to actually be there, with a non-zero size, before the lecture
  is marked as having audio.
*/
async function findAudioObject(
  lectureId: string,
): Promise<{ name: string; size: number } | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from(AUDIO_BUCKET)
    .list(lectureId, { limit: 100 });

  if (error) {
    console.error("storage list failed", error);
    throw new Error("STORAGE_LIST_FAILED");
  }

  const object = (data ?? []).find((entry) =>
    entry.name.startsWith("original."),
  );
  if (!object) return null;

  const size =
    typeof object.metadata?.size === "number" ? object.metadata.size : 0;
  return { name: object.name, size };
}

export type ConfirmResult =
  | { ok: true; lecture: Lecture }
  | { ok: false; reason: "missing" | "no_audio" | "empty_audio" | "failed" };

export async function confirmLectureAudio(
  lectureId: string,
): Promise<ConfirmResult> {
  if (!isLectureId(lectureId)) return { ok: false, reason: "missing" };

  const supabase = supabaseAdmin();

  const existing = await supabase
    .from("lectures")
    .select("id")
    .eq("id", lectureId)
    .maybeSingle<{ id: string }>();

  if (existing.error) {
    console.error("confirm lookup failed", existing.error);
    return { ok: false, reason: "failed" };
  }
  if (!existing.data) return { ok: false, reason: "missing" };

  const object = await findAudioObject(lectureId);
  if (!object) return { ok: false, reason: "no_audio" };
  if (object.size <= 0) return { ok: false, reason: "empty_audio" };

  const { data, error } = await supabase
    .from("lectures")
    .update({
      audio_url: `${lectureId}/${object.name}`,
      status: "uploaded" satisfies LectureStatus,
      error_message: null,
    })
    .eq("id", lectureId)
    .select(
      "id, title, subject, teacher_name, audio_url, transcript, status, error_message, created_at, updated_at",
    )
    .single<LectureRow>();

  if (error || !data) {
    console.error("confirm update failed", error);
    return { ok: false, reason: "failed" };
  }

  return { ok: true, lecture: toLecture(data) };
}

/*
  Removes a lecture whose audio never arrived, so a failed submission does not
  leave a permanent broken record.

  Only lectures with no audio are removable. Without accounts there is nothing
  to authorise a delete with, so the endpoint is deliberately limited to rows
  that are still incomplete — a finished lecture cannot be destroyed by guessing
  its id.
*/
export type DiscardResult = "discarded" | "has_audio" | "missing" | "failed";

export async function discardIncompleteLecture(
  lectureId: string,
): Promise<DiscardResult> {
  if (!isLectureId(lectureId)) return "missing";

  const supabase = supabaseAdmin();

  const found = await supabase
    .from("lectures")
    .select("id, audio_url")
    .eq("id", lectureId)
    .maybeSingle<{ id: string; audio_url: string | null }>();

  if (found.error) {
    console.error("discard lookup failed", found.error);
    return "failed";
  }
  if (!found.data) return "missing";
  if (found.data.audio_url) return "has_audio";

  /* Clear any partial object first: deleting the row alone would orphan it. */
  const listed = await supabase.storage
    .from(AUDIO_BUCKET)
    .list(lectureId, { limit: 100 });

  const paths = (listed.data ?? []).map((entry) => `${lectureId}/${entry.name}`);
  if (paths.length > 0) {
    const removed = await supabase.storage.from(AUDIO_BUCKET).remove(paths);
    if (removed.error) console.error("discard storage cleanup failed", removed.error);
  }

  const { error } = await supabase.from("lectures").delete().eq("id", lectureId);
  if (error) {
    console.error("discard delete failed", error);
    return "failed";
  }
  return "discarded";
}

/* -------------------------------------------------------------- playback */

const PLAYBACK_URL_TTL_SECONDS = 60 * 60;

/*
  Short-lived signed URL for playing a lecture's audio. The bucket is private,
  so this is the only way the browser can reach the file, and the link stops
  working on its own.
*/
export async function getAudioPlaybackUrl(
  audioPath: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin()
      .storage.from(AUDIO_BUCKET)
      .createSignedUrl(audioPath, PLAYBACK_URL_TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.error("createSignedUrl failed", error);
      return null;
    }
    return data.signedUrl;
  } catch (cause) {
    if (cause instanceof SupabaseNotConfiguredError) return null;
    console.error("createSignedUrl threw", cause);
    return null;
  }
}
