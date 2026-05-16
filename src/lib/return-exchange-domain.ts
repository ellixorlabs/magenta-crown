/** ReturnRequest / ExchangeRequest row domain (matches DB CHECK constraints). */

export const RETURN_REQUEST_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "REJECTED",
  "PICKED_UP",
  "RECEIVED",
  "REFUNDED"
] as const;
export type ReturnRequestStatus = (typeof RETURN_REQUEST_STATUSES)[number];

export const EXCHANGE_REQUEST_STATUSES = ["REQUESTED", "APPROVED", "REJECTED", "PICKED_UP", "COMPLETED"] as const;
export type ExchangeRequestStatus = (typeof EXCHANGE_REQUEST_STATUSES)[number];

export const REFUND_STATUSES = ["NONE", "PENDING", "COMPLETED", "FAILED"] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const RETURN_REASON_OPTIONS = [
  { value: "DEFECTIVE", label: "Defective / damaged" },
  { value: "SIZE_ISSUE", label: "Size / fit issue" },
  { value: "NOT_AS_DESCRIBED", label: "Not as described" },
  { value: "CHANGED_MIND", label: "Changed mind" },
  { value: "OTHER", label: "Other" }
] as const;

export function isReturnRequestStatus(v: string | null | undefined): v is ReturnRequestStatus {
  return !!v && (RETURN_REQUEST_STATUSES as readonly string[]).includes(v);
}

export function isExchangeRequestStatus(v: string | null | undefined): v is ExchangeRequestStatus {
  return !!v && (EXCHANGE_REQUEST_STATUSES as readonly string[]).includes(v);
}

export function isRefundStatus(v: string | null | undefined): v is RefundStatus {
  return !!v && (REFUND_STATUSES as readonly string[]).includes(v);
}
