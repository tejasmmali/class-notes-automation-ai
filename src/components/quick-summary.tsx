import type { ReactNode } from "react";

export type ChainStep = { label: string; detail: string };

/*
  Quick Understanding — the signature block of the product.

  The optional signal chain is design-preview only: it restates one lecture's own
  subject (transduction) as a graphic, which nothing in the generated notes can
  supply. A real lecture renders the summary alone rather than a diagram that
  would have to be invented for it.
*/
export function QuickSummary({
  summary,
  chain,
  footnote,
}: {
  summary: string;
  chain?: ChainStep[];
  footnote?: ReactNode;
}) {
  return (
    <section id="quick-understanding" aria-labelledby="quick-understanding-h">
      <div className="rounded-card border border-signal/25 bg-signal/[0.045] p-5 sm:p-7">
        <p className="legend mb-3 text-signal/80">Quick understanding</p>
        <h2
          id="quick-understanding-h"
          className="max-w-3xl font-body text-xl leading-snug font-medium text-paper sm:text-[1.6rem] sm:leading-[1.35]"
        >
          {summary}
        </h2>

        {chain && chain.length > 0 ? (
          <ol className="mt-7 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-4">
            {chain.map((step, i) => (
              <li key={step.label} className="relative bg-slate p-4">
                <div className="mb-1.5 flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === 0 ? "bg-graphite" : "bg-signal"
                    }`}
                  />
                  <span className="font-mono text-[11px] tracking-wider text-paper uppercase">
                    {step.label}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-graphite">
                  {step.detail}
                </p>
              </li>
            ))}
          </ol>
        ) : null}

        {footnote ? (
          <p className="mt-3 font-mono text-[11px] text-graphite/75">{footnote}</p>
        ) : null}
      </div>
    </section>
  );
}
