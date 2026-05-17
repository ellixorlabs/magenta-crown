import { parseSupportInfo } from "@/lib/brand-content";
import { getBrandContentMap } from "@/lib/brand-content.server";

export const metadata = {
  title: "Returns & exchanges",
  description: "Returns, exchanges, and eligibility for Magenta Crown purchases."
};

export default async function ReturnsPolicyPage() {
  const cms = await getBrandContentMap();
  const email = parseSupportInfo(cms.support_info.jsonData).email;

  return (
    <main className="bg-[#f8f5f6] py-12">
      <div className="section-shell max-w-3xl space-y-4 text-zinc-700">
        <h1 className="font-[family-name:var(--font-heading)] text-3xl font-semibold text-zinc-900">
          Returns & exchanges
        </h1>
        <p>
          We accept exchanges on eligible full-price items within 14 days of delivery. Items must be unworn, with tags
          and packaging intact. Made-to-order pieces may be non-returnable—stated on the product page.
        </p>
        <p>
          To initiate, email{" "}
          <a href={`mailto:${email}`} className="text-crown-800 underline">
            {email}
          </a>{" "}
          with your order ID and reason.
        </p>
      </div>
    </main>
  );
}
