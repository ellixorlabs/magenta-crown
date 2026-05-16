import type { SupabaseClient } from "@supabase/supabase-js";
import { randomId } from "@/lib/random-id";

export type TimelineEventInput = {
  orderId: string;
  actorRole?: string | null;
  actorId?: string | null;
  type: string;
  title: string;
  description?: string | null;
  metadata?: Record<string, unknown>;
};

export async function insertOrderTimelineEvent(
  supabase: SupabaseClient,
  input: TimelineEventInput
): Promise<void> {
  const { error } = await (supabase.from("OrderTimelineEvent") as any).insert({
    id: randomId(),
    orderId: input.orderId,
    actorRole: input.actorRole ?? null,
    actorId: input.actorId ?? null,
    type: input.type,
    title: input.title,
    description: input.description ?? null,
    metadata: input.metadata ?? {}
  });
  if (error) {
    console.error("[order-timeline] insert failed", error.message);
  }
}
