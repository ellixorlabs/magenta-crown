/**
 * Ensures each product has at least one ProductVariant row (Default / One size, stock 0).
 * Safe to run multiple times (skips products that already have variants).
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_COLOR = "Default";
const DEFAULT_SIZE = "One size";

async function main() {
  const products = await prisma.product.findMany({
    select: { id: true }
  });
  for (const p of products) {
    const n = await prisma.productVariant.count({ where: { productId: p.id } });
    if (n === 0) {
      await prisma.productVariant.create({
        data: {
          productId: p.id,
          size: DEFAULT_SIZE,
          color: DEFAULT_COLOR,
          stock: 0,
          isActive: true
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
