import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Magenta Crown account to save addresses, track orders, and use your wishlist.",
  robots: { index: false, follow: true }
};

export default function SignUpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
