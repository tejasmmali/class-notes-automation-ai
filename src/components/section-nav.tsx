import Link from "next/link";

/*
  Sticky in-page jump bar. On mobile the notes page is very long, so a student
  needs to reach "Revision" without scrolling past everything above it.

  Sections are passed in rather than fixed, because a lecture only lists the
  sections its own notes actually contain.
*/
export function SectionNav({
  sections,
}: {
  sections: { href: string; label: string }[];
}) {
  if (sections.length < 2) return null;

  return (
    <nav
      aria-label="Lecture sections"
      className="sticky top-16 z-30 border-b border-rule bg-ink/92 backdrop-blur-md"
    >
      <ul className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-4 py-2 sm:px-6 [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => (
          <li key={section.href}>
            <Link
              href={section.href}
              className="inline-block rounded px-2.5 py-1 font-mono text-[11px] tracking-wider whitespace-nowrap text-graphite uppercase transition-colors hover:text-paper"
            >
              {section.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
