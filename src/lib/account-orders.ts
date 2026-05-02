/** Hide unpaid UPI checkouts from account lists after this age (matches cancellation policy copy). */
export const STALE_PENDING_UPI_MS = 7 * 24 * 60 * 60 * 1000;

export type AccountOrderFilter = "all" | "processing" | "shipped" | "delivered" | "returns";

export function isStalePendingUpi(order: {
  status: string;
  paymentMethod: string | null | undefined;
  createdAt: string | Date;
}): boolean {
  if (order.status !== "PENDING") return false;
  if (order.paymentMethod !== "UPI") return false;
  return Date.now() - new Date(order.createdAt).getTime() > STALE_PENDING_UPI_MS;
}

export function isPendingUpiPayment(order: {
  status: string;
  paymentMethod: string | null | undefined;
}): boolean {
  return order.status === "PENDING" && order.paymentMethod === "UPI";
}

export function matchesAccountOrderFilter(
  order: { status: string; paymentMethod?: string | null },
  filter: AccountOrderFilter
): boolean {
  const s = (order.status ?? "").toUpperCase();
  const pm = order.paymentMethod ?? "";
  switch (filter) {
    case "all":
      return true;
    case "processing":
      // Exclude unpaid UPI — those are "payment pending", not warehouse processing.
      if (s === "PAID") return true;
      if (s === "PENDING" && pm !== "UPI") return true;
      return false;
    case "shipped":
      return s === "SHIPPED";
    case "delivered":
      return s === "DELIVERED";
    case "returns":
      return s === "SHIPPED" || s === "DELIVERED";
    default:
      return true;
  }
}

export type OrderStatusBadge = {
  label: string;
  className: string;
};

export function orderStatusBadge(order: {
  status: string;
  paymentMethod?: string | null;
}): OrderStatusBadge {
  const s = (order.status ?? "").toUpperCase();
  const pm = order.paymentMethod ?? "";

  if (s === "PENDING" && pm === "UPI") {
    return {
      label: "Payment pending",
      className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80"
    };
  }
  if (s === "PENDING") {
    return {
      label: "Processing",
      className: "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80"
    };
  }
  if (s === "PAID") {
    return {
      label: "Processing",
      className: "bg-sky-50 text-sky-900 ring-1 ring-sky-200/80"
    };
  }
  if (s === "SHIPPED") {
    return {
      label: "Shipped",
      className: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/70"
    };
  }
  if (s === "DELIVERED") {
    return {
      label: "Delivered",
      className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
    };
  }
  return {
    label: s || "Status",
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
