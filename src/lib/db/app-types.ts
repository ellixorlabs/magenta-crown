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
  material: string | null;
  occasion: string | null;
  imageUrls: string[];
  listImageIndex: number;
  listImagePosition: string;
  newTagExpiresAt: string | Date | null;
  sizeChartImageUrl: string | null;
  codEnabled: boolean;
  prepaidOfferText: string | null;
  pricingFootnote: string | null;
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
