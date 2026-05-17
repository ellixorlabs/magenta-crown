import { EditorialPageShell } from "@/components/brand/EditorialPageShell";
import { EditorialSection } from "@/components/brand/EditorialSection";
import { contentParagraphs } from "@/lib/brand-content";
import { getBrandContentMap } from "@/lib/brand-content.server";

export const metadata = {
  title: "Returns & exchanges",
  description: "Returns, exchanges, and eligibility for Magenta Crown purchases."
};

export default async function ReturnsPage() {
  const cms = await getBrandContentMap();
  const paragraphs = contentParagraphs(cms.returns_policy.content);

  return (
    <EditorialPageShell eyebrow="Support" title={cms.returns_policy.title}>
      <EditorialSection>
        <div className="space-y-5 text-[15px] leading-relaxed text-zinc-700">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 48)}>{p}</p>
          ))}
        </div>
      </EditorialSection>
    </EditorialPageShell>
  );
}
