"use client";

import { Bell, Volume2, VolumeX } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";
import {
  getStaffNotifSoundEnabled,
  mapNotificationTypeToTone,
  playStaffNotificationTone,
  setStaffNotifSoundEnabled
} from "@/lib/staff-notif-sound";

type NotifRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  actionUrl: string | null;
  createdAt: string;
};

type Props = {
  staffUserId: string;
  initialCount: number;
};

function dayKey(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

export function AdminNotificationBell({ staffUserId, initialCount }: Props) {
  const [count, setCount] = useState(initialCount);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const interacted = useRef(false);

  useEffect(() => {
    setSoundOn(getStaffNotifSoundEnabled());
  }, []);

  const refreshCount = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/unread-count", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { count?: number };
      setCount(typeof j.count === "number" ? j.count : 0);
    } catch {
      /* ignore */
    }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/notifications?limit=45", { cache: "no-store" });
      if (!res.ok) return;
      const j = (await res.json()) as { notifications?: NotifRow[] };
      setItems(Array.isArray(j.notifications) ? j.notifications : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      void refreshCount();
    };
    const id = setInterval(tick, 120_000);
    void tick();
    return () => {
      clearInterval(id);
    };
  }, [staffUserId, refreshCount]);

  useEffect(() => {
    if (!open) return;
    void loadList();
  }, [open, loadList]);

  useEffect(() => {
    let ch: ReturnType<NonNullable<Awaited<ReturnType<typeof getSupabaseClientOrNull>>>["channel"]> | null = null;
    let cancelled = false;

    void (async () => {
      const sb = await getSupabaseClientOrNull();
      if (!sb || cancelled) return;
      ch = sb
        .channel(`notif-${staffUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "Notification",
            filter: `recipientUserId=eq.${staffUserId}`
          },
          (payload) => {
            const row = payload.new as NotifRow | null;
            if (!row?.id) return;
            setItems((prev) => {
              if (prev.some((p) => p.id === row.id)) return prev;
              return [row, ...prev].slice(0, 60);
            });
            setCount((c) => c + 1);
            if (interacted.current && getStaffNotifSoundEnabled()) {
              void playStaffNotificationTone(mapNotificationTypeToTone(String(row.type ?? "")));
            }
          }
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      void (async () => {
        const sb = await getSupabaseClientOrNull();
        if (sb && ch) await sb.removeChannel(ch);
      })();
    };
  }, [staffUserId]);

  const markGesture = () => {
    if (!interacted.current) interacted.current = true;
  };

  const onOpen = () => {
    markGesture();
    setOpen(true);
  };

  const markOneRead = async (id: string) => {
    const wasUnread = items.some((n) => n.id === id && !n.isRead);
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, markRead: true })
    });
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    if (wasUnread) setCount((c) => Math.max(0, c - 1));
  };

  const markAllRead = async () => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true })
    });
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setCount(0);
  };

  const clearRead = async () => {
    await fetch("/api/admin/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearRead: true })
    });
    setItems((prev) => prev.filter((n) => !n.isRead));
  };

  const toggleSound = () => {
    markGesture();
    const next = !getStaffNotifSoundEnabled();
    setStaffNotifSoundEnabled(next);
    setSoundOn(next);
    if (next) void playStaffNotificationTone("default");
  };

  const label = count > 99 ? "99+" : String(count);

  const groups = new Map<string, NotifRow[]>();
  for (const n of items) {
    const k = dayKey(n.createdAt);
    const g = groups.get(k) ?? [];
    g.push(n);
    groups.set(k, g);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : onOpen())}
        className="relative inline-flex rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-800"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
      >
        <Bell className="h-5 w-5" strokeWidth={1.5} />
        {count > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 min-w-[1.1rem] rounded-full bg-rose-600 px-1 text-center text-[10px] font-bold leading-4 text-white">
            {label}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default bg-black/20" aria-label="Close" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-1.5rem,22rem)] rounded-2xl border border-zinc-200 bg-white shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Alerts</p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleSound}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                  title={soundOn ? "Sound on" : "Sound off"}
                >
                  {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button type="button" className="text-[11px] font-semibold text-crown-800 hover:underline" onClick={() => void markAllRead()}>
                  Read all
                </button>
                <button type="button" className="text-[11px] font-semibold text-zinc-500 hover:underline" onClick={() => void clearRead()}>
                  Clear read
                </button>
              </div>
            </div>
            <div className="max-h-[min(70vh,28rem)] overflow-y-auto">
              {loading ? <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p> : null}
              {!loading && items.length === 0 ? (
                <p className="px-4 py-6 text-sm text-zinc-500">No notifications.</p>
              ) : null}
              {[...groups.entries()].map(([day, rows]) => (
                <div key={day} className="border-b border-zinc-50 last:border-0">
                  <p className="sticky top-0 bg-white/95 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 backdrop-blur">
                    {day}
                  </p>
                  <ul className="divide-y divide-zinc-50">
                    {rows.map((n) => (
                      <li key={n.id} className={`px-3 py-2.5 text-sm ${n.isRead ? "opacity-70" : ""}`}>
                        <div className="flex gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium leading-snug text-zinc-900">{n.title}</p>
                            <p className="mt-0.5 text-xs leading-snug text-zinc-600">{n.message}</p>
                            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1">
                              {n.actionUrl ? (
                                <Link
                                  href={n.actionUrl}
                                  className="text-[11px] font-semibold text-crown-800 hover:underline"
                                  onClick={() => setOpen(false)}
                                >
                                  Open
                                </Link>
                              ) : null}
                              {!n.isRead ? (
                                <button
                                  type="button"
                                  className="text-[11px] font-semibold text-zinc-500 hover:underline"
                                  onClick={() => void markOneRead(n.id)}
                                >
                                  Mark read
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="border-t border-zinc-100 px-3 py-2 text-center">
              <Link href="/admin/returns" className="text-xs font-semibold text-crown-800 hover:underline" onClick={() => setOpen(false)}>
                Returns & exchanges desk
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
