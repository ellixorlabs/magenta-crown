export type AddressKind = "home" | "work" | "other";

export type SavedAddress = {
  id: string;
  /** Preferred label type; only one `home` allowed per user. */
  kind?: AddressKind;
  /** When kind is `other`, user-defined name. */
  customLabel?: string;
  /** Display label (e.g. Home, Work, or custom). */
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  phone?: string;
};
