import { EditorialPageShell } from "@/components/brand/EditorialPageShell";
import { EditorialSection } from "@/components/brand/EditorialSection";
import { getBrandContentMap } from "@/lib/brand-content.server";

export const metadata = {
  title: "About us",
  description: "The story behind Magenta Crown — vision, craft, and modern Indian occasionwear."
};

export default async function AboutPage() {
  const cms = await getBrandContentMap();

  return (
    <EditorialPageShell
      eyebrow="About"
      title={cms.about_intro.title}
      lead={cms.about_intro.content}
    >
      <EditorialSection id="vision" tone="champagne">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
          {cms.about_vision.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">{cms.about_vision.content}</p>
      </EditorialSection>

      <EditorialSection id="mission">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
          {cms.about_mission.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">{cms.about_mission.content}</p>
      </EditorialSection>

      <EditorialSection id="values" tone="champagne">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
          {cms.about_values.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">{cms.about_values.content}</p>
      </EditorialSection>

      <EditorialSection id="founder">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
          {cms.about_founder.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">{cms.about_founder.content}</p>
      </EditorialSection>

      <EditorialSection id="craft" tone="champagne">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
          {cms.about_craftsmanship.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">{cms.about_craftsmanship.content}</p>
      </EditorialSection>

      <EditorialSection id="sustainability">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">
          {cms.about_sustainability.title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-zinc-700">{cms.about_sustainability.content}</p>
      </EditorialSection>

      <section className="bg-[#ebe4dc]">
        <div className="section-shell max-w-3xl py-14 text-center md:py-16">
          <p className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight text-zinc-900 md:text-2xl">
            {cms.about_closing.title}
          </p>
          {cms.about_closing.content ? (
            <p className="mt-4 text-sm leading-relaxed text-zinc-700">{cms.about_closing.content}</p>
          ) : null}
        </div>
      </section>
    </EditorialPageShell>
  );
}
