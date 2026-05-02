/** Keys used when syncing Supabase localStorage session → httpOnly cookie for server `auth()`. */

export const ACCOUNT_RECOVER_PREFIX = "mc-account-recover:";

export function clearAccountRecoverStorageKeys() {
  if (typeof window === "undefined") return;
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i);
      if (k?.startsWith(ACCOUNT_RECOVER_PREFIX)) sessionStorage.removeItem(k);
    }
  } catch {
    /* ignore quota / private mode */
  }
}
