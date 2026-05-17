import Link from "next/link";
import { requireMerchAdmin } from "@/lib/admin-auth";
import { BrandContentEditor } from "@/components/admin/BrandContentEditor";
import { getBrandContentMap } from "@/lib/brand-content.server";
import type { BrandSectionKey } from "@/lib/brand-content";

export const metadata = { title: "Brand Content | Admin" };

const GROUPS: Array<{ label: string; keys: BrandSectionKey[]; hint?: string }> = [
  {
    label: "About page",
    keys: [
      "about_intro",
      "about_vision",
      "about_mission",
      "about_values",
      "about_founder",
      "about_craftsmanship",
      "about_sustainability",
      "about_closing"
    ]
  },
  {
    label: "Support & FAQ",
    keys: ["support_info", "faq"],
    hint: "support_info JSON: email, phone, whatsapp, whatsappUrl, hoursTitle, hoursBody, note. FAQ JSON: array of { id, question, answer }."
  },
  {
    label: "Footer & legal",
    keys: ["footer", "returns_policy", "legal_terms", "legal_privacy", "legal_cookies"],
    hint: "Footer JSON: tagline, social URLs, aboutLinks, supportLinks, legalLinks arrays."
  }
];

export default async function AdminBrandContentPage() {
  await requireMerchAdmin("/admin/content");
  const cms = await getBrandContentMap();

  const sections = GROUPS.flatMap((g) =>
    g.keys.map((sectionKey) => ({
      sectionKey,
      label: `${g.label} · ${sectionKey.replace(/_/g, " ")}`,
      title: cms[sectionKey].title,
      content: cms[sectionKey].content,
      jsonData: cms[sectionKey].jsonData ? JSON.stringify(cms[sectionKey].jsonData, null, 2) : "",
      hint: g.hint
    }))
  );

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-crown-800 underline">
        ← Admin home
      </Link>
      <h2 className="mt-2 text-xl font-semibold text-zinc-900">Brand Content</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Edit about, support, FAQs, footer links, and legal copy. Changes go live after save (cached ~2 min).
      </p>
      <BrandContentEditor sections={sections} />
    </div>
  );
}
