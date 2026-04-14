import Image from "next/image";

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  images: string[];
};

export function SocialGallerySection({ eyebrow, title, subtitle, images }: Props) {
  if (images.length === 0) return null;

  return (
    <section className="bg-zinc-100 py-16">
      <div className="section-shell">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{eyebrow}</p>
          <h2 className="mt-2 font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900 sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {images.map((src, i) => (
            <div key={`${src}-${i}`} className="relative aspect-square overflow-hidden rounded-2xl">
              <Image
                src={src}
                alt={`Gallery ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
