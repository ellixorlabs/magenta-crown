export const BRAND_CONTENT_CACHE_TAG = "brand-content-v1";

export type BrandSectionKey =
  | "about_intro"
  | "about_vision"
  | "about_mission"
  | "about_values"
  | "about_founder"
  | "about_craftsmanship"
  | "about_sustainability"
  | "about_closing"
  | "support_info"
  | "faq"
  | "footer"
  | "legal_terms"
  | "legal_privacy"
  | "legal_cookies"
  | "returns_policy";

export type FaqEntry = { id: string; question: string; answer: string };

export type SupportInfoJson = {
  email: string;
  phone: string;
  whatsapp: string;
  whatsappUrl: string;
  hoursTitle: string;
  hoursBody: string;
  note: string;
};

export type FooterJson = {
  tagline: string;
  instagramUrl: string;
  facebookUrl: string;
  pinterestUrl: string;
  aboutLinks: Array<{ label: string; href: string }>;
  supportLinks: Array<{ label: string; href: string }>;
  legalLinks: Array<{ label: string; href: string }>;
};

export type BrandContentRow = {
  id: string;
  sectionKey: BrandSectionKey;
  title: string | null;
  content: string | null;
  jsonData: unknown;
  updatedAt: string;
};

export const BRAND_CONTENT_DEFAULTS: Record<
  BrandSectionKey,
  { title: string; content: string; jsonData?: unknown }
> = {
  about_intro: {
    title: "The Story Behind Magenta Crown",
    content:
      "Magenta Crown was founded to bridge heirloom craft and contemporary silhouettes for the modern Indian woman. We design occasionwear that feels personal, not predictable—timeless fabrics, modern lines, and finishing that stays elegant across seasons."
  },
  about_vision: {
    title: "Brand Vision",
    content:
      "To be the house women trust for occasionwear that feels personal, not predictable."
  },
  about_mission: {
    title: "Brand Mission",
    content:
      "To partner with ethical ateliers, invest in artisan wages, and deliver couture-grade finishing at a considered pace."
  },
  about_values: {
    title: "Brand Values",
    content:
      "Integrity, craft, inclusion, and transparency—from loom to doorstep. We believe luxury is not excess, but intention."
  },
  about_founder: {
    title: "Founder Story",
    content:
      "Our founder grew up between ateliers and archives—learning that luxury is not excess, but intention. Magenta Crown is that promise made wearable."
  },
  about_craftsmanship: {
    title: "Craftsmanship",
    content:
      "We work with master embroiderers and pattern-makers across India. Every piece passes multiple fittings, hand-finishing, and quality checks before it reaches you."
  },
  about_sustainability: {
    title: "Sustainability",
    content:
      "Small-batch production, fair wages, and mindful packaging are non-negotiable. We publish annual impact notes as we deepen partnerships with women-led cooperatives."
  },
  about_closing: {
    title: "Magenta Crown — Hand-crafted to stand out.",
    content: ""
  },
  support_info: {
    title: "Customer care",
    content: "",
    jsonData: {
      email: "admin@magentacrown.com",
      phone: "+91 80 1234 5678",
      whatsapp: "+91 80 1234 5678",
      whatsappUrl: "https://wa.me/918012345678",
      hoursTitle: "Support hours",
      hoursBody: "Monday to Saturday · 10:00 AM to 7:00 PM (IST)",
      note: "Include your order ID for faster help on shipping, returns, exchange sizing, and payment support."
    } satisfies SupportInfoJson
  },
  faq: {
    title: "Frequently asked questions",
    content: "",
    jsonData: [
      {
        id: "ship",
        question: "How long does shipping take?",
        answer:
          "Domestic orders ship within 5–7 business days. Express options appear at checkout when available."
      },
      {
        id: "returns",
        question: "What is your returns policy?",
        answer:
          "Unworn pieces with tags intact may be exchanged within 14 days. Sale items may be final—see our returns page."
      },
      {
        id: "sizing",
        question: "How do I choose a size?",
        answer:
          "Each product page lists a fit note. When in doubt, choose the larger size for lehengas with corsetry; our stylists can guide you via WhatsApp."
      },
      {
        id: "pay",
        question: "Which payment methods do you accept?",
        answer: "We accept UPI, cards, netbanking, COD on eligible orders, and Razorpay at checkout."
      }
    ] satisfies FaqEntry[]
  },
  footer: {
    title: "Footer",
    content: "",
    jsonData: {
      tagline: "Luxury occasionwear and modern festive silhouettes designed for statement moments.",
      instagramUrl: "https://instagram.com",
      facebookUrl: "https://facebook.com",
      pinterestUrl: "https://pinterest.com",
      aboutLinks: [
        { label: "Our story", href: "/about" },
        { label: "Brand vision", href: "/about#vision" },
        { label: "Craftsmanship", href: "/about#craft" }
      ],
      supportLinks: [
        { label: "Contact", href: "/support" },
        { label: "FAQs", href: "/faqs" },
        { label: "Returns", href: "/returns" },
        { label: "Shipping", href: "/support/shipping" }
      ],
      legalLinks: [
        { label: "Terms", href: "/legal/terms" },
        { label: "Privacy", href: "/legal/privacy" },
        { label: "Cookies", href: "/legal/cookies" }
      ]
    } satisfies FooterJson
  },
  legal_terms: {
    title: "Terms & conditions",
    content:
      "By using this website you agree to our policies, including shipping, returns, and acceptable use. Product imagery is representative; slight artisan variation is normal.\n\nOrders are subject to availability. We reserve the right to refuse or cancel orders at our discretion where fraud or stock errors occur."
  },
  legal_privacy: {
    title: "Privacy policy",
    content:
      "We collect information you provide at checkout and when you contact us—name, email, phone, and shipping address—to fulfil orders and support you.\n\nWe do not sell your personal data. Payment processing is handled by certified partners. You may request deletion of your account data subject to legal retention requirements."
  },
  legal_cookies: {
    title: "Cookie policy",
    content:
      "We use essential cookies for sign-in, cart, and checkout. Analytics cookies, if enabled, help us understand how the boutique is used.\n\nYou can control cookies in your browser settings; disabling essential cookies may limit checkout."
  },
  returns_policy: {
    title: "Returns & exchanges",
    content:
      "We accept exchanges on eligible full-price items within 14 days of delivery. Items must be unworn, with tags and packaging intact. Made-to-order pieces may be non-returnable—stated on the product page.\n\nTo initiate, email admin@magentacrown.com with your order ID and reason."
  }
};

export function parseSupportInfo(json: unknown): SupportInfoJson {
  const d = BRAND_CONTENT_DEFAULTS.support_info.jsonData as SupportInfoJson;
  if (!json || typeof json !== "object") return d;
  const o = json as Partial<SupportInfoJson>;
  return {
    email: String(o.email ?? d.email),
    phone: String(o.phone ?? d.phone),
    whatsapp: String(o.whatsapp ?? d.whatsapp),
    whatsappUrl: String(o.whatsappUrl ?? d.whatsappUrl),
    hoursTitle: String(o.hoursTitle ?? d.hoursTitle),
    hoursBody: String(o.hoursBody ?? d.hoursBody),
    note: String(o.note ?? d.note)
  };
}

export function parseFooterJson(json: unknown): FooterJson {
  const d = BRAND_CONTENT_DEFAULTS.footer.jsonData as FooterJson;
  if (!json || typeof json !== "object") return d;
  const o = json as Partial<FooterJson>;
  return {
    tagline: String(o.tagline ?? d.tagline),
    instagramUrl: String(o.instagramUrl ?? d.instagramUrl),
    facebookUrl: String(o.facebookUrl ?? d.facebookUrl),
    pinterestUrl: String(o.pinterestUrl ?? d.pinterestUrl),
    aboutLinks: Array.isArray(o.aboutLinks) ? (o.aboutLinks as FooterJson["aboutLinks"]) : d.aboutLinks,
    supportLinks: Array.isArray(o.supportLinks) ? (o.supportLinks as FooterJson["supportLinks"]) : d.supportLinks,
    legalLinks: Array.isArray(o.legalLinks) ? (o.legalLinks as FooterJson["legalLinks"]) : d.legalLinks
  };
}

export function parseFaqEntries(json: unknown): FaqEntry[] {
  const d = BRAND_CONTENT_DEFAULTS.faq.jsonData as FaqEntry[];
  if (!Array.isArray(json)) return d;
  return json
    .map((x) => {
      if (!x || typeof x !== "object") return null;
      const e = x as Partial<FaqEntry>;
      const question = String(e.question ?? "").trim();
      const answer = String(e.answer ?? "").trim();
      if (!question) return null;
      return {
        id: String(e.id ?? question.slice(0, 24)),
        question,
        answer
      };
    })
    .filter(Boolean) as FaqEntry[];
}

/** Split stored content into paragraphs for legal/editorial pages. */
export function contentParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
