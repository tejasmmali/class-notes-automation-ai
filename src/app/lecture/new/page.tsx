import type { Metadata } from "next";
import { NewLectureForm } from "@/components/new-lecture-form";
import { PreviewNote } from "@/components/ui";
import { isSupabaseConfigured } from "@/lib/supabase-admin";

export const metadata: Metadata = {
  title: "Create a lecture · Class AI",
  description:
    "Add lecture details, then record in the browser or upload an audio file.",
};

/* This page carries a configuration banner and a form, neither of which should
   be served from a static cache. Note that NEXT_PUBLIC_* values are inlined at
   build time, so changing them in a deployed app still needs a rebuild. */
export const dynamic = "force-dynamic";

export default function NewLecturePage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="legend mb-3">New lecture</p>
      <h1 className="text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
        Set up the recording
      </h1>
      <p className="mt-3 max-w-lg font-body text-base leading-relaxed text-graphite">
        Name the lecture so the notes are easy to find later, then capture the
        audio.
      </p>

      {configured ? null : (
        <div className="mt-6">
          <PreviewNote>
            This deployment has no Supabase connection, so lectures cannot be
            saved. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
            and SUPABASE_SERVICE_ROLE_KEY, then reload.
          </PreviewNote>
        </div>
      )}

      <NewLectureForm />
    </div>
  );
}
