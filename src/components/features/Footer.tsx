import Link from "next/link";
import { FooterNewsletterForm } from "@/components/features/FooterNewsletterForm";

const categories = [
  { label: "Sarees", href: "/shop?category=Sarees" },
  { label: "Lehengas", href: "/shop?category=Lehengas" },
  { label: "Kurtas", href: "/shop?category=Kurtas" },
  { label: "Shop all", href: "/shop" }
];

const about = [
  { label: "About us", href: "/about" },
  { label: "Brand ethos", href: "/about#ethos" },
  { label: "Craftsmanship", href: "/about#craft" }
];

const support = [
  { label: "Contact", href: "/support/contact" },
  { label: "FAQs", href: "/support/faqs" },
  { label: "Returns & exchanges", href: "/support/returns" },
  { label: "Shipping", href: "/support/shipping" }
];

const legal = [
  { label: "Terms", href: "/legal/terms" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Refunds", href: "/legal/refund" },
  { label: "Cookies", href: "/legal/cookies" }
];

export function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-200">
      <div className="section-shell grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <h3 className="font-[family-name:var(--font-heading)] text-lg font-semibold tracking-[0.15em] text-white">
            MAGENTA CROWN
          </h3>
          <p className="mt-3 max-w-sm text-sm text-zinc-400">
            Luxury occasionwear and modern festive silhouettes designed for statement moments.
          </p>
          <div className="mt-6 flex gap-4 text-xs uppercase tracking-[0.2em] text-zinc-500">
            <a href="https://instagram.com" className="hover:text-white" target="_blank" rel="noreferrer">
              Instagram
            </a>
            <a href="https://facebook.com" className="hover:text-white" target="_blank" rel="noreferrer">
              Facebook
            </a>
            <a href="https://pinterest.com" className="hover:text-white" target="_blank" rel="noreferrer">
              Pinterest
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">Categories</h4>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            {categories.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">About</h4>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            {about.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">Support</h4>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            {support.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
          <h4 className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">Legal</h4>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            {legal.map((c) => (
              <li key={c.href}>
                <Link href={c.href} className="hover:text-white">
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-zinc-800">
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
