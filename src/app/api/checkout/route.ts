import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normVariantPart } from "@/lib/cart-line";
import { normalizeCouponCode, isValidCouponCodeFormat } from "@/lib/coupon";
import {
  mergeSavedAddresses,
  parseSavedAddresses,
  shippingToSavedAddress,
  type SaveAddressPayload,
  type ShippingPayload
} from "@/lib/checkout-address";

type Line = {
  productId: string;
  quantity: number;
  price: number;
  size?: string | null;
  color?: string | null;
};

function isStaffRole(role: string | undefined) {
  return role === "ADMIN" || role === "SUB_ADMIN" || role === "TECH_SUPPORT";
}

async function syncProductStockFromVariants(tx: Prisma.TransactionClient, productId: string) {
  const agg = await tx.productVariant.aggregate({
    where: { productId },
    _sum: { quantity: true }
  });
  const sum = agg._sum.quantity ?? 0;
  await tx.product.update({
    where: { id: productId },
    data: { stockQuantity: Math.max(0, sum) }
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      items: Line[];
      shippingAddress?: Record<string, unknown>;
      paymentMethod?: string;
      couponCode?: string | null;
      /** Only when customer typed a new address at checkout. */
      addressSource?: "saved" | "new";
      saveAddress?: SaveAddressPayload;
    };

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Sign in to complete checkout." }, { status: 401 });
    }
    if (isStaffRole(session.user.role)) {
      return NextResponse.json({ error: "Staff accounts cannot place orders." }, { status: 403 });
    }

    const items = body.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const addr = body.shippingAddress ?? {};
    const fullName = String(addr.fullName ?? "").trim();
    const email = String(addr.email ?? "").trim();
    const phone = String(addr.phone ?? "").trim();
    const street = String(addr.street ?? "").trim();
    const city = String(addr.city ?? "").trim();
    const pincode = String(addr.pincode ?? "").trim();

    if (!fullName || !email || !phone || !street || !city || !pincode) {
      return NextResponse.json(
        { error: "Name, email, phone, and full address (street, city, PIN) are required." },
        { status: 400 }
      );
    }

    const shippingPayload: ShippingPayload = {
      fullName,
      email,
      phone,
      phoneCountryCode: addr.phoneCountryCode != null ? String(addr.phoneCountryCode) : undefined,
      phoneLocal: addr.phoneLocal != null ? String(addr.phoneLocal) : undefined,
      street,
      area: addr.area != null ? String(addr.area).trim() : undefined,
      town: addr.town != null ? String(addr.town).trim() : undefined,
      city,
      pincode,
      country: addr.country != null ? String(addr.country).trim() : undefined
    };

    const paymentMethod = body.paymentMethod ?? "CARD";
    const isCod = paymentMethod === "CASH_ON_DELIVERY";
    const orderStatus = isCod ? "PENDING" : "PAID";

    const addressSource = body.addressSource ?? "new";
    const saveRaw = body.saveAddress;
    const wantsSave =
      addressSource === "new" &&
      saveRaw &&
      typeof saveRaw === "object" &&
      (saveRaw.kind === "home" || saveRaw.kind === "work" || saveRaw.kind === "other");

    let savePayload: SaveAddressPayload | null = null;
    if (wantsSave) {
      savePayload = {
        kind: saveRaw.kind,
        customLabel: saveRaw.customLabel != null ? String(saveRaw.customLabel) : undefined,
        replaceHomeConfirmed: Boolean(saveRaw.replaceHomeConfirmed)
      };
      if (savePayload.kind === "other" && !String(savePayload.customLabel ?? "").trim()) {
        return NextResponse.json({ error: "Please enter a name for this address." }, { status: 400 });
      }
    }

    const couponInput = body.couponCode?.trim() || "";
    const normalizedCoupon = couponInput ? normalizeCouponCode(couponInput) : "";

    const order = await prisma.$transaction(async (tx) => {
      const productIds = [...new Set(items.map((l) => l.productId))];
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          mrp: true,
          discountedPrice: true
        }
      });
      const productMap = new Map(products.map((p) => [p.id, p]));
      if (productMap.size !== productIds.length) {
        throw new Error("PRODUCT_NOT_FOUND");
      }

      let subtotalBeforeDiscount = 0;
      for (const line of items) {
        const p = productMap.get(line.productId)!;
        const unit = p.discountedPrice ?? p.mrp;
        subtotalBeforeDiscount += unit * line.quantity;
      }
      subtotalBeforeDiscount = Math.round(subtotalBeforeDiscount * 100) / 100;

      let discountAmount = 0;
      let couponId: string | null = null;
      let couponCodeStored: string | null = null;

      if (normalizedCoupon) {
        if (!isValidCouponCodeFormat(normalizedCoupon)) {
          throw new Error("COUPON_INVALID");
        }
        const coupon = await tx.coupon.findFirst({
          where: { code: normalizedCoupon, isActive: true }
        });
        if (!coupon) {
          throw new Error("COUPON_INVALID");
        }
        discountAmount = Math.round(subtotalBeforeDiscount * (coupon.discountPct / 100) * 100) / 100;
        couponId = coupon.id;
        couponCodeStored = coupon.code;
      } else if (couponInput) {
        throw new Error("COUPON_INVALID");
      }

      const totalAmount = Math.round((subtotalBeforeDiscount - discountAmount) * 100) / 100;

      const unitPriceForLine = (line: Line) => {
        const p = productMap.get(line.productId)!;
        return p.discountedPrice ?? p.mrp;
      };

      async function resolveVariant(line: Line) {
        const size = normVariantPart(line.size);
        const color = normVariantPart(line.color);
        let variant = await tx.productVariant.findUnique({
          where: {
            productId_size_color: {
              productId: line.productId,
              size,
              color
            }
          }
        });
        if (!variant) {
          const rows = await tx.productVariant.findMany({
            where: { productId: line.productId },
            select: { id: true, productId: true, size: true, color: true, quantity: true }
          });
          if (
            rows.length === 1 &&
            normVariantPart(rows[0]!.size) === "" &&
            normVariantPart(rows[0]!.color) === ""
          ) {
            variant = rows[0]!;
          }
        }
        return { variant, size, color };
      }

      /** Stock is only reduced after the order row exists; verify availability first. */
      for (const line of items) {
        const { variant, size, color } = await resolveVariant(line);
        if (!variant) {
          throw new Error(`VARIANT:${line.productId}:${size}:${color}`);
        }
        if (variant.quantity < line.quantity) {
          throw new Error(`STOCK:${line.productId}`);
        }
      }

      const created = await tx.order.create({
        data: {
          userId: session.user!.id,
          guestEmail: null,
          shippingAddress: {
            ...addr,
            fullName,
            email,
            phone,
            street,
            city,
            pincode
          } as Prisma.InputJsonValue,
          subtotalBeforeDiscount,
          discountAmount,
          totalAmount,
          paymentMethod,
          status: orderStatus,
          couponCode: couponCodeStored,
          couponId,
          trackingUrl: isCod ? null : "https://example.com/track",
          items: {
            create: items.map((line) => ({
              productId: line.productId,
              quantity: line.quantity,
              price: unitPriceForLine(line),
              size: normVariantPart(line.size) || null,
              color: normVariantPart(line.color) || null
            }))
          }
        }
      });

      for (const line of items) {
        const { variant } = await resolveVariant(line);
        if (!variant) {
          throw new Error(`VARIANT:${line.productId}`);
        }
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { quantity: variant.quantity - line.quantity }
        });
        await syncProductStockFromVariants(tx, line.productId);
      }

      if (savePayload && savePayload.kind) {
        try {
          const incoming = shippingToSavedAddress(shippingPayload, savePayload);
          const user = await tx.user.findUnique({
            where: { id: session.user!.id },
            select: { addresses: true }
          });
          const existing = parseSavedAddresses(user?.addresses);
          const merged = mergeSavedAddresses(existing, incoming, {
            replaceHomeConfirmed: savePayload.replaceHomeConfirmed
          });
          await tx.user.update({
            where: { id: session.user!.id },
            data: { addresses: merged as unknown as Prisma.InputJsonValue }
          });
        } catch (e) {
          const code = (e as Error & { code?: string }).code;
          if (code === "HOME_EXISTS") {
            throw new Error("HOME_EXISTS");
          }
          if ((e as Error).message === "OTHER_LABEL_REQUIRED") {
            throw new Error("OTHER_LABEL_REQUIRED");
          }
          throw e;
        }
      }

      return created;
    });

    return NextResponse.json({ orderId: order.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "COUPON_INVALID") {
      return NextResponse.json(
        { error: "Invalid or inactive coupon code. Check spelling (letters and numbers only)." },
        { status: 400 }
      );
    }
    if (msg === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "One or more products are no longer available." }, { status: 400 });
    }
    if (msg.startsWith("VARIANT:")) {
      return NextResponse.json(
        { error: "One or more items are no longer available in that size/color. Refresh and try again." },
        { status: 409 }
      );
    }
    if (msg.startsWith("STOCK:")) {
      return NextResponse.json(
        { error: "Not enough stock for one or more items. Reduce quantity or remove the line." },
        { status: 409 }
      );
    }
    if (msg === "HOME_EXISTS") {
      return NextResponse.json(
        {
          error: "HOME_EXISTS",
          message: "A home address already exists. Confirm to replace it with this one."
        },
        { status: 409 }
      );
    }
    if (msg === "OTHER_LABEL_REQUIRED") {
      return NextResponse.json({ error: "Please enter a name for this address." }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
