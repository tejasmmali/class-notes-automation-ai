# Class AI — local AI service

FastAPI service that does the heavy lifting for a lecture: speech-to-text with
faster-whisper (CUDA) and one structured analysis / Q&A request via Ollama. The
Next.js app calls it at `http://127.0.0.1:8001` (override with `AI_SERVICE_URL`).

## Running locally — TWO terminals

The web app and this service are **separate processes**. You need both.

**Terminal 1 — Next.js (from `Teacher/`):**

```powershell
npm run dev            # → http://localhost:3000
```

**Terminal 2 — this service (from `Teacher/ai-service/`):**

```powershell
C:\Users\malit\whisper-env\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8001
```

> Do **not** run `npm run dev` inside `ai-service/`. This folder has no
> `package.json`, so npm walks up to `Teacher/package.json` and starts a second
> **Next.js** instead of the Python service — nothing then listens on 8001 and
> the app reports `ECONNREFUSED 127.0.0.1:8001`.

The port is set by the `--port` flag above, not hardcoded in `main.py`.

## First-time setup

The service needs its web-server dependencies in the `whisper-env` Python
environment. If starting fails with `No module named uvicorn` (or `fastapi`),
install the requirements into that env:

```powershell
C:\Users\malit\whisper-env\Scripts\python.exe -m pip install -r requirements.txt
```

`faster-whisper`, `ctranslate2`, and the CUDA wheels are already present; the
pieces that were missing are `fastapi` and `uvicorn`.

## Verify it is up

```powershell
curl http://127.0.0.1:8001/health
```

Healthy response:

```json
{"ok":true,"whisper":{"model":"small","device":"cuda","state":"ready"},
 "ollama":{"model":"llama3.2:3b","reachable":true,"model_pulled":true},
 "job":{"running":null,"queued":0}}
```

## Endpoints

- `GET  /health` — model + Ollama readiness and job queue.
- `POST /lectures/{id}/process` — transcribe then analyse a stored lecture.
- `POST /lectures/{id}/ask` — grounded Q&A over one lecture.

Configuration (Supabase URL + service-role key, model names) is read from
`ai-service/.env`, falling back to `../.env.local`. See `config.py`.
