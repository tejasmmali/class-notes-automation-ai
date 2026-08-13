/*
  Client for the local AI service in `ai-service/`.

  Server-only. The service does the transcription and analysis on this machine's
  GPU, holds the Supabase service-role key itself, and is expected to listen on
  localhost — so nothing here is ever reachable from the browser.

  Failures are returned rather than thrown, with a message written for the person
  reading the page: "the AI service is not running" is something a teacher can
  act on, a connection stack trace is not.
*/

const DEFAULT_URL = "http://127.0.0.1:8001";

/* Both timeouts are generous on purpose: the machine may be busy loading a
   model. Processing itself is not waited on — that call only queues the job. */
const START_TIMEOUT_MS = 20_000;
const ASK_TIMEOUT_MS = 300_000;

export type AiServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; message: string };

const OFFLINE_MESSAGE =
  "The Class AI processing service is not running on this machine. Start it and try again.";

function baseUrl(): string {
  return (process.env.AI_SERVICE_URL || DEFAULT_URL).replace(/\/+$/, "");
}

function headers(): HeadersInit {
  const token = process.env.AI_SERVICE_TOKEN;
  return {
    "Content-Type": "application/json",
    ...(token ? { "X-Class-AI-Token": token } : {}),
  };
}

/* FastAPI reports errors as { detail: string }. Those messages are written for
   the user, so they are passed through; anything else falls back to a generic
   line rather than showing raw JSON. */
async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: unknown };
    if (typeof body.detail === "string" && body.detail.trim()) {
      return body.detail.trim();
    }
  } catch {
    /* not JSON — fall through */
  }
  return "The AI service could not complete that request.";
}

async function call<T>(
  path: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<AiServiceResult<T>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, {
      ...init,
      headers: headers(),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (cause) {
    const timedOut = cause instanceof Error && cause.name === "TimeoutError";
    console.error("AI service request failed", path, cause);
    return {
      ok: false,
      status: 503,
      message: timedOut
        ? "The AI service took too long to respond. It may still be busy with another lecture."
        : OFFLINE_MESSAGE,
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: await readError(response),
    };
  }

  try {
    return { ok: true, data: (await response.json()) as T };
  } catch {
    return {
      ok: false,
      status: 502,
      message: "The AI service returned an unreadable response.",
    };
  }
}

/* What the service did with the request: it processes one lecture at a time, so
   a second lecture is queued rather than run alongside. */
export type ProcessState =
  | "started"
  | "queued"
  | "already_running"
  | "already_queued";

export function startProcessing(
  lectureId: string,
): Promise<AiServiceResult<{ state: ProcessState }>> {
  return call(
    `/lectures/${lectureId}/process`,
    { method: "POST" },
    START_TIMEOUT_MS,
  );
}

export function askLecture(
  lectureId: string,
  question: string,
): Promise<AiServiceResult<{ answer: string }>> {
  return call(
    `/lectures/${lectureId}/ask`,
    { method: "POST", body: JSON.stringify({ question }) },
    ASK_TIMEOUT_MS,
  );
}
