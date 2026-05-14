import { getSafeCallbackUrl, MC_OAUTH_RETURN_STORAGE_KEY } from "@/lib/auth-callback";

type AppRouterLike = {
  push: (href: string) => void;
  back: () => void;
};

/**
 * Leave auth toward storefront: prefer history.back, then same-origin referrer,
 * then optional safe path from session (`mc_oauth_return`), else home.
 */
export function navigateContinueShopping(router: AppRouterLike): void {
  if (typeof window === "undefined") return;

  if (window.history.length > 1) {
    router.back();
    return;
  }

  try {
    const ref = document.referrer;
    if (ref) {
      const refUrl = new URL(ref);
      if (refUrl.origin === window.location.origin) {
        const dest = `${refUrl.pathname}${refUrl.search}`;
        if (dest !== `${window.location.pathname}${window.location.search}`) {
          router.push(dest);
          return;
        }
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const raw = window.sessionStorage.getItem(MC_OAUTH_RETURN_STORAGE_KEY);
    if (raw) {
      const safe = getSafeCallbackUrl(raw);
      if (safe && safe !== `${window.location.pathname}${window.location.search}`) {
        router.push(safe);
        return;
      }
    }
  } catch {
    /* ignore */
  }

  router.push("/");
}
