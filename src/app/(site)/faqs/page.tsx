import Link from "next/link";
import { EditorialPageShell } from "@/components/brand/EditorialPageShell";
import { EditorialSection } from "@/components/brand/EditorialSection";
import { FaqAccordion } from "@/components/brand/FaqAccordion";
import { parseFaqEntries } from "@/lib/brand-content";
import { getBrandContentMap } from "@/lib/brand-content.server";

export const metadata = {
  title: "FAQs",
  description: "Answers about sizing, shipping, returns, and shopping at Magenta Crown."
};

export default async function FaqsPage() {
  const cms = await getBrandContentMap();
  const entries = parseFaqEntries(cms.faq.jsonData);

  return (
    <EditorialPageShell eyebrow="Support" title={cms.faq.title} lead="Clear answers for a smooth boutique experience.">
      <EditorialSection>
        <FaqAccordion entries={entries} />
        <p className="mt-8 text-sm text-zinc-600">
          Still need help?{" "}
          <Link href="/support" className="font-medium text-crown-800 underline">
            Contact us
          </Link>
        </p>
      </EditorialSection>
    </EditorialPageShell>
  );
}
