import type { Prisma } from "@prisma/client";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomSuffix(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += CHARSET[Math.floor(Math.random() * CHARSET.length)]!;
  }
  return s;
}

/**
 * Unique customer-facing order reference, e.g. `#MC8K2PQ9N` (no 0/O/1/I).
 * Allocated inside the same DB transaction as `order.create`.
 */
export async function allocatePublicOrderRef(tx: Prisma.TransactionClient): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const ref = `#MC${randomSuffix(8)}`;
    const clash = await tx.order.findFirst({ where: { publicOrderRef: ref }, select: { id: true } });
    if (!clash) return ref;
  }
  throw new Error("ORDER_REF_ALLOCATION_FAILED");
}
