import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Magenta Crown account to manage orders and your wishlist.",
  robots: { index: false, follow: true }
};

export default function SignInLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
