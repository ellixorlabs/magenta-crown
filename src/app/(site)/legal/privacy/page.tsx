import { LegalProse } from "@/components/brand/LegalProse";
import { getBrandSection } from "@/lib/brand-content.server";

export async function generateMetadata() {
  const s = await getBrandSection("legal_privacy");
  return { title: s.title, description: "How Magenta Crown collects and protects your personal information." };
}

export default async function PrivacyPage() {
  const s = await getBrandSection("legal_privacy");
  return <LegalProse title={s.title} body={s.content} />;
}
