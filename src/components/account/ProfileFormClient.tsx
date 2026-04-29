"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SavedAddress } from "@/types/profile";
import { randomId } from "@/lib/random-id";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

function emptyAddress(): SavedAddress {
  return {
    id: randomId(),
    kind: undefined,
    customLabel: undefined,
    label: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: ""
  };
}

export function ProfileFormClient() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([emptyAddress()]);
  const [email, setEmail] = useState("");
  const [deletionScheduledFor, setDeletionScheduledFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(async () => {
    const supabase = await getSupabaseClientOrNull();
    if (!supabase) throw new Error("Supabase is not configured.");
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) throw new Error("Please sign in.");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      // Ensure profile row exists for fresh Supabase users.
      await fetch("/api/user/profile", { method: "POST", headers });
      const res = await fetch("/api/user/profile", { headers });
      if (!res.ok) throw new Error("Could not load profile");
      const d = (await res.json()) as {
        name: string;
        email: string;
        phone: string;
        age: number | null;
        addresses: unknown;
        deletionScheduledFor: string | null;
      };
      setName(d.name ?? "");
      setEmail(d.email ?? "");
      setPhone(d.phone ?? "");
      setAge(d.age != null ? String(d.age) : "");
      setDeletionScheduledFor(d.deletionScheduledFor ?? null);
      const raw = Array.isArray(d.addresses) ? d.addresses : [];
      const parsed = raw
        .filter((x) => x && typeof x === "object")
        .map((x) => {
          const o = x as Record<string, unknown>;
          const kind =
            o.kind === "home" || o.kind === "work" || o.kind === "other" ? o.kind : undefined;
          return {
            id: typeof o.id === "string" && o.id ? o.id : randomId(),
            kind,
            customLabel: o.customLabel != null ? String(o.customLabel) : undefined,
            label: String(o.label ?? ""),
            line1: String(o.line1 ?? ""),
            line2: String(o.line2 ?? ""),
            city: String(o.city ?? ""),
            state: String(o.state ?? ""),
            postalCode: String(o.postalCode ?? ""),
            country: String(o.country ?? ""),
            phone: String(o.phone ?? "")
          } satisfies SavedAddress;
        });
      setAddresses(parsed.length ? parsed : [emptyAddress()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateAddress(i: number, patch: Partial<SavedAddress>) {
    setAddresses((prev) => prev.map((a, j) => (j === i ? { ...a, ...patch } : a)));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      let ageNum: number | null = null;
      if (age.trim() !== "") {
        const n = parseInt(age, 10);
        if (Number.isNaN(n) || n < 13 || n > 120) {
          setError("Age must be between 13 and 120, or leave blank.");
          setSaving(false);
          return;
        }
        ageNum = n;
      }

      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
        age: ageNum,
        addresses: addresses.map((a) => ({
          id: a.id,
          kind: a.kind,
          customLabel: a.customLabel?.trim() || undefined,
          label: a.label || undefined,
          line1: a.line1.trim(),
          line2: a.line2?.trim() || undefined,
          city: a.city.trim(),
          state: a.state.trim(),
          postalCode: a.postalCode.trim(),
          country: a.country?.trim() || undefined,
          phone: a.phone?.trim() || undefined
        }))
      };

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const j = (await res.json()) as { error?: string };
        throw new Error(j.error ?? "Save failed");
      }
      setMessage("Saved.");
      await load();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function requestDeletion() {
    const ok = window.confirm(
      "Delete account? This is permanent and cannot be recovered after 7 days. You can revoke deletion within this period."
    );
    if (!ok) return;
    setDeletionBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/user/account-deletion", {
        method: "POST",
        headers: await authHeaders()
      });
      const data = (await res.json()) as { deletionScheduledFor?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not schedule deletion.");
      setDeletionScheduledFor(data.deletionScheduledFor ?? null);
      setMessage("Account deletion scheduled. You can revoke within 7 days.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not schedule deletion.");
    } finally {
      setDeletionBusy(false);
    }
  }

  async function revokeDeletion() {
    const ok = window.confirm("Revoke account deletion request?");
    if (!ok) return;
    setDeletionBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/user/account-deletion", {
        method: "DELETE",
        headers: await authHeaders()
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not revoke deletion.");
      setDeletionScheduledFor(null);
      setMessage("Account deletion revoked.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not revoke deletion.");
    } finally {
      setDeletionBusy(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading profile…</p>;
  }

  return (
    <form onSubmit={onSave} className="space-y-8">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p>}

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Personal info</h2>
        <p className="mt-1 text-sm text-zinc-600">Email is your sign-in; update name, phone, and age here.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase text-zinc-500" htmlFor="email-ro">
              Email
            </label>
            <input
              id="email-ro"
              readOnly
              className="mt-1 w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-600"
              value={email}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500" htmlFor="age">
              Age
            </label>
            <input
              id="age"
              type="number"
              min={13}
              max={120}
              placeholder="Optional"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Saved addresses</h2>
            <p className="mt-1 text-sm text-zinc-600">Used at checkout when you pick a saved address.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            onClick={() => setAddresses((a) => [...a, emptyAddress()])}
          >
            Add address
          </button>
        </div>

        <div className="mt-6 space-y-8">
          {addresses.map((a, i) => (
            <div key={a.id} className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-zinc-500">Address {i + 1}</span>
                {addresses.length > 1 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-red-700 hover:underline"
                    onClick={() => setAddresses((prev) => prev.filter((_, j) => j !== i))}
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-500">Label (e.g. Home)</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    value={a.label ?? ""}
                    onChange={(e) => updateAddress(i, { label: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-500">Street line 1</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    value={a.line1}
                    onChange={(e) => updateAddress(i, { line1: e.target.value })}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-zinc-500">Street line 2</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    value={a.line2 ?? ""}
                    onChange={(e) => updateAddress(i, { line2: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">City</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    value={a.city}
                    onChange={(e) => updateAddress(i, { city: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">State</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    value={a.state}
                    onChange={(e) => updateAddress(i, { state: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Postal code</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    value={a.postalCode}
                    onChange={(e) => updateAddress(i, { postalCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Country</label>
                  <input
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    value={a.country ?? ""}
                    onChange={(e) => updateAddress(i, { country: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500">Phone (this address)</label>
                  <input
                    type="tel"
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
                    value={a.phone ?? ""}
                    onChange={(e) => updateAddress(i, { phone: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-zinc-900 px-8 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save profile"}
      </button>

      <section className="rounded-2xl border border-red-200 bg-red-50/60 p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-red-900">Profile settings</h2>
        <p className="mt-1 text-sm text-red-900/80">
          Deleting your account is permanent after 7 days and cannot be recovered.
        </p>
        {deletionScheduledFor ? (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-red-800">
              Deletion scheduled for: <span className="font-semibold">{new Date(deletionScheduledFor).toLocaleString()}</span>
            </p>
            <button
              type="button"
              disabled={deletionBusy}
              onClick={() => void revokeDeletion()}
              className="rounded-full border border-red-700 bg-white px-5 py-2.5 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-60"
            >
              {deletionBusy ? "Please wait…" : "Revoke deletion"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={deletionBusy}
            onClick={() => void requestDeletion()}
            className="mt-4 rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-900 disabled:opacity-60"
          >
            {deletionBusy ? "Please wait…" : "Delete account"}
          </button>
        )}
      </section>
    </form>
  );
}
