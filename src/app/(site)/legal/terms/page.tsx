import { LegalProse } from "@/components/brand/LegalProse";
import { getBrandSection } from "@/lib/brand-content.server";

export async function generateMetadata() {
  const s = await getBrandSection("legal_terms");
  return { title: s.title, description: "Terms of use for the Magenta Crown website and online store." };
}

export default async function TermsPage() {
  const s = await getBrandSection("legal_terms");
  return <LegalProse title={s.title} body={s.content} />;
}
