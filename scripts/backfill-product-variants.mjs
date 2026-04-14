/**
 * One-time: ensure each product has at least one ProductVariant row (legacy stock on "", "").
 * Safe to run multiple times (skips products that already have variants).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true, stockQuantity: true }
  });
  for (const p of products) {
    const n = await prisma.productVariant.count({ where: { productId: p.id } });
    if (n === 0) {
      await prisma.productVariant.create({
        data: {
          productId: p.id,
          size: "",
          color: "",
          quantity: Math.max(0, p.stockQuantity)
        }
      });
      console.log("created default variant for", p.id);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
