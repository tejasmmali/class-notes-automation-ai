# Class AI — Claude Code Project Rules

> This file is the permanent development contract for the Class AI project.
> Read and follow this file before making changes to the project.

---

# 1. PROJECT IDENTITY

**Project:** Class AI

**Purpose:**
Class AI is a web-based AI classroom assistant that converts recorded lectures into useful educational material.

Core workflow:

```text
Teacher
   ↓
Browser microphone / audio upload
   ↓
Audio file
   ↓
Speech-to-text
   ↓
Lecture understanding
   ↓
Structured educational notes
   ↓
Student web interface
``` 

The current project is a **WEB-ONLY MVP**.

---

# 2. ABSOLUTE MVP SCOPE

For the current version, everything must work through the web browser and cloud backend.

## Allowed

* Browser microphone recording
* Audio file upload
* Audio playback
* Speech-to-text
* AI summarization
* AI lecture analysis
* Student notes
* Quick summaries
* Important points
* Definitions
* Examples
* Potential exam questions
* Revision notes
* Lecture-specific AI Q&A
* Supabase
* Local AI service (faster-whisper + Ollama)
* Next.js
* TypeScript
* Tailwind CSS

## NOT ALLOWED IN CURRENT MVP

Do NOT implement:

* ESP32
* Arduino
* Raspberry Pi hardware
* Custom PCB
* Bluetooth microphone
* BLE audio
* Wi-Fi microphone hardware
* Classroom gateway
* Wearable device
* Physical microphone
* Battery hardware
* IoT hardware
* Hardware firmware
* Live hardware streaming
* Native mobile application

Hardware may be considered in a future version, but it must not affect the current architecture unnecessarily.

---

# 3. PRODUCT PRINCIPLE

The product is NOT merely an audio transcription tool.

The product goal is:

> **Turn classroom lectures into understandable knowledge.**

The important transformation is:

```text
Lecture
   ↓
Transcript
   ↓
Understanding
   ↓
Learning material
```

The final output should help a student:

1. Understand what was taught.
2. Review the lecture quickly.
3. Study the important concepts.
4. Prepare potential questions.
5. Ask questions about the lecture.

---

# 4. DEVELOPMENT PRINCIPLES

Always prioritize:

1. Working functionality
2. AI output quality
3. Reliability
4. Security
5. Good UX
6. Performance
7. Maintainability
8. Visual polish

Do not prioritize:

* unnecessary abstractions
* unnecessary libraries
* unnecessary animations
* speculative future features
* complex infrastructure
* excessive AI agents

---

# 5. COST / CREDIT OPTIMIZATION

This project may be developed using AI coding agents and external AI APIs.

Therefore, **minimize unnecessary AI and agent usage**.

## Claude Code rules

Do NOT:

* repeatedly inspect unchanged files
* repeatedly explain the entire project
* spawn agents for simple tasks
* perform unnecessary web research
* rewrite working code
* refactor unrelated files
* create multiple agents for independent note sections
* repeatedly analyze the same architecture
* regenerate files without a reason

Before making a change:

```text
Inspect
↓
Understand
↓
Change
↓
Verify
```

Prefer direct implementation over delegation.

Use sub-agents only when they provide a clear benefit.

---

# 6. AI API COST OPTIMIZATION

The lecture-processing pipeline should use the minimum reasonable number of AI requests.

Processing currently runs on local models, so a request costs GPU time rather
than credit — but the rule stands either way: fewer requests is also faster, and
one analysis over the whole transcript produces more coherent notes than eight
partial ones.

Preferred pipeline:

```text
Audio
 ↓
ONE transcription request
 ↓
Transcript
 ↓
ONE structured analysis request
 ↓
All educational outputs
```

Do NOT create separate LLM calls for:

* quick summary
* full summary
* definitions
* key points
* examples
* questions
* revision notes

All of these should be generated in one structured analysis request.

---

# 7. LECTURE ANALYSIS OUTPUT

The AI should generate structured data similar to:

```json
{
  "quick_summary": "",
  "full_summary": "",
  "key_points": [],
  "definitions": [],
  "examples": [],
  "important_points": [],
  "exam_questions": [
    {
      "question": "",
      "importance": "important"
    }
  ],
  "revision_notes": ""
}
```

Use structured outputs/schema validation whenever supported.

Avoid relying on fragile free-form AI text parsing.

---

# 8. AI ACCURACY RULES

The lecture transcript is the primary source.

The AI must:

* preserve the teacher's intended meaning
* correct obvious speech-recognition mistakes when context is clear
* preserve technical terminology
* identify uncertainty when necessary
* avoid unsupported claims
* avoid inventing examples
* avoid inventing formulas
* avoid inventing definitions
* avoid inventing teacher statements

The AI must NOT confidently fabricate missing information.

Potential exam questions must be described as:

> Potential exam question

or:

> Important question for revision

Never:

> This will definitely appear in the exam.

---

# 9. LECTURE Q&A RULES

The "Ask This Lecture" feature should primarily use:

1. Lecture transcript
2. Lecture notes
3. Generated lecture information

The AI should not pretend that something was taught if it was not found in the lecture.

If the answer isn't available:

> "I couldn't find that information in this lecture."

It may optionally provide general knowledge only if the product explicitly allows that behavior.

---

# 10. CURRENT TECH STACK

Preferred stack:

### Frontend

* Next.js
* TypeScript
* Tailwind CSS

### Backend

* Next.js server routes/server actions where appropriate

### Database

* Supabase PostgreSQL

### Storage

* Supabase Storage

### AI

* Local AI service in `ai-service/` (FastAPI, Python)
* faster-whisper on the local GPU for speech-to-text
* Ollama for lecture analysis and lecture Q&A
* No AI API key. Processing a lecture costs no credit, and no lecture audio
  leaves the machine.
* A hosted API remains a possible swap: the pipeline shape (one transcription
  request, one structured analysis request) is the same either way.

### Deployment

* Vercel-compatible for the web app
* Lecture processing needs the local AI service running on a machine with the
  models; the app degrades honestly when it is not reachable

Do not replace the stack without a strong technical reason.

If an existing project already uses a compatible technology, preserve it.

---

# 11. DATABASE

Primary tables:

## lectures

```text
id
title
subject
teacher_name
audio_url
transcript
status
error_message
created_at
updated_at
```

## lecture_notes

```text
id
lecture_id
quick_summary
full_summary
key_points
definitions
examples
important_points
exam_questions
revision_notes
created_at
```

Use JSONB for structured arrays where appropriate.

Do not over-engineer the database.

---

# 12. LECTURE STATUS

Use these states:

```text
uploaded
transcribing
analyzing
generating
completed
failed
```

The UI must reflect actual backend state.

Never show fake successful processing.

---

# 13. AUDIO STORAGE

Audio belongs in Supabase Storage.

Do NOT store large audio files directly in PostgreSQL.

Preferred structure:

```text
lectures/
  {lecture_id}/
    original.{extension}
```

Keep audio storage private where appropriate.

Use signed URLs for protected audio.

---

# 14. BROWSER RECORDING

Browser recording should use the native:

```text
MediaRecorder API
```

Do not add a large recording library unless it provides a clear and necessary benefit.

The recording UI should provide:

* recording state
* timer
* start
* stop
* playback
* upload
* error handling

Recording must always be clearly visible to the user.

---

# 15. SECURITY

Never expose:

* OpenAI API keys
* Supabase service-role keys
* private credentials
* server secrets

Secrets belong in environment variables.

Client-side code must never contain private API credentials.

AI API calls must happen server-side.

Validate:

* file type
* file size
* request data
* database IDs

Never blindly trust client-provided identifiers.

---

# 16. ENVIRONMENT VARIABLES

Use environment variables.

Example:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AI_SERVICE_URL=
AI_SERVICE_TOKEN=
WHISPER_MODEL=
OLLAMA_MODEL=
```

There is no `OPENAI_API_KEY`: processing runs on local models. See
`.env.example` for the full, current list — the AI service reads the same file.

Only include variables actually required by the implementation.

`.env.example` may contain variable names and empty placeholders.

NEVER place real secrets in:

* source code
* Git
* documentation
* `.env.example`
* screenshots
* commits

---

# 17. UI / DESIGN SYSTEM

The application should feel like a professional AI SaaS product.

Visual direction:

* modern
* dark
* minimal
* premium
* clean
* responsive
* accessible

Use:

* strong typography
* clear hierarchy
* subtle borders
* restrained accent color
* rounded cards
* consistent spacing
* subtle motion

Avoid:

* excessive gradients
* excessive glassmorphism
* excessive shadows
* unnecessary decorative elements
* clutter
* generic template appearance

Do not sacrifice usability for aesthetics.

---

# 18. MAIN USER FLOWS

## Teacher

```text
Create Lecture
      ↓
Enter subject/title
      ↓
Record or upload audio
      ↓
Submit
      ↓
Processing
      ↓
Lecture completed
```

## Student

```text
Open lecture
      ↓
Quick Understanding
      ↓
Full Notes
      ↓
Key Concepts
      ↓
Important Questions
      ↓
Revision
      ↓
Ask Lecture
```

---

# 19. REQUIRED ROUTES

Current MVP:

```text
/
```

Landing page.

```text
/lecture/new
```

Create/upload/record lecture.

```text
/lecture/[id]/processing
```

Processing status.

```text
/lecture/[id]
```

Lecture results.

Additional routes require a clear reason.

---

# 20. COMPONENT PRINCIPLES

Prefer reusable components.

Examples:

```text
Button
Card
Input
AudioRecorder
AudioUploader
ProcessingStatus
LectureHeader
QuickSummary
FullNotes
KeyPoints
Definitions
QuestionList
RevisionNotes
LectureChat
```

Do not create abstractions for one-off trivial elements unless they improve readability.

Avoid giant components.

---

# 21. ERROR HANDLING

Every major operation needs an error state.

Handle:

* unsupported audio
* file too large
* failed upload
* empty recording
* transcription failure
* AI failure
* malformed AI response
* database failure
* network failure
* missing environment variables

Errors should be understandable to normal users.

Do not expose internal stack traces.

---

# 22. PRIVACY

Classroom recordings may contain voices and potentially personal information.

Therefore:

* recording must be user initiated
* recording state must be visible
* do not implement secret recording
* clearly communicate recording behavior
* provide appropriate privacy/consent messaging
* do not retain audio unnecessarily

Include an appropriate notice such as:

> "Only record lectures with the appropriate permission. Recordings may contain student voices or other personal information."

---

# 23. PERFORMANCE

Avoid unnecessary:

* client-side rendering
* API calls
* database queries
* re-renders
* large dependencies
* duplicated requests

Prefer server-side operations where appropriate.

Do not optimize prematurely.

Fix measurable problems rather than inventing complex infrastructure.

---

# 24. TESTING REQUIREMENT

Before declaring a feature complete:

1. Run lint.
2. Run TypeScript checks.
3. Run production build.
4. Test the main user flow.
5. Test error states.
6. Verify API integration.
7. Verify database writes.
8. Verify storage.
9. Verify AI output.

A feature is not complete merely because the UI exists.

---

# 25. NO FAKE FUNCTIONALITY

Never create a fake:

```text
"AI processing..."
```

screen that doesn't actually process anything.

Never create fake AI results and present them as real results.

If an external API is unavailable:

* implement the real integration
* show the correct error
* document the required environment variable

Demo data must be clearly labeled as demo data.

---

# 26. CHANGE MANAGEMENT

Before making major architectural changes:

1. Check this file.
2. Check existing implementation.
3. Determine whether the change conflicts with existing decisions.
4. Prefer backward-compatible changes.
5. Update this file if the architecture genuinely changes.

Do not modify this rules file for trivial implementation details.

---

# 27. CHANGE LOG

Maintain a concise development history below.

Format:

```text
## YYYY-MM-DD — Change title

- What changed
- Why it changed
- Important architectural decision, if any
```

Only record meaningful changes.

Do not log every tiny CSS edit.

---

# CHANGE HISTORY

## 2026-08-13 — Flash question cards

* Added an interactive **Flashcards** study section to the lecture page, built
  entirely from the existing `lecture_notes`. **No new AI calls, no API route, no
  DB table**: one transcription + one analysis remains the whole AI cost.
* **Derivation** (`lib/flashcards.ts`, `toFlashcards(notes)`): deterministic,
  render-time. Definitions → "What is X?" cards; key points written as
  "Term: explanation" → concept cards; important points that name a known concept
  → fill-in-the-blank recall cards; examples that name a concept → example cards;
  exam questions → kept as questions but only when the notes actually define a
  term the question names (otherwise skipped, never guessed). Every answer is
  verbatim from the notes; long meanings split into ≤4 sentence bullets. Deduped
  by question, capped at 20, thin-lecture fallback from "A = B" revision points.
* **UI** (`components/flashcards.tsx`, client component): large centred card with
  a subtle CSS `rotateY` flip (grid-stacked faces so it sizes to the taller side;
  reduced-motion already collapses it to an instant swap via globals.css).
  Question → reveal → Got it / Review again → next. Controls: Prev, Reveal, Next,
  Shuffle, a progress bar with "Card X of Y" and "N remaining", and a completion
  panel ("Study again" / "Shuffle & restart"). Keyboard (Space / ← / →) is scoped
  to the focused widget so it never hijacks page scroll or the Ask textarea.
  Session state (order, reveal, marks) is local React state only — nothing stored.
  Polished empty state for when no reliable cards can be derived.
* Nav gained **Flashcards** (between Revision and the cheat sheet). Demo page
  (`/lecture/demo`) renders the same section from its sample notes.
* No dependency added. Verified: `npm run lint`, `npm run typecheck`,
  `npm run build` all pass; derivation validated against the demo notes (20
  cards, no duplicates, no invented text); `/lecture/demo` server-renders the
  section. In-browser interaction (flip, keyboard, shuffle, completion, mobile)
  was not driven headlessly here.

## 2026-08-13 — Transcript, revision snap cards, and PPTX export

* Added three student-facing features to the lecture page, all built from data
  that already exists. **No new AI calls**: one transcription + one analysis
  remains the entire AI cost of a lecture.
* **Real Transcript** (`lecture-transcript.tsx`, `lib/transcript.ts`): shows the
  verbatim Whisper output stored in `lectures.transcript`. Whisper stores it as
  one space-joined block, so it is grouped into paragraphs (~4 sentences) for
  readability — formatting only, no word is changed, summarised, or regenerated.
  Body scrolls in its own box for long lectures.
* **Revision snap cards** (`revision-cards.tsx`, `lib/revision-cards.ts`):
  concept cards derived at render time from the existing `lecture_notes` — each
  definition becomes a card and pulls in key/important points and examples that
  literally name its term; leftover points become themed cards. Every bullet is
  verbatim from the notes, so nothing is invented. No new DB column.
* **PPTX export** (`export-ppt-button.tsx`, `lib/build-pptx.ts`): deterministic
  `.pptx` generated in the browser from the notes already on the page. pptxgenjs
  is dynamically imported on click (code-split), so it never touches the server
  bundle and is only downloaded when a user exports. Title → quick summary →
  key points / definitions / important points / examples → revision + exam
  questions, split across slides to avoid overflow, in the app's dark palette.
* Nav gained Transcript and Revision (cards); the existing compressed revision
  list is relabelled "Cheat sheet". Demo page (`/lecture/demo`) renders the same
  new sections from its sample data so the preview stays representative.
* Only dependency added: `pptxgenjs`. Its transitive `image-size` has a DoS
  advisory in its ICNS/JXL/HEIF image parsers — not reachable here, since the
  export builds text-only slides and never feeds an image to the library.
* Verified: `npm run lint`, `npm run typecheck`, `npm run build` all pass. PPTX
  generation and both derivation functions were run against sample notes and
  confirmed to emit an 8-slide deck with verbatim bullet text (`**` stripped).

## 2026-08-12 — Local transcription, analysis, notes, and lecture Q&A

* Lecture processing is real end to end: audio → transcript → structured notes →
  notes page → Ask This Lecture. Verified on a real lecture (2 min of speech
  transcribed in ~13 s, analysed in ~14 s on an RTX 4050).
* Processing runs **locally** instead of on the OpenAI API: faster-whisper
  (CUDA/float16) for speech-to-text and Ollama (`llama3.2:3b`) for one structured
  analysis request per lecture. Decision: no API credit per lecture, and no
  classroom audio leaves the machine. The pipeline shape from §6 is unchanged, so
  a hosted API can be swapped back in behind it.
* New Python service in `ai-service/` (FastAPI): `POST /lectures/{id}/process`,
  `POST /lectures/{id}/ask`, `GET /health`. It reads the lecture and its audio
  from Supabase itself, so only a lecture id crosses from the app — a crafted
  request cannot point it at another lecture's audio.
* One lecture at a time on a single worker thread: both models share one 6 GB
  GPU, so a second lecture queues instead of competing for VRAM.
* Analysis output goes through Ollama's schema-enforced structured output and is
  then re-validated in Python and again in TypeScript (`src/lib/notes-view.ts`)
  before rendering. An analysis with no summary fails the lecture rather than
  saving empty notes.
* Note components are now props-driven, so real notes and the `/lecture/demo`
  preview render through the same components. Sections with no content are left
  out rather than shown empty.
* Processing page starts the job and follows it by polling the lecture's stored
  status; the stage list still only advances because the database says so.
* On Windows, the pip-installed CUDA DLLs are registered at model load
  (`transcribe.py`). Without it CTranslate2 fails with "cublas64_12.dll is not
  found" even though the wheels are installed.
* Fixed a pre-existing lint failure in `audio-preview.tsx` (setState in an
  effect) so `npm run lint` passes.

## 2026-08-11 — Lecture creation and audio storage layer

* Added Supabase: `lectures` + `lecture_notes` tables, private `lectures` storage
  bucket, RLS enabled with no policies (server-only access via service role).
  Migration lives in `supabase/migrations/0001_lectures.sql`.
* Connected `/lecture/new` to the real backend, with native `MediaRecorder`
  recording, file upload, playback before submit, and real validation.
* Audio uploads go **browser → Supabase Storage** through a signed upload URL, so
  audio never passes through the Next.js server and is not limited by a
  serverless request-body cap.
* `lectures.audio_url` stores the storage object path, not a URL. Playback links
  are signed server-side on demand and expire. Decision: a stored signed URL
  would break once it expired.
* A lecture only counts as having audio after the server verifies the object in
  storage; failed submissions discard the incomplete row and any partial object.
* Processing and lecture pages read real status. No transcription or AI yet, so
  those states are stated plainly rather than simulated.
* Demo notes content moved to the reserved `/lecture/demo` id, labelled as a
  design preview. Real lectures show their actual stored state.
* Only dependency added: `@supabase/supabase-js`.

## 2026-08-11 — Project Initialized

* Defined Class AI as a web-only AI lecture assistant.
* Confirmed that the current MVP contains no hardware.
* Defined browser recording/upload as the audio input.
* Defined transcription → AI analysis → student notes as the core pipeline.
* Prioritized cost-efficient AI processing.
* Established one transcription request + one structured analysis request as the preferred lecture pipeline.
* Defined Next.js, TypeScript, Tailwind, Supabase, and OpenAI as the preferred technology stack.

---

# 28. FUTURE FEATURES

These are ideas only.

Do NOT implement them unless explicitly requested.

Possible future versions:

```text
Teacher accounts
Student accounts
Class codes
Multiple classes
Syllabus upload
Syllabus-aware notes
Lecture search
MCQ generation
Flashcards
Lecture history
Real-time transcription
Mobile app
Wearable microphone
Bluetooth audio
Dedicated classroom hardware
Classroom gateway
Offline recording
```

Future ideas must not unnecessarily complicate the current MVP.

---

# 29. RULE FOR NEW FEATURES

Before implementing a new feature, ask:

1. Does it directly improve the current MVP?
2. Is it required for the core workflow?
3. Can it be implemented simply?
4. Does it increase AI/API cost?
5. Does it introduce unnecessary dependencies?
6. Does it conflict with this document?

If the feature is not necessary, defer it.

---

# 30. DEFINITION OF DONE

The current MVP is considered successful when a real user can:

```text
Open website
    ↓
Create lecture
    ↓
Record audio in browser
       OR
Upload audio
    ↓
Submit
    ↓
Speech-to-text
    ↓
AI analysis
    ↓
Generate educational content
    ↓
View results
```

The result must contain:

```text
Quick Understanding
Full Class Notes
Key Concepts
Definitions
Examples
Important Points
Potential Exam Questions
Quick Revision
```

The application must work without any physical hardware.

---
# 31. FRONTEND DESIGN SKILL

For all significant frontend/UI work, use the **official Anthropic `frontend-design` skill**.

Official source:

`anthropics/claude-code → plugins/frontend-design`

GitHub:
https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design

Skill file:
https://github.com/anthropics/claude-code/blob/main/plugins/frontend-design/skills/frontend-design/SKILL.md

## Installation

If the skill is not already available in Claude Code, install the project-local version:

```bash
mkdir -p .claude/skills/frontend-design
curl -o .claude/skills/frontend-design/SKILL.md https://raw.githubusercontent.com/anthropics/claude-code/main/plugins/frontend-design/skills/frontend-design/SKILL.md
```

On Windows PowerShell:

```powershell
New-Item -ItemType Directory -Force .claude\skills\frontend-design
Invoke-WebRequest `
  -Uri "https://raw.githubusercontent.com/anthropics/claude-code/main/plugins/frontend-design/skills/frontend-design/SKILL.md" `
  -OutFile ".claude\skills\frontend-design\SKILL.md"
```

Before installing, check whether the skill already exists.

Do not download it repeatedly.

## Usage

Use the skill when:

* creating pages
* redesigning pages
* creating components
* improving visual hierarchy
* designing dashboards
* designing the lecture interface
* designing the audio recorder
* designing processing states
* designing the student notes experience

Do NOT use it for:

* database work
* API implementation
* authentication logic
* debugging backend code
* simple text changes
* unrelated infrastructure

## Design requirement

Do not produce generic AI-generated UI.

Avoid:

* generic purple AI gradients
* default Inter-only designs
* excessive glassmorphism
* repetitive rounded cards
* generic SaaS templates
* unnecessary gradients
* excessive animations
* visual clutter

The Class AI interface should have a distinct visual identity.

The design should feel:

**calm + intelligent + educational + premium + trustworthy**

The UI must prioritize readability because students will spend significant time reading generated lecture notes.

## Important

Do not spend multiple AI calls redesigning the same page unnecessarily.

For a new page:

1. Understand the product context.
2. Commit to a clear visual direction.
3. Implement it.
4. Run the app.
5. Inspect the result.
6. Make only meaningful corrections.

Do not repeatedly regenerate the design from scratch.

The frontend-design skill should improve quality while keeping development and AI usage efficient.

# FINAL RULE

When uncertain, choose the solution that is:

**simpler + cheaper + reliable + maintainable**

rather than:

**more complex + more impressive + unnecessary**

The MVP's purpose is to prove that the **AI classroom knowledge experience works**.

Do not lose that focus.
