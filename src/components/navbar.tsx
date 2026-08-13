import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-ink/88 backdrop-blur-md">
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6"
      >
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-md font-display text-[15px] font-semibold tracking-tight text-paper"
        >
          <span
            aria-hidden="true"
            className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-signal font-mono text-[13px] font-bold text-ink"
          >
            Δ
          </span>
          Class&nbsp;AI
        </Link>
        <ButtonLink href="/lecture/new" size="sm">
          Create a Lecture
        </ButtonLink>
      </nav>
    </header>
  );
}
