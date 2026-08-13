import type { ReactNode } from "react";

/*
  Lecture page header. Takes its content from the caller so the same header
  serves a real lecture read from the database and the design demo.

  `children` is the audio slot: a real player when the lecture has audio, a plain
  note when it does not.
*/
export function LectureHeader({
  subject,
  title,
  meta,
  children,
}: {
  subject: string;
  title: string;
  meta: { label: string; value: string }[];
  children?: ReactNode;
}) {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto w-full max-w-5xl px-4 pt-10 pb-8 sm:px-6 sm:pt-14">
        <p className="legend mb-3">{subject}</p>
        <h1 className="text-4xl font-semibold tracking-tight text-paper sm:text-5xl">
          {title}
        </h1>

        {meta.length > 0 ? (
          <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
            {meta.map((entry) => (
              <div key={entry.label}>
                <dt className="legend mb-1">{entry.label}</dt>
                <dd className="text-sm text-paper">{entry.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        {children ? <div className="mt-7">{children}</div> : null}
      </div>
    </header>
  );
}
