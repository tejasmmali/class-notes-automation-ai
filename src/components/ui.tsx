import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-md font-display text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-signal text-ink hover:bg-signal/88",
  secondary:
    "border border-rule bg-surface text-paper hover:border-graphite/60 hover:bg-surface/70",
  ghost: "text-graphite hover:text-paper",
};

const sizes = {
  sm: "h-9 px-3.5",
  md: "h-11 px-5",
};

type ButtonProps = {
  variant?: Variant;
  size?: keyof typeof sizes;
} & ComponentProps<"button">;

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

type ButtonLinkProps = {
  variant?: Variant;
  size?: keyof typeof sizes;
} & ComponentProps<typeof Link>;

export function ButtonLink({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-card border border-rule bg-slate ${className}`}
    >
      {children}
    </div>
  );
}

/*
  Section heading: monospace legend + serif-adjacent title. The legend carries
  the section's role, so the title never has to repeat it.
*/
export function SectionHeading({
  legend,
  title,
  note,
  id,
}: {
  legend: string;
  title: string;
  note?: string;
  id?: string;
}) {
  return (
    <div className="mb-6">
      <p className="legend mb-2.5">{legend}</p>
      <h2
        id={id}
        className="text-xl font-semibold tracking-tight text-paper sm:text-2xl"
      >
        {title}
      </h2>
      {note ? (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-graphite">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/*
  Wraps a lecture section so in-page jump links land on the section (legend
  included) rather than mid-heading under the sticky bars. The offset itself
  comes from html { scroll-padding-top } — adding scroll-margin here too would
  stack with it and overshoot.
*/
export function LectureSection({
  anchor,
  labelledBy,
  children,
}: {
  anchor: string;
  labelledBy: string;
  children: ReactNode;
}) {
  return (
    <section id={anchor} aria-labelledby={labelledBy}>
      {children}
    </section>
  );
}

/* Small amber-bordered notice. Used to mark what is not wired up yet. */
export function PreviewNote({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-signal/25 bg-signal/[0.06] px-3 py-2 font-mono text-[11px] leading-relaxed text-signal/85">
      <span aria-hidden="true" className="mt-px">
        ▲
      </span>
      <span>{children}</span>
    </p>
  );
}

export function Tag({
  children,
  tone = "quiet",
}: {
  children: ReactNode;
  tone?: "quiet" | "signal";
}) {
  const tones = {
    quiet: "border-rule text-graphite",
    signal: "border-signal/40 text-signal",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
