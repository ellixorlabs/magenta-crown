import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-[100dvh] bg-black text-white">
      <div
        className="absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: `
              linear-gradient(rgba(197,160,89,0.08) 1px, transparent 1px),
              linear-gradient(90deg, rgba(197,160,89,0.08) 1px, transparent 1px)
            `,
          backgroundSize: "56px 56px"
        }}
      />
      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
        <p className="text-xs uppercase tracking-[0.5em] text-[#C5A059]">Magenta Crown</p>
        <h1 className="mt-6 font-[family-name:var(--font-heading)] text-7xl font-light sm:text-8xl md:text-9xl">
          404
        </h1>
        <p className="mt-4 max-w-md font-[family-name:var(--font-heading)] text-xl text-white/85 sm:text-2xl">
          This chapter isn&apos;t in our lookbook.
        </p>
        <p className="mt-3 max-w-sm text-sm text-white/55">
          The page may have moved, or the link may be mistyped. Let&apos;s return you to the collection.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/"
            className="rounded-full bg-[#C5A059] px-8 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Home
          </Link>
          <Link
            href="/shop"
            className="rounded-full border border-[#C5A059]/60 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Shop all
          </Link>
        </div>
      </div>
    </div>
  );
}
