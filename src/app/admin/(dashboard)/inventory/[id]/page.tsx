import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { isAdminRole } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { ProductEditForm } from "./ProductEditForm";

type PageProps = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: PageProps) {
  const session = await auth();
  if (!isAdminRole(session?.user?.role)) {
    redirect("/admin/inventory");
  }

  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: { variants: true }
  });
  if (!product) {
    notFound();
  }

  return (
    <div>
      <Link href="/admin/inventory" className="text-sm text-crown-800 underline">
        ← Back to inventory
      </Link>
      <h2 className="mt-4 text-xl font-semibold text-zinc-900">Edit product</h2>
      <ProductEditForm product={product} />
    </div>
  );
}
