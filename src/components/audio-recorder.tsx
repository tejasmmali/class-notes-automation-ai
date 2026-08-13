"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AudioPreview } from "@/components/audio-preview";
import { checkAudio, formatDuration, type CapturedAudio } from "@/lib/audio";

/*
  Browser recording with the native MediaRecorder API.

  The level meter is driven by a real AnalyserNode reading the live input, so the
  bars only move when the microphone is actually hearing something. Once
  recording stops the meter is replaced by a real player for the captured audio —
  nothing on screen represents audio that does not exist.

  Recording is always user-initiated and the state is on screen throughout
  (CLAUDE.md §22).
*/

type RecorderState = "idle" | "starting" | "recording" | "recorded" | "error";

const BAR_COUNT = 44;

/* Browsers disagree on what MediaRecorder can produce: Chromium does WebM/Opus,
   Safari does MP4/AAC, Firefox does OGG/Opus. First supported one wins. */
const PREFERRED_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
  "audio/ogg",
];

function pickMimeType(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  if (typeof MediaRecorder.isTypeSupported !== "function") return null;
  return PREFERRED_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

function microphoneErrorMessage(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "Microphone access was blocked. Allow it in your browser's site settings, then try again.";
    case "NotFoundError":
    case "OverconstrainedError":
      return "No microphone was found. Connect one, or upload an audio file instead.";
    case "NotReadableError":
      return "The microphone is in use by another application. Close it and try again.";
    default:
      return "Recording could not start in this browser. You can upload an audio file instead.";
  }
}

export function AudioRecorder({
  value,
  onChange,
  disabled = false,
}: {
  value: CapturedAudio | null;
  onChange: (audio: CapturedAudio | null) => void;
  disabled?: boolean;
}) {
  const [state, setState] = useState<RecorderState>(value ? "recorded" : "idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const frameRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const barsRef = useRef<(HTMLSpanElement | null)[]>([]);

  /* Releases the microphone, the meter, and the clock. Safe to call twice. */
  const teardown = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void contextRef.current?.close().catch(() => {});
    contextRef.current = null;
  }, []);

  useEffect(() => teardown, [teardown]);

  /* Live input level → bar heights, written straight to the DOM. Going through
     React state here would re-render 44 nodes every frame for no benefit. */
  const startMeter = useCallback((stream: MediaStream) => {
    try {
      const context = new AudioContext();
      contextRef.current = context;
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);

      const samples = new Uint8Array(analyser.fftSize);
      const levels = new Array<number>(BAR_COUNT).fill(4);

      const tick = () => {
        analyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (let i = 0; i < samples.length; i += 1) {
          const deviation = (samples[i] - 128) / 128;
          sum += deviation * deviation;
        }
        const rms = Math.sqrt(sum / samples.length);

        levels.shift();
        levels.push(Math.min(100, Math.max(4, rms * 260)));

        for (let i = 0; i < BAR_COUNT; i += 1) {
          const bar = barsRef.current[i];
          if (bar) bar.style.height = `${levels[i]}%`;
        }

        frameRef.current = requestAnimationFrame(tick);
      };

      frameRef.current = requestAnimationFrame(tick);
    } catch {
      /* No meter is acceptable; the recording itself still works. */
    }
  }, []);

  const start = useCallback(async () => {
    setError(null);

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setState("error");
      setError(
        "This browser cannot record audio. Please upload an audio file instead.",
      );
      return;
    }

    setState("starting");
    onChange(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (cause) {
      setState("error");
      setError(microphoneErrorMessage(cause));
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    const mimeType = pickMimeType();
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      teardown();
      setState("error");
      setError(
        "This browser cannot record audio in a supported format. Please upload an audio file instead.",
      );
      return;
    }

    recorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onerror = () => {
      teardown();
      setState("error");
      setError("Recording stopped unexpectedly. Please try again.");
    };

    recorder.onstop = () => {
      const elapsed = (Date.now() - startedAtRef.current) / 1000;
      /* Drop any codec parameters: `audio/webm;codecs=opus` has to become
         `audio/webm` before it is used as a stored content type. */
      const container = (recorder.mimeType || mimeType || "audio/webm")
        .split(";")[0]
        .trim();
      const blob = new Blob(chunksRef.current, { type: container });
      chunksRef.current = [];
      teardown();

      const check = checkAudio({
        mimeType: container,
        fileName: "recording",
        sizeBytes: blob.size,
      });

      if (!check.ok) {
        setState("error");
        setError(check.message);
        onChange(null);
        return;
      }

      setSeconds(elapsed);
      setState("recorded");
      onChange({
        blob,
        mimeType: check.contentType,
        fileName: `recording.${check.extension}`,
        sizeBytes: blob.size,
        source: "recording",
      });
    };

    /* A timeslice keeps chunks flowing rather than buffering one huge blob at
       the end, which matters for a lecture-length recording. */
    recorder.start(1000);
    startedAtRef.current = Date.now();
    setSeconds(0);
    setState("recording");
    startMeter(stream);

    timerRef.current = setInterval(() => {
      setSeconds((Date.now() - startedAtRef.current) / 1000);
    }, 250);
  }, [onChange, startMeter, teardown]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    } else {
      teardown();
      setState("idle");
    }
  }, [teardown]);

  const isRecording = state === "recording";
  const captured = value?.source === "recording" ? value : null;

  /*
    The form owns the audio, so a file picked in the upload panel replaces this
    recording. What the card shows is derived from that value rather than from
    local state, so it can never keep claiming a recording the form has dropped.
  */
  const view: RecorderState =
    state === "recording" || state === "starting" || state === "error"
      ? state
      : captured
        ? "recorded"
        : "idle";

  const copy: Record<RecorderState, string> = {
    idle: "Recording happens in your browser. Nothing starts until you press record.",
    starting: "Waiting for you to allow microphone access.",
    recording:
      "Recording is in progress and clearly visible to everyone in the room.",
    recorded: "Listen back before submitting, or record again to replace it.",
    error: "Nothing was recorded.",
  };

  const legend: Record<RecorderState, string> = {
    idle: "Microphone ready",
    starting: "Requesting microphone",
    recording: "Recording",
    recorded: "Recording captured",
    error: "Recording failed",
  };

  return (
    <div className="rounded-card border border-rule bg-slate p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5" role="status">
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${
              isRecording
                ? "animate-blip bg-signal"
                : view === "recorded"
                  ? "bg-signal"
                  : view === "error"
                    ? "bg-graphite"
                    : "bg-graphite/50"
            }`}
          />
          <span className="font-mono text-[11px] tracking-widest text-paper uppercase">
            {legend[view]}
          </span>
        </div>
        <span
          className="font-mono text-2xl text-paper tabular-nums"
          aria-label="Recording length"
        >
          {formatDuration(view === "idle" ? 0 : seconds)}
        </span>
      </div>

      {captured ? (
        <div className="mb-6">
          <AudioPreview audio={captured} knownSeconds={seconds} />
        </div>
      ) : (
        <div
          className="mb-6 flex h-24 items-center justify-center gap-[3px] rounded-md border border-rule bg-ink px-3"
          role="img"
          aria-label={
            isRecording ? "Live microphone level" : "Microphone level display"
          }
        >
          {isRecording ? (
            Array.from({ length: BAR_COUNT }, (_, i) => (
              <span
                key={i}
                ref={(node) => {
                  barsRef.current[i] = node;
                }}
                style={{ height: "4%" }}
                className="w-full min-w-[2px] rounded-full bg-signal/75 transition-[height] duration-75"
              />
            ))
          ) : (
            <span className="font-mono text-[11px] tracking-widest text-graphite/60 uppercase">
              {view === "starting" ? "Waiting for permission" : "Waiting for input"}
            </span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {isRecording ? (
          <button
            type="button"
            onClick={stop}
            className="inline-flex h-11 items-center gap-2.5 rounded-md border border-rule bg-surface px-5 font-display text-sm font-semibold text-paper transition-colors hover:border-graphite/60"
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-[2px] bg-signal" />
            Stop recording
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void start()}
            disabled={disabled || state === "starting"}
            className="inline-flex h-11 items-center gap-2.5 rounded-md bg-signal px-5 font-display text-sm font-semibold text-ink transition-colors hover:bg-signal/88 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <MicIcon />
            {view === "starting"
              ? "Starting…"
              : view === "recorded" || view === "error"
                ? "Record again"
                : "Start recording"}
          </button>
        )}

        {captured ? (
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setSeconds(0);
              setState("idle");
            }}
            disabled={disabled}
            className="inline-flex h-11 items-center rounded-md border border-rule bg-surface px-5 font-display text-sm font-semibold text-graphite transition-colors hover:text-paper disabled:cursor-not-allowed disabled:opacity-45"
          >
            Discard
          </button>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-graphite">{copy[view]}</p>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-signal/30 bg-signal/[0.07] px-3 py-2 text-sm leading-relaxed text-signal"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
    </svg>
  );
}
