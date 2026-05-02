import Link from "next/link";
import { auth } from "@/auth";
import { OrdersAccountList } from "@/components/account/OrdersAccountList";
import { AccountSessionRecover } from "@/components/account/AccountSessionRecover";
import { EmptyState } from "@/components/empty/EmptyState";
import { type AccountOrderFilter, isStalePendingUpi } from "@/lib/account-orders";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import type { NextAppPageSearch } from "@/types/next-app";

export const metadata = {
  title: "Orders",
  description: "View order history and status for your Magenta Crown purchases.",
  robots: { index: false, follow: true }
};

const FILTER_IDS: AccountOrderFilter[] = ["all", "processing", "shipped", "delivered", "returns"];

type PageProps = NextAppPageSearch<{ filter?: string }>;

export default async function OrdersPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return <AccountSessionRecover callbackPath="/account/orders" />;
  }

  const sp = await searchParams;
  const raw = (sp.filter ?? "all").toLowerCase();
  const activeFilter: AccountOrderFilter = FILTER_IDS.includes(raw as AccountOrderFilter)
    ? (raw as AccountOrderFilter)
    : "all";

  const supabase = getSupabaseServiceRoleClient();
  const { data: orders, error } = await (supabase.from("Order") as any)
    .select(
      "id,publicOrderRef,status,paymentMethod,createdAt,totalAmount,trackingUrl,items:OrderItem(id,quantity,product:Product(name,imageUrls,listImageIndex))"
    )
    .eq("userId", session.user.id)
    .order("createdAt", { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (orders ?? []) as any[];
  const visible = rows.filter((o) => !isStalePendingUpi(o));

  if (rows.length > 0 && visible.length === 0) {
    return (
      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              My orders
            </h1>
            <p className="mt-1 text-sm text-zinc-600">Track shipments and manage returns.</p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 self-start text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline sm:self-auto"
          >
            <span aria-hidden className="text-lg leading-none">
              ←
            </span>
            Continue shopping
          </Link>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="font-[family-name:var(--font-heading)] text-lg font-semibold text-zinc-900">
            No active orders in your account
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Older unpaid checkout attempts are no longer shown here after 7 days. Place a new order anytime.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex rounded-full bg-crown-800 px-6 py-3 text-sm font-semibold text-white hover:bg-crown-900"
          >
            Shop collections
          </Link>
        </div>
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-zinc-950 sm:text-3xl">
              My orders
            </h1>
            <p className="mt-1 text-sm text-zinc-600">Track shipments and manage returns.</p>
          </div>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 self-start text-sm font-medium text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline sm:self-auto"
          >
            <span aria-hidden className="text-lg leading-none">
              ←
            </span>
            Continue shopping
          </Link>
        </div>
        <div className="mt-8">
          <EmptyState
            title="No orders yet"
            description="When you place an order, it will show up here with status and tracking."
            actionHref="/shop"
            actionLabel="Start shopping"
            secondaryHref="/account/profile"
            secondaryLabel="Go to profile"
          />
        </div>
      </div>
    );
  }

  return <OrdersAccountList orders={visible} activeFilter={activeFilter} />;
}
