import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { transactionalEmailTemplate } from "@/lib/email-templates";
import { opsLog } from "@/lib/ops-logger";
import type { TransactionalEmailEvent } from "@/lib/transactional-email-queue";

const MAX_BATCH = 20;
const MAX_ATTEMPTS = 5;

type OutboxRow = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
};

async function resolveRecipientEmail(
  supabase: SupabaseClient,
  payload: Record<string, unknown>
): Promise<{ email: string; name: string } | null> {
  const userId = String(payload.userId ?? "").trim();
  if (userId) {
    const { data: user } = await (supabase.from("User") as any)
      .select("email,name")
      .eq("id", userId)
      .maybeSingle();
    const email = String((user as { email?: string | null } | null)?.email ?? "").trim();
    if (email) {
      return {
        email,
        name: String((user as { name?: string | null } | null)?.name ?? "").trim()
      };
    }
  }

  const orderId = String(payload.orderId ?? "").trim();
  if (orderId) {
    const { data: order } = await (supabase.from("Order") as any)
      .select("guestEmail,shippingAddress,user:User(email,name)")
      .eq("id", orderId)
      .maybeSingle();
    if (order) {
      const o = order as {
        guestEmail?: string | null;
        shippingAddress?: { email?: string; fullName?: string } | null;
        user?: { email?: string | null; name?: string | null } | null;
      };
      const email =
        o.user?.email?.trim() ||
        o.guestEmail?.trim() ||
        String(o.shippingAddress?.email ?? "").trim();
      if (email) {
        return {
          email,
          name: o.user?.name?.trim() || String(o.shippingAddress?.fullName ?? "").trim()
        };
      }
    }
  }

  return null;
}

async function sendViaResend(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim() || "Magenta Crown <onboarding@resend.dev>";
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to: [to], subject, html })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Resend HTTP ${res.status}`);
  }
}

export async function processEmailOutboxBatch(supabase: SupabaseClient): Promise<{
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}> {
  const { data: rows, error } = await (supabase.from("email_outbox") as any)
    .select("id,event_type,payload,attempts")
    .eq("status", "PENDING")
    .lt("attempts", MAX_ATTEMPTS)
    .order("created_at", { ascending: true })
    .limit(MAX_BATCH);

  if (error) {
    if (error.code === "42P01" || error.message?.includes("email_outbox")) {
      opsLog("email-worker", "warn", "email_outbox missing");
      return { processed: 0, sent: 0, failed: 0, skipped: 0 };
    }
    throw new Error(error.message);
  }

  const list = (rows ?? []) as OutboxRow[];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const row of list) {
    const eventType = row.event_type as TransactionalEmailEvent;
    const payload = row.payload ?? {};
    const attempts = Number(row.attempts ?? 0) + 1;
    const now = new Date().toISOString();

    try {
      const recipient = await resolveRecipientEmail(supabase, payload);
      if (!recipient) {
        await (supabase.from("email_outbox") as any)
          .update({
            attempts,
            last_error: "No recipient email",
            status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING"
          })
          .eq("id", row.id);
        skipped += 1;
        continue;
      }

      const { subject, html } = transactionalEmailTemplate(eventType, {
        ...payload,
        name: recipient.name,
        publicOrderRef: String(payload.publicOrderRef ?? payload.orderId ?? "")
      });

      if (!process.env.RESEND_API_KEY?.trim()) {
        opsLog("email-worker", "info", "RESEND_API_KEY unset — dry-run", {
          id: row.id,
          eventType,
          to: recipient.email,
          subject
        });
        await (supabase.from("email_outbox") as any)
          .update({ status: "SENT", attempts, processed_at: now, last_error: null })
          .eq("id", row.id);
        sent += 1;
        continue;
      }

      await sendViaResend(recipient.email, subject, html);
      await (supabase.from("email_outbox") as any)
        .update({ status: "SENT", attempts, processed_at: now, last_error: null })
        .eq("id", row.id);
      sent += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "send failed";
      opsLog("email-worker", "error", msg, { id: row.id, eventType });
      await (supabase.from("email_outbox") as any)
        .update({
          attempts,
          last_error: msg.slice(0, 500),
          status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING"
        })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return { processed: list.length, sent, failed, skipped };
}
