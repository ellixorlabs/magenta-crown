import type { SavedAddress } from "@/types/profile";

export type ShippingPayload = {
  fullName: string;
  email: string;
  phone: string;
  phoneCountryCode?: string;
  phoneLocal?: string;
  street: string;
  area?: string;
  town?: string;
  city: string;
  pincode: string;
  country?: string;
};

export type SaveAddressPayload = {
  kind: "home" | "work" | "other";
  customLabel?: string;
  replaceHomeConfirmed?: boolean;
};

export function shippingToSavedAddress(shipping: ShippingPayload, save: SaveAddressPayload): SavedAddress {
  const id = crypto.randomUUID();
  const kind = save.kind;
  const custom =
    kind === "other" ? (save.customLabel ?? "").trim().slice(0, 80) : undefined;
  if (kind === "other" && !custom) {
    throw new Error("OTHER_LABEL_REQUIRED");
  }
  let label = "";
  if (kind === "home") label = "Home";
  else if (kind === "work") label = "Work";
  else label = custom ?? "Other";

  const line2Parts = [shipping.area?.trim(), shipping.town?.trim()].filter(Boolean);
  return {
    id,
    kind,
    customLabel: kind === "other" ? custom : undefined,
    label,
    line1: shipping.street.trim(),
    line2: line2Parts.length ? line2Parts.join(", ") : undefined,
    city: shipping.city.trim(),
    state: (shipping.town ?? "").trim(),
    postalCode: shipping.pincode.trim(),
    country: shipping.country?.trim() || undefined,
    phone: shipping.phone.trim()
  };
}

export function parseSavedAddresses(raw: unknown): SavedAddress[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedAddress[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    out.push({
      id: typeof o.id === "string" && o.id ? o.id : crypto.randomUUID(),
      kind:
        o.kind === "home" || o.kind === "work" || o.kind === "other"
          ? o.kind
          : undefined,
      customLabel: o.customLabel != null ? String(o.customLabel) : undefined,
      label: o.label != null ? String(o.label) : undefined,
      line1: String(o.line1 ?? ""),
      line2: o.line2 != null ? String(o.line2) : undefined,
      city: String(o.city ?? ""),
      state: String(o.state ?? ""),
      postalCode: String(o.postalCode ?? ""),
      country: o.country != null ? String(o.country) : undefined,
      phone: o.phone != null ? String(o.phone) : undefined
    });
  }
  return out;
}

export function mergeSavedAddresses(
  existing: SavedAddress[],
  incoming: SavedAddress,
  opts: { replaceHomeConfirmed?: boolean }
): SavedAddress[] {
  let next = [...existing];
  if (incoming.kind === "home") {
    const hasHome = next.some((a) => a.kind === "home");
    if (hasHome && !opts.replaceHomeConfirmed) {
      const err = new Error("HOME_EXISTS");
      (err as Error & { code?: string }).code = "HOME_EXISTS";
      throw err;
    }
    next = next.filter((a) => a.kind !== "home");
  }
  next.push(incoming);
  return next;
}
