import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Magenta Crown order — shipping and payment.",
  robots: { index: false, follow: true }
};

type PageProps = { searchParams: Promise<{ pm?: string }> };

export default async function CheckoutPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const pm = sp.pm?.trim();
  return <CheckoutClient defaultPaymentMethod={pm} />;
}
