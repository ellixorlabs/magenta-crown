import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdminRole, requireStaff } from "@/lib/admin-auth";
import { parseHeroTransition } from "@/lib/hero-transition";
import { DEFAULT_HERO_SLIDES } from "@/lib/hero-data";
import { prisma } from "@/lib/prisma";
import { seedDefaultHeroSlides } from "./actions";
import { HeroSlideForm } from "./HeroSlideForm";
import { HeroTransitionForm } from "./HeroTransitionForm";

export const metadata = { title: "Hero slides | Admin" };

export default async function AdminHeroPage() {
  const session = await requireStaff("/admin/hero");
  if (!isAdminRole(session.user.role)) {
    redirect("/admin");
  }

  const [slides, heroSettings] = await Promise.all([
    prisma.heroSlide.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.heroCarouselSettings.findUnique({ where: { id: "default" } })
  ]);

  const currentTransition = parseHeroTransition(heroSettings?.transition);

  return (
    <div className="space-y-8">
      <HeroTransitionForm current={currentTransition} />

      <div>
        <h2 className="text-xl font-semibold text-zinc-900">Landing hero</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Images and copy for the homepage carousel. Drag inside the preview to set focal point (object-position). If no
          slides are saved, the site uses built-in defaults until you add rows here.
        </p>
      </div>

      {slides.length === 0 && (
        <form action={seedDefaultHeroSlides} className="rounded-2xl border border-dashed border-zinc-300 bg-white p-6">
          <p className="text-sm text-zinc-600">
            No slides in the database yet. You can copy the three built-in slides into the database to edit them.
          </p>
          <button
            type="submit"
            className="mt-4 rounded-full bg-crown-800 px-5 py-2 text-sm font-semibold text-white hover:bg-crown-900"
          >
            Copy built-in slides to database
          </button>
          <p className="mt-3 text-xs text-zinc-500">Preview of defaults:</p>
          <ul className="mt-2 list-inside list-disc text-xs text-zinc-600">
            {DEFAULT_HERO_SLIDES.map((s) => (
              <li key={s.label}>
                {s.line1} — {s.accent}
              </li>
            ))}
          </ul>
        </form>
      )}

      <div className="space-y-6">
        {slides.map((s) => (
          <HeroSlideForm key={s.id} slide={s} />
        ))}
      </div>

      <HeroSlideForm defaultSortOrder={slides.length} />

      <p className="text-xs text-zinc-500">
        Add your image host to <code className="rounded bg-zinc-200 px-1">next.config.ts</code> if images fail to load.{" "}
        <Link href="/" className="text-crown-800 underline">
          View homepage
        </Link>
      </p>
    </div>
  );
}
