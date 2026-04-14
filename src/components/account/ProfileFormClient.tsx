"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SavedAddress } from "@/types/profile";

function emptyAddress(): SavedAddress {
  return {
    id: crypto.randomUUID(),
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/user/profile");
      if (!res.ok) throw new Error("Could not load profile");
      const d = (await res.json()) as {
        name: string;
        email: string;
        phone: string;
        age: number | null;
        addresses: unknown;
      };
      setName(d.name ?? "");
      setEmail(d.email ?? "");
      setPhone(d.phone ?? "");
      setAge(d.age != null ? String(d.age) : "");
      const raw = Array.isArray(d.addresses) ? d.addresses : [];
      const parsed = raw
        .filter((x) => x && typeof x === "object")
        .map((x) => {
          const o = x as Record<string, unknown>;
          const kind =
            o.kind === "home" || o.kind === "work" || o.kind === "other" ? o.kind : undefined;
          return {
            id: typeof o.id === "string" && o.id ? o.id : crypto.randomUUID(),
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
  }, []);

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
        headers: { "Content-Type": "application/json" },
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
    </form>
  );
}
