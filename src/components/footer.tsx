export function Footer() {
  return (
    <footer className="border-t border-rule">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-mono text-[11px] tracking-widest text-graphite uppercase">
          Class AI — turn every lecture into knowledge
        </p>
        <p className="font-mono text-[11px] text-graphite/70">
          Web-only MVP · no accounts, no tracking
        </p>
      </div>
    </footer>
  );
}
