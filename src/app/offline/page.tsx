import Link from "next/link";

export const metadata = {
  title: "Offline",
  robots: { index: false, follow: false }
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-white px-6 py-16 text-center text-zinc-900">
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold sm:text-3xl">
        You&apos;re offline
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-600">
        Check your connection. Cached pages may still open; try again when you&apos;re back online.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-crown-800 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-crown-900"
      >
        Go to home
      </Link>
    </main>
  );
}
