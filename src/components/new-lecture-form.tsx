"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AudioRecorder } from "@/components/audio-recorder";
import { AudioUpload } from "@/components/audio-upload";
import { SectionHeading } from "@/components/ui";
import {
  SUBJECT_MAX_LENGTH,
  TEACHER_MAX_LENGTH,
  TITLE_MAX_LENGTH,
  type CapturedAudio,
} from "@/lib/audio";
import { UploadError, putToSignedUrl } from "@/lib/upload";

/*
  Lecture creation.

  Order matters: the lecture row is created first so the audio has an id to be
  stored under, then the audio goes straight from the browser to Supabase
  Storage with a signed URL, and only then is the lecture confirmed as having
  audio. Nothing tells the teacher the lecture was saved until the server has
  verified the file in storage.

  If any step fails, the half-made lecture is discarded so the teacher is not
  left with a permanently broken record.
*/

type Phase = "idle" | "creating" | "uploading" | "confirming" | "done";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "",
  creating: "Creating the lecture…",
  uploading: "Uploading audio…",
  confirming: "Confirming the upload…",
  done: "Uploaded — opening your lecture…",
};

class ApiError extends Error {}

async function postJson(url: string, body: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      "Could not reach Class AI. Check your connection and try again.",
    );
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as {
      error?: unknown;
    } | null;
    throw new ApiError(
      typeof data?.error === "string"
        ? data.error
        : "Something went wrong. Please try again.",
    );
  }

  return response.json().catch(() => ({}));
}

export function NewLectureForm() {
  const router = useRouter();

  const [subject, setSubject] = useState("");
  const [title, setTitle] = useState("");
  const [teacher, setTeacher] = useState("");
  const [audio, setAudio] = useState<CapturedAudio | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const busy = phase !== "idle";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);

    if (!subject.trim()) {
      setError("Add the subject before submitting.");
      return;
    }
    if (!title.trim()) {
      setError("Add a lecture title before submitting.");
      return;
    }
    if (!audio) {
      setError(
        "Record the lecture or choose an audio file before submitting.",
      );
      return;
    }

    let lectureId: string | null = null;
    setProgress(0);

    try {
      setPhase("creating");
      const created = (await postJson("/api/lectures", {
        subject,
        title,
        teacherName: teacher,
        audio: {
          mimeType: audio.mimeType,
          fileName: audio.fileName,
          sizeBytes: audio.sizeBytes,
        },
      })) as { lectureId?: string; uploadUrl?: string; contentType?: string };

      if (!created.lectureId || !created.uploadUrl || !created.contentType) {
        throw new ApiError("Something went wrong. Please try again.");
      }
      lectureId = created.lectureId;

      setPhase("uploading");
      await putToSignedUrl({
        uploadUrl: created.uploadUrl,
        blob: audio.blob,
        contentType: created.contentType,
        onProgress: setProgress,
      });

      setPhase("confirming");
      await postJson(`/api/lectures/${lectureId}/audio`, {});

      setPhase("done");
      router.push(`/lecture/${lectureId}/processing`);
    } catch (cause) {
      /* Remove the lecture that was never completed. The endpoint refuses to
         delete anything that already has audio, so this cannot destroy a
         lecture that actually made it. */
      if (lectureId) {
        void fetch(`/api/lectures/${lectureId}`, { method: "DELETE" }).catch(
          () => {},
        );
      }

      setPhase("idle");
      setProgress(0);
      setError(
        cause instanceof ApiError || cause instanceof UploadError
          ? cause.message
          : "Something went wrong while saving the lecture. Please try again.",
      );
    }
  }

  return (
    <form className="mt-10 space-y-12" onSubmit={handleSubmit} noValidate>
      <section aria-labelledby="lecture-info">
        <SectionHeading
          id="lecture-info"
          legend="Lecture information"
          title="What is this lecture?"
        />

        <div className="space-y-5">
          <Field
            id="subject"
            label="Subject"
            placeholder="Automation & Robotics"
            value={subject}
            onChange={setSubject}
            maxLength={SUBJECT_MAX_LENGTH}
            disabled={busy}
            required
          />
          <Field
            id="title"
            label="Lecture title"
            placeholder="Sensors"
            value={title}
            onChange={setTitle}
            maxLength={TITLE_MAX_LENGTH}
            disabled={busy}
            required
          />
          <Field
            id="teacher"
            label="Teacher name"
            hint="Optional"
            placeholder="Dr. Anita Rao"
            autoComplete="name"
            value={teacher}
            onChange={setTeacher}
            maxLength={TEACHER_MAX_LENGTH}
            disabled={busy}
          />
        </div>
      </section>

      <section aria-labelledby="audio">
        <SectionHeading
          id="audio"
          legend="Audio"
          title="Record the lecture"
          note="Only record lectures with the appropriate permission. Recordings may contain student voices or other personal information."
        />

        <div className="space-y-4">
          <AudioRecorder value={audio} onChange={setAudio} disabled={busy} />

          <div
            className="flex items-center gap-4 py-1"
            role="separator"
            aria-orientation="horizontal"
          >
            <span className="h-px flex-1 bg-rule" />
            <span className="font-mono text-[10px] tracking-widest text-graphite/70 uppercase">
              or
            </span>
            <span className="h-px flex-1 bg-rule" />
          </div>

          <AudioUpload value={audio} onChange={setAudio} disabled={busy} />
        </div>
      </section>

      <section className="border-t border-rule pt-8">
        <div className="flex flex-col gap-4">
          {error ? (
            <p
              role="alert"
              className="rounded-md border border-signal/35 bg-signal/[0.07] px-4 py-3 text-sm leading-relaxed text-signal"
            >
              {error}
            </p>
          ) : null}

          {busy ? (
            <div aria-live="polite">
              <div className="mb-2 flex items-center justify-between">
                <span className="legend">{PHASE_LABEL[phase]}</span>
                {phase === "uploading" ? (
                  <span className="font-mono text-xs text-graphite tabular-nums">
                    {Math.round(progress * 100)}%
                  </span>
                ) : null}
              </div>
              <div
                role="progressbar"
                aria-valuenow={
                  phase === "uploading" ? Math.round(progress * 100) : undefined
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Upload progress"
                className="h-1.5 overflow-hidden rounded-full bg-rule"
              >
                <div
                  className="h-full rounded-full bg-signal transition-[width] duration-200"
                  style={{
                    width:
                      phase === "creating"
                        ? "6%"
                        : phase === "uploading"
                          ? `${Math.max(6, progress * 100)}%`
                          : "100%",
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-11 items-center justify-center rounded-md bg-signal px-6 font-display text-sm font-semibold text-ink transition-colors hover:bg-signal/88 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {busy ? "Saving…" : "Create lecture"}
            </button>
            <p className="text-xs text-graphite">
              {audio
                ? "Your audio is stored privately. AI processing is the next step."
                : "Record or choose an audio file to enable submitting."}
            </p>
          </div>
        </div>
      </section>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  maxLength,
  disabled,
  required = false,
  autoComplete = "off",
}: {
  id: string;
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  disabled: boolean;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 flex items-center gap-2 text-sm font-medium text-paper"
      >
        {label}
        {hint ? (
          <span className="font-mono text-[10px] tracking-widest text-graphite uppercase">
            {hint}
          </span>
        ) : null}
      </label>
      <input
        id={id}
        name={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        maxLength={maxLength}
        required={required}
        disabled={disabled}
        className="h-11 w-full rounded-md border border-rule bg-slate px-3.5 text-sm text-paper transition-colors placeholder:text-graphite/55 hover:border-graphite/40 disabled:cursor-not-allowed disabled:opacity-60"
      />
    </div>
  );
}
