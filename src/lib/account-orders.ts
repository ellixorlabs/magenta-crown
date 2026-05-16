import type { OrderStatus, PaymentStatus } from "@/lib/order-domain";
import { isOrderStatus } from "@/lib/order-domain";

/** Hide unpaid UPI checkouts from account lists after this age (matches cancellation policy copy). */
export const STALE_PENDING_UPI_MS = 7 * 24 * 60 * 60 * 1000;

export type AccountOrderFilter = "all" | "processing" | "shipped" | "delivered" | "returns";

export type AccountOrderRow = {
  orderStatus?: string | null;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  createdAt: string | Date;
};

export function isStalePendingUpi(order: AccountOrderRow): boolean {
  const ps = order.paymentStatus;
  const pm = order.paymentMethod ?? "";
  const os = order.orderStatus ?? "";
  if (ps !== "PENDING") return false;
  if (pm !== "UPI") return false;
  if (os !== "ORDER_PLACED") return false;
  return Date.now() - new Date(order.createdAt).getTime() > STALE_PENDING_UPI_MS;
}

export function isPendingUpiPayment(order: AccountOrderRow): boolean {
  return (
    order.paymentStatus === "PENDING" &&
    order.paymentMethod === "UPI" &&
    (order.orderStatus === "ORDER_PLACED" || !order.orderStatus)
  );
}

export function matchesAccountOrderFilter(order: AccountOrderRow, filter: AccountOrderFilter): boolean {
  const os = (order.orderStatus ?? "").toUpperCase();
  const ps = (order.paymentStatus ?? "").toUpperCase();
  const pm = order.paymentMethod ?? "";
  switch (filter) {
    case "all":
      return true;
    case "processing":
      if (ps === "PENDING" && pm === "UPI") return false;
      return (
        os === "ORDER_PLACED" ||
        os === "PROCESSING" ||
        (ps === "PAID" && os !== "DELIVERED" && os !== "CANCELLED")
      );
    case "shipped":
      return os === "SHIPPED" || os === "OUT_FOR_DELIVERY";
    case "delivered":
      return os === "DELIVERED";
    case "returns":
      return os === "DELIVERED" || os === "SHIPPED" || os === "OUT_FOR_DELIVERY";
    default:
      return true;
  }
}

export type OrderStatusBadge = {
  label: string;
  className: string;
};

export function orderStatusBadge(order: AccountOrderRow): OrderStatusBadge {
  const osRaw = order.orderStatus ?? "";
  const os = isOrderStatus(osRaw) ? osRaw : (osRaw.toUpperCase() as OrderStatus);
  const ps = (order.paymentStatus ?? "").toUpperCase() as PaymentStatus | string;
  const pm = order.paymentMethod ?? "";

  if (ps === "PENDING" && pm === "UPI") {
    return {
      label: "Payment pending",
      className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80"
    };
  }
  if (ps === "PENDING" && pm === "COD") {
    return {
      label: "Payment pending (COD)",
      className: "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80"
    };
  }
  if (os === "ORDER_PLACED" || os === "PROCESSING") {
    return {
      label: "Processing",
      className: "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80"
    };
  }
  if (os === "SHIPPED" || os === "OUT_FOR_DELIVERY") {
    return {
      label: os === "OUT_FOR_DELIVERY" ? "Out for delivery" : "Shipped",
      className: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/70"
    };
  }
  if (os === "DELIVERED") {
    return {
      label: "Delivered",
      className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
    };
  }
  if (os === "CANCELLED") {
    return {
      label: "Cancelled",
      className: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80"
    };
  }
  return {
    label: osRaw || "Status",
    className: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200/80"
  };
}

export function isUsefulTrackingUrl(url: string | null | undefined): boolean {
  if (!url || url === "#") return false;
  try {
    const u = new URL(url);
    return u.hostname !== "example.com";
  } catch {
    return url.length > 0 && !url.startsWith("https://example.com");
  }
}
