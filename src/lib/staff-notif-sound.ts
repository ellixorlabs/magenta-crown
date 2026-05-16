"use client";

const LS_KEY = "mc-staff-notif-sound";

export function getStaffNotifSoundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(LS_KEY) === "1";
}

export function setStaffNotifSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, on ? "1" : "0");
}

/** Short subtle tone; call only after user gesture (panel open counts). */
export async function playStaffNotificationTone(kind: "order" | "return" | "pay" | "default") {
  if (!getStaffNotifSoundEnabled()) return;
  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return;
  const ctx = new AudioCtx();
  if (ctx.state === "suspended") {
    await ctx.resume().catch(() => undefined);
  }
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  const freq =
    kind === "order" ? 660 : kind === "return" ? 520 : kind === "pay" ? 880 : 600;
  o.type = "sine";
  o.frequency.value = freq;
  g.gain.value = 0.0001;
  o.connect(g);
  g.connect(ctx.destination);
  const t0 = ctx.currentTime;
  g.gain.exponentialRampToValueAtTime(0.04, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
  o.start(t0);
  o.stop(t0 + 0.13);
  o.onended = () => void ctx.close().catch(() => undefined);
}

export function mapNotificationTypeToTone(type: string): "order" | "return" | "pay" | "default" {
  if (type.includes("RETURN") || type.includes("EXCHANGE")) return "return";
  if (type.includes("PAYMENT") || type === "PAYMENT_SUCCESS") return "pay";
  if (type.includes("ORDER") || type === "NEW_ORDER" || type === "NEW_ORDER_COD") return "order";
  return "default";
}
