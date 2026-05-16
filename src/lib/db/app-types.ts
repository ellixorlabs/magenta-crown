export type AppRole = "ADMIN" | "SUB_ADMIN" | "CUSTOMER" | "TECH_SUPPORT";

export type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  image: string | null;
  role: AppRole;
  age: number | null;
  phone: string | null;
  onboardingComplete: boolean;
  deletionScheduledFor: string | Date | null;
  lastLoginAt: string | Date | null;
};

export type HeaderNavLinkRow = {
  id: string;
  group: string | null;
  label: string;
  href: string;
  sortOrder: number;
  isActive: boolean;
};

export type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  mrp: number;
  discountedPrice: number | null;
  category: string;
  tags: string[];
  /** Internal SKU / rack code for warehouse lookup (shown on PDP and order lines). */
  styleCode: string | null;
  material: string | null;
  occasion: string | null;
  imageUrls: string[];
  listImageIndex: number;
  listImagePosition: string;
  /** Extra tokens indexed for search (comma / newline). */
  searchKeywords?: string | null;
  /** Alternate spellings / phrases (comma / newline). */
  searchSynonyms?: string | null;
  newTagExpiresAt: string | Date | null;
  sizeChartImageUrl: string | null;
  /** When false, PDP hides the size guide even if a chart image URL exists. Omitted = show (DB default true). */
  showSizeChart?: boolean;
  codEnabled: boolean;
  prepaidOfferText: string | null;
  pricingFootnote: string | null;
  status?: "ACTIVE" | "DRAFT" | "SOLD_OUT" | "ARCHIVED";
  returnable?: boolean;
  exchangeable?: boolean;
  returnWindowDays?: number;
};

export type ProductVariantRow = {
  id: string;
  productId: string;
  color: string;
  size: string;
  stock: number;
  isActive: boolean;
};

export type CouponRow = {
  id: string;
  code: string;
  discountPct: number;
  isActive: boolean;
};
