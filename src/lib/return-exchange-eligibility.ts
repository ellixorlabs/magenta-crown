export type OrderEligibilitySnapshot = {
  orderStatus: string;
  deliveredAt: string | null;
  createdAt: string;
};

export type LineProductSnapshot = {
  returnable: boolean;
  exchangeable: boolean;
  returnWindowDays: number;
};

export function isWithinReturnWindow(order: OrderEligibilitySnapshot, product: LineProductSnapshot): boolean {
  if (order.orderStatus !== "DELIVERED") return false;
  const anchorMs = order.deliveredAt
    ? new Date(order.deliveredAt).getTime()
    : Number.NaN;
  const anchor = Number.isFinite(anchorMs) ? anchorMs : new Date(order.createdAt).getTime();
  const days = Number.isFinite(product.returnWindowDays) ? product.returnWindowDays : 7;
  const deadline = anchor + days * 24 * 60 * 60 * 1000;
  return Date.now() <= deadline;
}

export function hasOpenReturnForLine(
  orderItemId: string,
  rows: ReadonlyArray<{ orderItemId: string | null; status: string }>
): boolean {
  return rows.some(
    (r) =>
      r.orderItemId === orderItemId &&
      r.status !== "REJECTED" &&
      r.status !== "REFUNDED"
  );
}

export function hasOpenExchangeForLine(
  orderItemId: string,
  rows: ReadonlyArray<{ orderItemId: string | null; status: string }>
): boolean {
  return rows.some(
    (r) => r.orderItemId === orderItemId && r.status !== "REJECTED" && r.status !== "COMPLETED"
  );
}

export function canRequestReturnForLine(args: {
  order: OrderEligibilitySnapshot;
  product: LineProductSnapshot;
  orderItemId: string;
  openReturns: ReadonlyArray<{ orderItemId: string | null; status: string }>;
}): boolean {
  if (args.order.orderStatus !== "DELIVERED") return false;
  if (!args.product.returnable) return false;
  if (!isWithinReturnWindow(args.order, args.product)) return false;
  if (hasOpenReturnForLine(args.orderItemId, args.openReturns)) return false;
  return true;
}

export function canRequestExchangeForLine(args: {
  order: OrderEligibilitySnapshot;
  product: LineProductSnapshot;
  orderItemId: string;
  openExchanges: ReadonlyArray<{ orderItemId: string | null; status: string }>;
}): boolean {
  if (args.order.orderStatus !== "DELIVERED") return false;
  if (!args.product.exchangeable) return false;
  if (!isWithinReturnWindow(args.order, args.product)) return false;
  if (hasOpenExchangeForLine(args.orderItemId, args.openExchanges)) return false;
  return true;
}
