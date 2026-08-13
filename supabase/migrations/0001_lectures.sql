-- Class AI — lectures, lecture notes, and private audio storage.
--
-- Run this against a fresh Supabase project (SQL Editor, or `supabase db push`
-- if you use the CLI). It is idempotent, so re-running it is safe.
--
-- There is no authentication in the current MVP. Every read and write happens
-- server-side with the service-role key, which bypasses RLS. RLS is therefore
-- enabled with NO policies: that leaves the tables completely unreachable from
-- the browser via the anon key, which is the behaviour we want until accounts
-- exist.

-- ---------------------------------------------------------------------------
-- lectures
-- ---------------------------------------------------------------------------

create table if not exists public.lectures (
  id            uuid primary key default gen_random_uuid(),
  title         text        not null,
  subject       text        not null,
  teacher_name  text,
  -- Object path inside the private `lectures` bucket, e.g.
  -- `<lecture_id>/original.webm`. NOT a playable URL: signed URLs expire, so
  -- they are minted server-side on demand from this path. Stays null until the
  -- audio upload has been verified, so `audio_url is null` means "no audio".
  audio_url     text,
  transcript    text,
  status        text        not null default 'uploaded'
                  check (status in ('uploaded', 'transcribing', 'analyzing',
                                    'generating', 'completed', 'failed')),
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Newest-first listing on the eventual lecture history screen.
create index if not exists lectures_created_at_idx
  on public.lectures (created_at desc);

-- ---------------------------------------------------------------------------
-- lecture_notes
-- ---------------------------------------------------------------------------
-- One notes row per lecture, written by the AI analysis step (not implemented
-- yet). Structured fields are JSONB so a single structured analysis response
-- can be stored without flattening it into extra tables.

create table if not exists public.lecture_notes (
  id               uuid primary key default gen_random_uuid(),
  lecture_id       uuid        not null unique
                     references public.lectures (id) on delete cascade,
  quick_summary    text,
  full_summary     text,
  key_points       jsonb       not null default '[]'::jsonb,
  definitions      jsonb       not null default '[]'::jsonb,
  examples         jsonb       not null default '[]'::jsonb,
  important_points jsonb       not null default '[]'::jsonb,
  exam_questions   jsonb       not null default '[]'::jsonb,
  revision_notes   text,
  created_at       timestamptz not null default now()
);

create index if not exists lecture_notes_lecture_id_idx
  on public.lecture_notes (lecture_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lectures_set_updated_at on public.lectures;
create trigger lectures_set_updated_at
  before update on public.lectures
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
-- Enabled with no policies: denies anon/authenticated access, allows the
-- server's service-role key. Policies get added when accounts land.

alter table public.lectures      enable row level security;
alter table public.lecture_notes enable row level security;

-- ---------------------------------------------------------------------------
-- Storage: private `lectures` bucket
-- ---------------------------------------------------------------------------
-- Objects live at `<lecture_id>/original.<extension>` inside this bucket, which
-- reads as `lectures/<lecture_id>/original.<extension>` overall.
--
-- Private bucket. Uploads are authorised by short-lived signed upload URLs
-- minted server-side; playback uses short-lived signed download URLs. No
-- storage.objects policies are created, so the anon key cannot read or write
-- objects directly.
--
-- allowed_mime_types must stay in sync with the canonical audio types in
-- src/lib/audio.ts, and file_size_limit with AUDIO_MAX_BYTES there (50 MB).
-- The project-wide storage limit (Storage → Settings) also has to be at least
-- this large or uploads are rejected before the bucket limit applies.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lectures',
  'lectures',
  false,
  52428800, -- 50 MB
  array[
    'audio/webm',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav',
    'audio/aac',
    'audio/flac'
  ]
)
on conflict (id) do update
  set public             = false,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
