import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canMutateAdminOrders } from "@/lib/admin-permissions";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";

function csvCell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !canMutateAdminOrders(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseServiceRoleClient();
  const { data: rows, error } = await (supabase.from("Order") as any)
    .select(
      "id,publicOrderRef,orderStatus,paymentStatus,returnStatus,totalAmount,paymentMethod,createdAt,user:User(email,name),guestEmail"
    )
    .order("createdAt", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const header = [
    "publicOrderRef",
    "orderStatus",
    "paymentStatus",
    "returnStatus",
    "totalAmount",
    "paymentMethod",
    "createdAt",
    "customerEmail"
  ];
  const lines = [header.join(",")];
  for (const o of (rows ?? []) as Array<{
    publicOrderRef: string | null;
    orderStatus: string;
    paymentStatus: string;
    returnStatus: string;
    totalAmount: number;
    paymentMethod: string | null;
    createdAt: string;
    user: { email: string | null; name: string | null } | null;
    guestEmail: string | null;
  }>) {
    const email = o.user?.email ?? o.guestEmail ?? "";
    lines.push(
      [
        csvCell(o.publicOrderRef),
        csvCell(o.orderStatus),
        csvCell(o.paymentStatus),
        csvCell(o.returnStatus),
        csvCell(o.totalAmount),
        csvCell(o.paymentMethod),
        csvCell(o.createdAt),
        csvCell(email)
      ].join(",")
    );
  }

  const body = lines.join("\r\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-export-${new Date().toISOString().slice(0, 10)}.csv"`
    }
  });
}
