import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ProductEditForm } from "./ProductEditForm";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  await requireStaff("/admin/inventory");

  const { id } = await params;
  const [product, coupons] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { variants: true, featuredCoupons: { select: { couponId: true } } }
    }),
    prisma.coupon.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, discountPct: true, isActive: true }
    })
  ]);
  if (!product) {
    notFound();
  }

  return (
    <div>
      <Link href="/admin/inventory" className="text-sm text-crown-800 underline">
        ← Back to inventory
      </Link>
      <h2 className="mt-4 text-xl font-semibold text-zinc-900">Edit product</h2>
      <ProductEditForm product={product} coupons={coupons} />
    </div>
  );
}
