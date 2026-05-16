/** Canonical order / payment domain (matches DB CHECK constraints + app). */

export const ORDER_STATUSES = [
  "ORDER_PLACED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED"
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const RETURN_STATUSES = [
  "NONE",
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PICKED_UP",
  "RETURNED",
  "REFUNDED"
] as const;
export type ReturnStatus = (typeof RETURN_STATUSES)[number];

export const EXCHANGE_STATUSES = ["NONE", "REQUESTED", "APPROVED", "REJECTED", "PICKED_UP", "EXCHANGED"] as const;
export type ExchangeStatus = (typeof EXCHANGE_STATUSES)[number];

/** Stored on Order.paymentMethod */
export const PAYMENT_METHODS = ["COD", "RAZORPAY", "UPI", "CARD"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const LEGACY_PAYMENT = new Set(["CASH_ON_DELIVERY", "COD"]);

export function isOrderStatus(v: string | null | undefined): v is OrderStatus {
  return !!v && (ORDER_STATUSES as readonly string[]).includes(v);
}

export function isPaymentStatus(v: string | null | undefined): v is PaymentStatus {
  return !!v && (PAYMENT_STATUSES as readonly string[]).includes(v);
}

export function isReturnStatus(v: string | null | undefined): v is ReturnStatus {
  return !!v && (RETURN_STATUSES as readonly string[]).includes(v);
}

export function isExchangeStatus(v: string | null | undefined): v is ExchangeStatus {
  return !!v && (EXCHANGE_STATUSES as readonly string[]).includes(v);
}

/** Accept legacy client payloads; normalize for DB + display. */
export function normalizeCheckoutPaymentMethod(raw: string | null | undefined): PaymentMethod {
  const s = String(raw ?? "COD").trim().toUpperCase();
  if (s === "CASH_ON_DELIVERY" || s === "COD") return "COD";
  if (s === "UPI") return "UPI";
  if (s === "RAZORPAY") return "RAZORPAY";
  if (s === "CARD") return "CARD";
  return "COD";
}

export function displayPaymentMethod(pm: string | null | undefined): string {
  if (!pm) return "—";
  if (pm === "COD" || LEGACY_PAYMENT.has(pm)) return "Cash on delivery";
  if (pm === "UPI") return "UPI";
  if (pm === "RAZORPAY") return "Razorpay";
  if (pm === "CARD") return "Card";
  return pm.replace(/_/g, " ");
}

/** Fulfillment steps for customer timeline (subset + labels). */
export const FULFILLMENT_STEPS: { key: OrderStatus; label: string }[] = [
  { key: "ORDER_PLACED", label: "Order placed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" }
];

export function fulfillmentStepIndex(orderStatus: OrderStatus): number {
  if (orderStatus === "CANCELLED") return -1;
  const i = FULFILLMENT_STEPS.findIndex((s) => s.key === orderStatus);
  if (i >= 0) return i;
  const rank: Partial<Record<OrderStatus, number>> = {
    ORDER_PLACED: 0,
    PROCESSING: 1,
    SHIPPED: 2,
    OUT_FOR_DELIVERY: 3,
    DELIVERED: 4
  };
  return rank[orderStatus] ?? 0;
}
