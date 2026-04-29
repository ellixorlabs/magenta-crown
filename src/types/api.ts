/**
 * Shared API response shapes for web + mobile clients.
 * Keep fields stable; extend with optional blocks rather than renaming.
 */

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "NOT_FOUND"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "INTERNAL";

export type ApiErrorBody = {
  code: ApiErrorCode;
  message: string;
  /** Optional machine-readable details for clients (not stack traces). */
  details?: Record<string, unknown>;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiSuccessEnvelope<T> = {
  ok: true;
  data: T;
};

export type ApiErrorEnvelope = {
  ok: false;
  error: ApiErrorBody;
};

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;
