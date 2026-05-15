import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isStaffRole } from "@/lib/admin-permissions";
import { normVariantPart } from "@/lib/cart-line";
import { normalizeCouponCode, isValidCouponCodeFormat } from "@/lib/coupon";
import {
  mergeSavedAddresses,
  parseSavedAddresses,
  shippingToSavedAddress,
  type SaveAddressPayload,
  type ShippingPayload
} from "@/lib/checkout-address";
import { getSupabaseServiceRoleClient } from "@/lib/supabase-admin";
import { DEFAULT_COLOR, DEFAULT_SIZE } from "@/lib/product-variants";
import { randomId } from "@/lib/random-id";

type Line = {
  productId: string;
  quantity: number;
  price: number;
  size?: string | null;
  color?: string | null;
  variantId?: string | null;
};

type VariantRow = {
  id: string;
  productId: string;
  size: string;
  color: string;
  stock: number;
  isActive: boolean;
};

function isPlaceholderSingleSku(v: { color: string; size: string }) {
  const c = normVariantPart(v.color);
  const s = normVariantPart(v.size);
  return (c === "" || c === DEFAULT_COLOR) && (s === "" || s === DEFAULT_SIZE);
}

const ORDER_REF_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomOrderRefSuffix(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ORDER_REF_CHARSET[Math.floor(Math.random() * ORDER_REF_CHARSET.length)]!;
  return s;
}

async function allocatePublicOrderRef() {
  const supabase = getSupabaseServiceRoleClient();
  for (let attempt = 0; attempt < 24; attempt++) {
    const ref = `#MC${randomOrderRefSuffix(8)}`;
    const clash = await supabase.from("Order").select("id").eq("publicOrderRef", ref).maybeSingle();
    if (!clash.data) return ref;
  }
  throw new Error("ORDER_REF_ALLOCATION_FAILED");
}

async function resolveVariant(line: Line) {
  const supabase = getSupabaseServiceRoleClient();
  if (line.variantId) {
    const direct = await supabase
      .from("ProductVariant")
      .select("id,productId,size,color,stock,isActive")
      .eq("id", line.variantId)
      .eq("productId", line.productId)
      .maybeSingle();
    const v = direct.data as VariantRow | null;
    if (v?.isActive) return { variant: v, size: normVariantPart(v.size), color: normVariantPart(v.color) };
  }

  const size = normVariantPart(line.size);
  const color = normVariantPart(line.color);
  const exact = await supabase
    .from("ProductVariant")
    .select("id,productId,size,color,stock,isActive")
    .eq("productId", line.productId)
    .eq("size", size)
    .eq("color", color)
    .maybeSingle();
  let variant = exact.data as VariantRow | null;
  if (!variant) {
    const all = await supabase
      .from("ProductVariant")
      .select("id,productId,size,color,stock,isActive")
      .eq("productId", line.productId);
    const rows = (all.data as VariantRow[] | null) ?? [];
    if (rows.length === 1 && isPlaceholderSingleSku(rows[0]!)) variant = rows[0]!;
  }
  return { variant, size, color };
}

async function saveAddressIfRequested(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  userId: string,
  savePayload: SaveAddressPayload | null,
  shippingPayload: ShippingPayload
) {
  if (!savePayload?.kind) return;
  try {
    const incoming = shippingToSavedAddress(shippingPayload, savePayload);
    const userResult = await supabase.from("User").select("addresses").eq("id", userId).maybeSingle();
    const existing = parseSavedAddresses((userResult.data as { addresses?: unknown } | null)?.addresses);
    const merged = mergeSavedAddresses(existing, incoming);
    const addressUpdate = await (supabase.from("User") as any).update({ addresses: merged as unknown }).eq("id", userId);
    if (addressUpdate.error) throw new Error(`ADDRESS_UPDATE_FAILED:${addressUpdate.error.message}`);
  } catch (e) {
    if ((e as Error).message === "OTHER_LABEL_REQUIRED") throw new Error("OTHER_LABEL_REQUIRED");
    throw e;
  }
}

async function syncUserCheckoutProfile(
  supabase: ReturnType<typeof getSupabaseServiceRoleClient>,
  userId: string,
  shippingPayload: ShippingPayload
) {
  const data: Record<string, unknown> = {
    phone: shippingPayload.phone.trim() || null
  };
  if (shippingPayload.fullName.trim()) data.name = shippingPayload.fullName.trim();
  if (shippingPayload.email.trim()) data.email = shippingPayload.email.trim().toLowerCase();
  const updated = await (supabase.from("User") as any).update(data).eq("id", userId);
  if (updated.error) throw new Error(`USER_PROFILE_SYNC_FAILED:${updated.error.message}`);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      items: Line[];
      shippingAddress?: Record<string, unknown>;
      paymentMethod?: string;
      couponCode?: string | null;
      addressSource?: "saved" | "new";
      saveAddress?: SaveAddressPayload;
    };
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "Sign in to complete checkout." }, { status: 401 });
    if (isStaffRole(session.user.role)) {
      return NextResponse.json({ error: "Staff accounts cannot place orders." }, { status: 403 });
    }

    const items = body.items ?? [];
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

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

    const paymentMethodRaw = String(body.paymentMethod ?? "CASH_ON_DELIVERY").trim();
    if (paymentMethodRaw !== "CASH_ON_DELIVERY" && paymentMethodRaw !== "UPI") {
      return NextResponse.json({ error: "Choose either cash on delivery or UPI." }, { status: 400 });
    }
    const paymentMethod = paymentMethodRaw;
    const isCod = paymentMethod === "CASH_ON_DELIVERY";
    const orderStatus = "PENDING";

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
        customLabel: saveRaw.customLabel != null ? String(saveRaw.customLabel) : undefined
      };
      if (savePayload.kind === "other" && !String(savePayload.customLabel ?? "").trim()) {
        return NextResponse.json({ error: "Please enter a name for this address." }, { status: 400 });
      }
    }

    const couponInput = body.couponCode?.trim() || "";
    const normalizedCoupon = couponInput ? normalizeCouponCode(couponInput) : "";
    const supabase = getSupabaseServiceRoleClient();
    const productIds = [...new Set(items.map((l) => l.productId))];
    const productsResult = await supabase
      .from("Product")
      .select("id,mrp,discountedPrice,styleCode")
      .in("id", productIds);
    const products =
      (productsResult.data as Array<{
        id: string;
        mrp: number;
        discountedPrice: number | null;
        styleCode: string | null;
      }> | null) ?? [];
    const productMap = new Map(products.map((p) => [p.id, p]));
    if (productMap.size !== productIds.length) throw new Error("PRODUCT_NOT_FOUND");

    let subtotalBeforeDiscount = 0;
    for (const line of items) {
      const p = productMap.get(line.productId)!;
      subtotalBeforeDiscount += (p.discountedPrice ?? p.mrp) * line.quantity;
    }
    subtotalBeforeDiscount = Math.round(subtotalBeforeDiscount * 100) / 100;

    let discountAmount = 0;
    let couponId: string | null = null;
    let couponCodeStored: string | null = null;
    if (normalizedCoupon) {
      if (!isValidCouponCodeFormat(normalizedCoupon)) throw new Error("COUPON_INVALID");
      const couponResult = await supabase
        .from("Coupon")
        .select("id,code,discountPct")
        .eq("code", normalizedCoupon)
        .eq("isActive", true)
        .maybeSingle();
      const coupon = couponResult.data as { id: string; code: string; discountPct: number } | null;
      if (!coupon) throw new Error("COUPON_INVALID");
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
    const resolved = await Promise.all(items.map((line) => resolveVariant(line)));
    for (let i = 0; i < items.length; i++) {
      const line = items[i]!;
      const variant = resolved[i]!.variant;
      if (!variant) throw new Error(`VARIANT:${line.productId}:${resolved[i]!.size}:${resolved[i]!.color}`);
      if (!variant.isActive) throw new Error(`VARIANT:${line.productId}`);
      if (variant.stock < line.quantity) throw new Error(`STOCK:${line.productId}`);
    }

    const shippingAddressJson = { ...addr, fullName, email, phone, street, city, pincode };

    /**
     * UPI creates an order before Razorpay opens; each abandoned payment left a new PENDING row.
     * Reuse the latest pending UPI checkout for this user (same publicOrderRef, refresh lines/totals).
     */
    if (!isCod) {
      const { data: pendingRows, error: pendingErr } = await (supabase.from("Order") as any)
        .select("id,publicOrderRef")
        .eq("userId", session.user.id)
        .eq("paymentMethod", "UPI")
        .eq("status", "PENDING")
        .order("createdAt", { ascending: false });
      if (pendingErr) throw new Error(pendingErr.message);

      const pending = (pendingRows ?? []) as Array<{ id: string; publicOrderRef: string | null }>;
      if (pending.length > 0) {
        const [keep, ...olderPending] = pending;
        for (const row of olderPending) {
          const delItems = await (supabase.from("OrderItem") as any).delete().eq("orderId", row.id);
          if (delItems.error) throw new Error(delItems.error.message);
          const delOrd = await (supabase.from("Order") as any).delete().eq("id", row.id);
          if (delOrd.error) throw new Error(delOrd.error.message);
        }

        const orderUpdate = await (supabase
          .from("Order") as any)
          .update({
            shippingAddress: shippingAddressJson,
            subtotalBeforeDiscount,
            discountAmount,
            totalAmount,
            paymentMethod,
            status: orderStatus,
            couponCode: couponCodeStored,
            couponId,
            trackingUrl: "https://example.com/track"
          })
          .eq("id", keep.id)
          .select("id,publicOrderRef")
          .single();
        if (orderUpdate.error || !orderUpdate.data) {
          throw new Error(orderUpdate.error?.message ?? "ORDER_UPDATE_FAILED");
        }

        const cleared = await (supabase.from("OrderItem") as any).delete().eq("orderId", keep.id);
        if (cleared.error) throw new Error(cleared.error.message);

        const orderItemsInsert = await (supabase.from("OrderItem") as any).insert(
          items.map((line, i) => {
            const sc = (productMap.get(line.productId)?.styleCode ?? "").trim();
            return {
              id: randomId(),
              orderId: keep.id,
              productId: line.productId,
              quantity: line.quantity,
              price: unitPriceForLine(line),
              size: resolved[i]!.size || null,
              color: resolved[i]!.color || null,
              variantId: resolved[i]!.variant!.id,
              styleCode: sc || null
            };
          })
        );
        if (orderItemsInsert.error) throw new Error(`ORDER_ITEMS_CREATE_FAILED:${orderItemsInsert.error.message}`);

        await syncUserCheckoutProfile(supabase, session.user.id, shippingPayload);
        await saveAddressIfRequested(supabase, session.user.id, savePayload, shippingPayload);

        const created = orderUpdate.data as { id: string; publicOrderRef: string | null };
        return NextResponse.json({
          publicOrderRef: created.publicOrderRef ?? null,
          requiresOnlinePayment: true
        });
      }
    }

    // Temporary conservative multi-step flow replacing transaction semantics.
    const publicOrderRef = await allocatePublicOrderRef();
    const orderInsert = await (supabase
      .from("Order") as any)
      .insert({
        id: randomId(),
        publicOrderRef,
        userId: session.user.id,
        guestEmail: null,
        shippingAddress: shippingAddressJson,
        subtotalBeforeDiscount,
        discountAmount,
        totalAmount,
        paymentMethod,
        status: orderStatus,
        couponCode: couponCodeStored,
        couponId,
        trackingUrl: isCod ? null : "https://example.com/track"
      })
      .select("id,publicOrderRef")
      .single();
    const created = orderInsert.data as { id: string; publicOrderRef: string | null } | null;
    if (orderInsert.error || !created) throw new Error(orderInsert.error?.message ?? "ORDER_CREATE_FAILED");

    const orderItemsInsert = await (supabase.from("OrderItem") as any).insert(
      items.map((line, i) => {
        const sc = (productMap.get(line.productId)?.styleCode ?? "").trim();
        return {
          id: randomId(),
          orderId: created.id,
          productId: line.productId,
          quantity: line.quantity,
          price: unitPriceForLine(line),
          size: resolved[i]!.size || null,
          color: resolved[i]!.color || null,
          variantId: resolved[i]!.variant!.id,
          styleCode: sc || null
        };
      })
    );
    if (orderItemsInsert.error) throw new Error(`ORDER_ITEMS_CREATE_FAILED:${orderItemsInsert.error.message}`);

    // For online payment flows, finalize stock only after payment verification succeeds.
    if (isCod) {
      for (let i = 0; i < items.length; i++) {
        const line = items[i]!;
        const variant = resolved[i]!.variant!;
        const stockUpdate = await (supabase
          .from("ProductVariant") as any)
          .update({ stock: Math.max(0, variant.stock - line.quantity) })
          .eq("id", variant.id);
        if (stockUpdate.error) throw new Error(`STOCK_UPDATE_FAILED:${stockUpdate.error.message}`);
      }
    }

    await syncUserCheckoutProfile(supabase, session.user.id, shippingPayload);
    await saveAddressIfRequested(supabase, session.user.id, savePayload, shippingPayload);

    return NextResponse.json({
      publicOrderRef: created.publicOrderRef ?? null,
      requiresOnlinePayment: !isCod
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "COUPON_INVALID") {
      return NextResponse.json(
        { error: "Invalid or inactive coupon code. Check spelling (letters and numbers only)." },
        { status: 400 }
      );
    }
    if (msg === "PRODUCT_NOT_FOUND") return NextResponse.json({ error: "One or more products are no longer available." }, { status: 400 });
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
    if (msg === "OTHER_LABEL_REQUIRED") return NextResponse.json({ error: "Please enter a name for this address." }, { status: 400 });
    console.error("[checkout] create order failed");
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
