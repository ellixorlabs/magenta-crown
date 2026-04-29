import { NextResponse } from "next/server";
import type { ApiErrorBody, ApiErrorCode, ApiSuccessEnvelope } from "@/types/api";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  const body: ApiSuccessEnvelope<T> = { ok: true, data };
  return NextResponse.json(body, init);
}

export function jsonError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, unknown>
) {
  const error: ApiErrorBody = { code, message };
  if (details && Object.keys(details).length > 0) {
    error.details = details;
  }
  return NextResponse.json({ ok: false as const, error }, { status });
}
