import type { ReactNode } from "react";
import Link from "next/link";
import { FooterNewsletterForm } from "@/components/features/FooterNewsletterForm";
import { FooterMobileAccordion } from "@/components/features/FooterMobileAccordion";
import { getBrandContentMap } from "@/lib/brand-content.server";
import { parseFooterJson } from "@/lib/brand-content";
import { shopCategoryHref } from "@/lib/shop-category-url";

const shopLinks = [
  { label: "Sarees", href: shopCategoryHref("Sarees") },
  { label: "Lehengas", href: shopCategoryHref("Lehengas") },
  { label: "Kurtas", href: shopCategoryHref("Kurtas") },
  { label: "Shop all", href: "/shop" }
];

export async function Footer() {
  const cms = await getBrandContentMap();
  const footer = parseFooterJson(cms.footer.jsonData);

  const columns = [
    { title: "About Magenta Crown", links: footer.aboutLinks },
    { title: "Support", links: footer.supportLinks },
    { title: "Legal", links: footer.legalLinks },
    {
      title: "Follow us",
      links: [
        { label: "Instagram", href: footer.instagramUrl },
        { label: "Facebook", href: footer.facebookUrl },
        { label: "Pinterest", href: footer.pinterestUrl }
      ]
    }
  ] as const;

  return (
    <footer className="border-t border-zinc-800/40 bg-[#141210] text-zinc-300" data-site-footer>
      <div className="section-shell py-12 md:py-14">
        <div className="max-w-md">
          <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-[0.18em] text-white">
            MAGENTA CROWN
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">{footer.tagline}</p>
        </div>

        <div className="mt-10 hidden gap-8 md:grid md:grid-cols-4 lg:gap-10">
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">{col.title}</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <FooterLink href={l.href} external={l.href.startsWith("http")}>
                      {l.label}
                    </FooterLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 md:hidden">
          <FooterMobileAccordion
            columns={columns.map((c) => ({ title: c.title, links: [...c.links] }))}
            shopLinks={shopLinks}
          />
        </div>

        <div className="mt-10 hidden border-t border-zinc-800/60 pt-8 lg:block">
          <h4 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Shop</h4>
          <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {shopLinks.map((l) => (
              <li key={l.href}>
                <FooterLink href={l.href}>{l.label}</FooterLink>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-800/80">
        <div className="section-shell flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-zinc-500" suppressHydrationWarning>
            © {new Date().getFullYear()} Magenta Crown. All rights reserved.
          </p>
          <FooterNewsletterForm />
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
  external
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  const cls =
    "text-zinc-400 transition hover:text-white hover:underline decoration-zinc-600 underline-offset-4";
  if (external) {
    return (
      <a href={href} className={cls} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
