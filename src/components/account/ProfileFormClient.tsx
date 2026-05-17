"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
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

function formatAddressLines(a: SavedAddress) {
  const lineA = [a.line1, a.line2].filter(Boolean).join(", ").trim();
  const lineB = [a.city, a.state, a.postalCode, a.country].filter(Boolean).join(", ").trim();
  return [lineA, lineB].filter(Boolean);
}

function cloneAddresses(items: SavedAddress[]) {
  return items.map((a) => ({ ...a }));
}

type ProfilePayload = {
  name: string;
  email: string;
  phone: string;
  addresses: unknown;
  deletionScheduledFor: string | null;
};

const PROFILE_CACHE_TTL_MS = 60_000;
let profileCache: { data: ProfilePayload; expiresAt: number } | null = null;

export type ProfileFormSection = "all" | "personal" | "addresses" | "settings";

type ProfileFormClientProps = {
  section?: ProfileFormSection;
};

export function ProfileFormClient({ section = "all" }: ProfileFormClientProps) {
  const showPersonal = section === "all" || section === "personal";
  const showAddresses = section === "all" || section === "addresses";
  const showSettings = section === "all" || section === "settings";
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [initialAddresses, setInitialAddresses] = useState<SavedAddress[]>([]);
  const [addressEditingId, setAddressEditingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [personalEditing, setPersonalEditing] = useState(false);
  const [deletionScheduledFor, setDeletionScheduledFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sensitivePassword, setSensitivePassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showSensitivePassword, setShowSensitivePassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [showDeletionPassword, setShowDeletionPassword] = useState(false);
  const [securityBusy, setSecurityBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback(async () => {
    const supabase = await getSupabaseClientOrNull();
    if (!supabase) throw new Error("Supabase is not configured.");
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (!token) throw new Error("Please sign in.");
    return { Authorization: `Bearer ${token}` };
  }, []);

  const load = useCallback(async (opts?: { force?: boolean }) => {
    const force = opts?.force === true;
    setLoading(true);
    setError(null);
    try {
      if (!force && profileCache && profileCache.expiresAt > Date.now()) {
        const d = profileCache.data;
        setName(d.name ?? "");
        setEmail(d.email ?? "");
        setPhone(d.phone ?? "");
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
        setAddresses(cloneAddresses(parsed));
        setInitialAddresses(cloneAddresses(parsed));
        setAddressEditingId(null);
        setPersonalEditing(false);
        return;
      }
      const headers = await authHeaders();
      // Ensure profile row exists for fresh Supabase users.
      await fetch("/api/user/profile", { method: "POST", headers });
      const res = await fetch("/api/user/profile", { headers });
      if (!res.ok) throw new Error("Could not load profile");
      const d = (await res.json()) as ProfilePayload;
      profileCache = { data: d, expiresAt: Date.now() + PROFILE_CACHE_TTL_MS };
      setName(d.name ?? "");
      setEmail(d.email ?? "");
      setPhone(d.phone ?? "");
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
      setAddresses(cloneAddresses(parsed));
      setInitialAddresses(cloneAddresses(parsed));
      setAddressEditingId(null);
      setPersonalEditing(false);
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

  async function saveProfile() {
    setMessage(null);
    setError(null);
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        phone: phone.trim() || null,
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
      setPersonalEditing(false);
      setAddressEditingId(null);
      profileCache = null;
      await load({ force: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function startPersonalEdit() {
    setPersonalEditing(true);
    setMessage(null);
    setError(null);
  }

  async function requireRecentAuth(password: string) {
    const supabase = await getSupabaseClientOrNull();
    if (!supabase) throw new Error("Supabase is not configured.");
    if (!email.trim()) throw new Error("Missing account email.");
    const pass = password.trim();
    if (!pass) throw new Error("Enter your current password to continue.");
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass
    });
    if (reauthError) throw new Error(reauthError.message || "Reauthentication failed.");
    const token = (await supabase.auth.getSession()).data.session?.access_token;
    if (token) {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  }

  async function changeEmailAddress() {
    setSecurityBusy(true);
    setError(null);
    setMessage(null);
    try {
      const nextEmail = pendingEmail.trim().toLowerCase();
      if (!nextEmail) throw new Error("Enter the new email address.");
      if (nextEmail === email.trim().toLowerCase()) throw new Error("New email matches your current email.");
      await requireRecentAuth(sensitivePassword);
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: updateError } = await supabase.auth.updateUser(
        { email: nextEmail },
        { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/account/profile")}` }
      );
      if (updateError) throw new Error(updateError.message || "Could not start email change.");
      setMessage("Verification sent to your new email. Confirm it to complete the change.");
      setPendingEmail("");
      setSensitivePassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change email.");
    } finally {
      setSecurityBusy(false);
    }
  }

  async function changePasswordWithReauth() {
    setSecurityBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (newPassword.length < 8) throw new Error("New password must be at least 8 characters.");
      if (newPassword !== confirmNewPassword) throw new Error("New passwords do not match.");
      await requireRecentAuth(sensitivePassword);
      const supabase = await getSupabaseClientOrNull();
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
        current_password: sensitivePassword
      });
      if (updateError) throw new Error(updateError.message || "Could not update password.");
      setMessage("Password updated successfully.");
      setSensitivePassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update password.");
    } finally {
      setSecurityBusy(false);
    }
  }

  async function requestDeletion() {
    setDeletionBusy(true);
    setError(null);
    setMessage(null);
    try {
      await requireRecentAuth(sensitivePassword);
      const res = await fetch("/api/user/account-deletion", {
        method: "POST",
        headers: await authHeaders()
      });
      const data = (await res.json()) as { deletionScheduledFor?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not schedule deletion.");
      setDeletionScheduledFor(data.deletionScheduledFor ?? null);
      setMessage("Account deletion scheduled. You can revoke within 7 days.");
      setShowDeleteConfirm(false);
      setSensitivePassword("");
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
    <div className="space-y-8">
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{message}</p>}

      {showPersonal ? (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Personal info</h2>
        <p className="mt-1 text-sm text-zinc-600">Email is your sign-in; update name and phone here.</p>
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
              disabled={!personalEditing}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-600"
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
              disabled={!personalEditing}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-600"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          {personalEditing ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setPersonalEditing(false);
                  void load();
                }}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveProfile()}
                className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                {saving ? "Please wait…" : "Apply"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={startPersonalEdit}
              className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Edit
            </button>
          )}
        </div>
      </section>
      ) : null}

      {showAddresses ? (
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Saved addresses</h2>
            <p className="mt-1 text-sm text-zinc-600">Used at checkout when you pick a saved address.</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
            onClick={() =>
              setAddresses((a) => {
                const next = emptyAddress();
                setAddressEditingId(next.id);
                return [...a, next];
              })
            }
          >
            Add address
          </button>
        </div>

        <div className="mt-6 space-y-8">
          {addresses.length === 0 ? (
            <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-5 text-sm text-zinc-600">
              No saved addresses yet. Click <span className="font-semibold">Add address</span> to add one.
            </p>
          ) : null}
          {addresses.map((a, i) => (
            <div key={a.id} className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase text-zinc-500">Address {i + 1}</span>
                <div className="flex items-center gap-4">
                  {addressEditingId === a.id ? null : (
                    <button
                      type="button"
                      className="text-xs font-semibold text-crown-900 hover:underline"
                      onClick={() => setAddressEditingId(a.id)}
                    >
                      Edit
                    </button>
                  )}
                  {addresses.length > 1 && (
                    <button
                      type="button"
                      className="text-xs font-medium text-red-700 hover:underline"
                      onClick={() => setAddresses((prev) => prev.filter((_, j) => j !== i))}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              {addressEditingId === a.id ? (
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
                  <div className="sm:col-span-2 flex justify-end gap-3">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => {
                        setAddresses(cloneAddresses(initialAddresses));
                        setAddressEditingId(null);
                      }}
                      className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveProfile()}
                      className="rounded-full bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
                    >
                      {saving ? "Please wait…" : "Apply"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-semibold text-zinc-900">{a.label?.trim() || `Address ${i + 1}`}</p>
                  {formatAddressLines(a).map((line) => (
                    <p key={line} className="text-sm leading-6 text-zinc-700">
                      {line}
                    </p>
                  ))}
                  {a.phone?.trim() ? <p className="text-sm text-zinc-700">Phone number: {a.phone}</p> : null}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
      ) : null}

      {showSettings ? (
      <>
      <section className="rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Security</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Sensitive changes require re-authentication with your current password.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase text-zinc-500" htmlFor="current-password">
              Current password (for re-authentication)
            </label>
            <div className="relative mt-1">
              <input
                id="current-password"
                type={showSensitivePassword ? "text" : "password"}
                autoComplete="current-password"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-11 text-sm"
                value={sensitivePassword}
                onChange={(e) => setSensitivePassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showSensitivePassword ? "Hide current password" : "Show current password"}
                onClick={() => setShowSensitivePassword((v) => !v)}
                className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800"
              >
                {showSensitivePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase text-zinc-500" htmlFor="new-email">
              Change email address
            </label>
            <div className="mt-1 flex flex-wrap gap-2">
              <input
                id="new-email"
                type="email"
                className="min-w-[220px] flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                placeholder="new-email@example.com"
                value={pendingEmail}
                onChange={(e) => setPendingEmail(e.target.value)}
              />
              <button
                type="button"
                disabled={securityBusy}
                onClick={() => void changeEmailAddress()}
                className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
              >
                Update email
              </button>
            </div>
            <p className="mt-1 text-xs text-zinc-500">A verification email is sent to the new address.</p>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500" htmlFor="new-password">
              New password
            </label>
            <div className="relative mt-1">
              <input
                id="new-password"
                type={showNewPassword ? "text" : "password"}
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-11 text-sm"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-zinc-500" htmlFor="confirm-new-password">
              Confirm new password
            </label>
            <div className="relative mt-1">
              <input
                id="confirm-new-password"
                type={showConfirmNewPassword ? "text" : "password"}
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-11 text-sm"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showConfirmNewPassword ? "Hide confirm new password" : "Show confirm new password"}
                onClick={() => setShowConfirmNewPassword((v) => !v)}
                className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800"
              >
                {showConfirmNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={securityBusy}
            onClick={() => void changePasswordWithReauth()}
            className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-60"
          >
            {securityBusy ? "Please wait…" : "Change password"}
          </button>
        </div>
      </section>

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
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-900 disabled:opacity-60"
          >
            {deletionBusy ? "Please wait…" : "Delete account"}
          </button>
        )}
      </section>
      </>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-zinc-950">Confirm account deletion</h3>
            <p className="mt-3 text-sm leading-6 text-zinc-700">
              Are you sure you want to confirm to delete your account permanently, all data will be erased and no data can
              be retrieved. If you change your mind within 7 days you can still revoke the deletion process. Are you sure
              you want to continue?
            </p>
            <label className="mt-4 block text-xs font-semibold uppercase text-zinc-500">
              Current password (required)
              <div className="relative mt-1">
                <input
                  type={showDeletionPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-11 text-sm"
                  value={sensitivePassword}
                  onChange={(e) => setSensitivePassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showDeletionPassword ? "Hide current password" : "Show current password"}
                  onClick={() => setShowDeletionPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 inline-flex items-center justify-center text-zinc-500 hover:text-zinc-800"
                >
                  {showDeletionPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                disabled={deletionBusy}
                onClick={() => void requestDeletion()}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 hover:bg-zinc-100 disabled:opacity-60"
              >
                {deletionBusy ? "Please wait…" : "Continue"}
              </button>
              <button
                type="button"
                disabled={deletionBusy}
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-900 disabled:opacity-60"
              >
                Abort
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
