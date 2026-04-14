import Link from "next/link";
import Image from "next/image";

type Props = {
  imageUrl: string;
  imageAlt: string;
  eyebrow: string;
  title: string;
  body: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
};

export function ProductStorySection({ imageUrl, imageAlt, eyebrow, title, body, bullets, ctaLabel, ctaHref }: Props) {
  return (
    <section className="section-shell py-16">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-zinc-200">
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
            unoptimized
          />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-zinc-600">{body}</p>
          <ul className="mt-6 space-y-3 text-sm text-zinc-700">
            {bullets.map((line) => (
              <li key={line}>• {line}</li>
            ))}
          </ul>
          <Link
            href={ctaHref}
            className="mt-8 inline-block text-sm font-semibold text-crown-700 underline-offset-4 hover:underline"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
