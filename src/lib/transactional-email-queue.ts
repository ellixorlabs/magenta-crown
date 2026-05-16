import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { randomId } from "@/lib/random-id";
import { opsLog } from "@/lib/ops-logger";

export type TransactionalEmailEvent =
  | "ORDER_PLACED"
  | "PAYMENT_SUCCESS"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "RETURN_APPROVED"
  | "REFUND_PROCESSED";

/**
 * Queue-friendly: inserts `EmailOutbox` row for a worker/cron to send (Resend/SMTP).
 * Safe to call multiple times for same logical event if upstream dedupes business rules.
 */
export async function enqueueTransactionalEmail(
  supabase: SupabaseClient,
  eventType: TransactionalEmailEvent,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    const { error } = await (supabase.from("email_outbox") as any).insert({
      id: randomId(),
      event_type: eventType,
      payload,
      status: "PENDING",
      attempts: 0
    });
    if (error) {
      if (error.message?.includes("email_outbox") || error.code === "42P01") {
        opsLog("email-queue", "warn", "email_outbox table missing — migration not applied?", { eventType });
        return;
      }
      opsLog("email-queue", "error", error.message, { eventType });
    }
  } catch (e) {
    opsLog("email-queue", "error", e instanceof Error ? e.message : "enqueue failed", { eventType });
  }
}
