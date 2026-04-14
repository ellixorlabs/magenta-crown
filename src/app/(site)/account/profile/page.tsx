import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProfileFormClient } from "@/components/account/ProfileFormClient";

export const metadata = { title: "Profile | Magenta Crown" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/account/profile");
  }

  return (
    <div>
      <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold text-zinc-900">Profile</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Keep your details and saved addresses up to date for a smoother checkout.
      </p>

      <div className="mt-8">
        <ProfileFormClient />
      </div>

      <section className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Payment methods</h2>
        <p className="mt-2 text-sm text-zinc-700">
          Cards and UPI are handled at checkout by your payment provider — we never store full card numbers.
        </p>
      </section>

      <p className="mt-8 text-sm">
        <Link href="/api/auth/signout" className="text-crown-800 underline">
          Log out
        </Link>
      </p>
    </div>
  );
}
