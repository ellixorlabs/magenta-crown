import { LegalProse } from "@/components/brand/LegalProse";
import { getBrandSection } from "@/lib/brand-content.server";

export async function generateMetadata() {
  const s = await getBrandSection("legal_cookies");
  return { title: s.title, description: "Cookie policy for the Magenta Crown website." };
}

export default async function CookiesPage() {
  const s = await getBrandSection("legal_cookies");
  return <LegalProse title={s.title} body={s.content} />;
}
