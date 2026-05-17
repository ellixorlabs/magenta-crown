import Link from "next/link";
import { EditorialPageShell } from "@/components/brand/EditorialPageShell";
import { EditorialSection } from "@/components/brand/EditorialSection";
import { ContactForm } from "@/components/support/ContactForm";
import { parseSupportInfo } from "@/lib/brand-content";
import { getBrandContentMap } from "@/lib/brand-content.server";

export const metadata = {
  title: "Support",
  description: "Contact Magenta Crown — customer care, orders, and styling questions."
};

export default async function SupportPage() {
  const cms = await getBrandContentMap();
  const info = parseSupportInfo(cms.support_info.jsonData);

  return (
    <EditorialPageShell eyebrow="Support" title="We are here to help" lead={cms.support_info.title}>
      <EditorialSection>
        <div className="space-y-4 text-[15px] text-zinc-700">
          <p>
            Email:{" "}
            <a href={`mailto:${info.email}`} className="font-medium text-crown-800 underline decoration-crown-200">
              {info.email}
            </a>
          </p>
          <p>Phone: {info.phone}</p>
          <p>
            WhatsApp:{" "}
            <a
              href={info.whatsappUrl}
              className="font-medium text-crown-800 underline decoration-crown-200"
              target="_blank"
              rel="noreferrer"
            >
              {info.whatsapp}
            </a>
          </p>
        </div>
        <div className="mt-8 rounded-xl border border-zinc-200/80 bg-[#faf8f6] p-5">
          <p className="text-sm font-semibold text-zinc-900">{info.hoursTitle}</p>
          <p className="mt-1 text-sm text-zinc-700">{info.hoursBody}</p>
          <p className="mt-3 text-sm text-zinc-600">{info.note}</p>
        </div>
        <p className="mt-6 text-sm text-zinc-600">
          <Link href="/faqs" className="font-medium text-crown-800 underline">
            View FAQs
          </Link>{" "}
          ·{" "}
          <Link href="/returns" className="font-medium text-crown-800 underline">
            Returns policy
          </Link>
        </p>
        <ContactForm />
      </EditorialSection>
    </EditorialPageShell>
  );
}
