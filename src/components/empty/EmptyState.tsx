import Link from "next/link";

type Props = {
  title: string;
  description?: string;
  /** Primary CTA */
  actionHref?: string;
  actionLabel?: string;
  /** Secondary text link */
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  secondaryHref,
  secondaryLabel
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300/90 bg-white/90 px-6 py-14 text-center shadow-sm">
      <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900 sm:text-xl">{title}</p>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-600">{description}</p>}
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="inline-flex min-h-[44px] min-w-[10rem] items-center justify-center rounded-full bg-crown-800 px-8 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-crown-900 active:scale-[0.98]"
          >
            {actionLabel}
          </Link>
        )}
        {secondaryHref && secondaryLabel && (
          <Link href={secondaryHref} className="text-sm font-medium text-crown-800 underline underline-offset-4">
            {secondaryLabel}
          </Link>
        )}
      </div>
    </div>
  );
}
