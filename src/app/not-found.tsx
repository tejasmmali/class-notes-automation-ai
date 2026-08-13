import { ButtonLink } from "@/components/ui";

/*
  Shown for an unknown route and for a lecture id that does not exist — an
  invalid link, or a lecture that was discarded after a failed upload.
*/
export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-20 sm:px-6">
      <p className="legend mb-3">404</p>
      <h1 className="text-3xl font-semibold tracking-tight text-paper sm:text-4xl">
        We could not find that page
      </h1>
      <p className="mt-3 max-w-md font-body text-base leading-relaxed text-graphite">
        The link may be wrong, or the lecture may never have finished uploading.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/lecture/new">Create a lecture</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
