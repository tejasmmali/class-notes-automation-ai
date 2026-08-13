# Class AI

Turn a recorded lecture into notes a student can actually study from.

Web app: Next.js + TypeScript + Tailwind, with Supabase for the database and
private audio storage. Transcription and lecture analysis run locally on the
machine's GPU — faster-whisper for speech-to-text, Ollama for the analysis — so
processing a lecture costs no API credit. See [CLAUDE.md](CLAUDE.md) for the
project rules.

## What works today

- Create a lecture: subject, title, optional teacher name
- Record in the browser (native `MediaRecorder`) or upload an audio file
- Audio stored in a **private** Supabase Storage bucket
- Transcription with faster-whisper on the local GPU
- One structured analysis request per lecture, producing every note section
- Processing page that follows the lecture's real stored status
- Notes page: quick understanding, full notes, key concepts, definitions,
  examples, important points, potential exam questions, quick revision
- Ask This Lecture — answers grounded in that lecture's transcript and notes,
  which says so when the lecture does not cover the question
- `/lecture/demo` is a design preview of the notes experience, labelled as
  sample content

## How it fits together

```text
browser ──► Next.js (app + API routes) ──► Supabase (Postgres + private storage)
                    │                              ▲
                    ▼                              │
            ai-service (FastAPI)  ───────────────────
             faster-whisper + Ollama, on this machine
```

The Next.js app never handles audio bytes or model output directly. It queues a
lecture with the local service, and the service reads the audio from storage,
writes the transcript and notes back, and moves the lecture through its statuses.
The page follows the stored status, so a stage is only shown once the database
records it.

Both the app and the AI service hold the Supabase service-role key, so **the AI
service must stay bound to localhost.**

## Setup

### 1. Install the web app

```bash
npm install
```

### 2. Create a Supabase project

```bash
cp .env.example .env.local
```

| Variable | Where to find it | Exposure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → API → Project URL | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → anon key | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → service_role key | **server only** |

The service-role key must never be committed or shipped to the browser.

`NEXT_PUBLIC_*` values are inlined at build time, so changing them in a deployed
app needs a rebuild. Locally a `.env.local` change is picked up on restart.

### 3. Run the migration

Paste [`supabase/migrations/0001_lectures.sql`](supabase/migrations/0001_lectures.sql)
into the Supabase SQL Editor and run it, or use the CLI:

```bash
supabase db push
```

It creates the `lectures` and `lecture_notes` tables, enables RLS with no
policies (so the tables are only reachable server-side), and creates the private
`lectures` storage bucket with a 50 MB per-file limit.

If audio uploads fail with a size error, raise the project-wide limit under
Storage → Settings as well — it applies before the bucket's own limit.

### 4. Install the AI service

Needs Python 3.10+ and [Ollama](https://ollama.com).

```bash
ollama pull llama3.2:3b
py -3.11 -m pip install -r ai-service/requirements.txt   # Windows
python3 -m pip install -r ai-service/requirements.txt    # Linux/macOS
```

The two `nvidia-*` wheels are ~1.2 GB and are what CUDA needs; on a machine
without an NVIDIA GPU, skip them and set `WHISPER_DEVICE=cpu` and
`WHISPER_COMPUTE_TYPE=int8` in `.env.local` (much slower, but it works).

The Whisper model itself (~500 MB for `small`) downloads on first use and is
cached by Hugging Face afterwards.

### 5. Start both processes

```bash
# terminal 1 — the AI service
cd ai-service
py -3.11 -m uvicorn main:app --host 127.0.0.1 --port 8001

# terminal 2 — the web app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
`GET http://127.0.0.1:8001/health` reports which models are loaded and whether
Ollama is reachable.

Without the AI service running, everything up to and including the upload still
works: the app says processing cannot be started rather than pretending to
process.

## How a lecture is processed

```text
POST /api/lectures              create the lecture row + a signed upload URL
        ↓
browser PUTs the audio straight to Supabase Storage
        ↓
POST /api/lectures/[id]/audio   server verifies the object, sets status=uploaded
        ↓
POST /api/lectures/[id]/process queue the lecture with the local AI service
        ↓
transcribing → analyzing → generating → completed   (written by the service)
        ↓
GET /api/lectures/[id]/status   what the processing page polls
```

Audio never passes through the Next.js server, so a long lecture is not limited
by a serverless request-body cap. The lecture is not treated as having audio
until the server has confirmed the object exists in storage — and if any step
fails, `DELETE /api/lectures/[id]` removes the incomplete row and any partial
object rather than leaving a broken lecture behind.

Objects live at `lectures/<lecture_id>/original.<extension>` in a private bucket.
`lectures.audio_url` holds that object path, not a URL: playback links are signed
on demand and expire on their own.

The service processes one lecture at a time — both models share one GPU — so a
second lecture waits in a queue instead of competing for VRAM.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```
