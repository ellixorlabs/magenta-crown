"use client";

import {
  createContext,
  useEffect,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { clearAccountRecoverStorageKeys } from "@/lib/account-recover-storage";
import { fetchAuthSessionDeduped } from "@/lib/auth-session-fetch";
import { getSupabaseClientOrNull } from "@/lib/supabase-client";

type Role = "ADMIN" | "SUB_ADMIN" | "CUSTOMER" | "TECH_SUPPORT";

type AuthContextValue = {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  role: Role;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasRole: (allowedRoles: Role[]) => boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthContextInner({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [role, setRole] = useState<Role>("CUSTOMER");
  const isAuthenticated = Boolean(userId);

  const clearAuthState = useCallback(() => {
    setUserId(null);
    setUserEmail(null);
    setUserName(null);
    setRole("CUSTOMER");
  }, []);

  /** Enrich client auth with server User row (role, name). Never clears client session — missing server
   *  response is common right after cookie sync or if DB row lags; wiping here caused false logouts. */
  const refreshServerSession = useCallback(async () => {
    try {
      const res = await fetchAuthSessionDeduped();
      const data = (await res.json()) as {
        session?: { user?: { id?: string; email?: string; name?: string | null; role?: Role } } | null;
      };
      const user = data.session?.user;
      if (!user?.id) return;
      clearAccountRecoverStorageKeys();
      setUserId(user.id);
      setUserEmail(user.email ?? null);
      setUserName(user.name ?? null);
      setRole(user.role ?? "CUSTOMER");
    } catch {
      /* keep Supabase-derived session; do not clear on network / transient errors */
    }
  }, []);

  const syncServerCookie = useCallback(async (accessToken: string | null) => {
    try {
      if (!accessToken) {
        await fetch("/api/auth/session", { method: "DELETE", keepalive: true });
        return;
      }
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        keepalive: true
      });
    } catch {
      // Avoid surfacing network/transient fetch failures from auth state listeners.
    }
  }, []);

  const recoverFromInvalidRefreshToken = useCallback(
    async (supabase: Awaited<ReturnType<typeof getSupabaseClientOrNull>>) => {
      try {
        await (supabase?.auth as any)?.signOut?.({ scope: "local" });
      } catch {
        // ignore local signout cleanup failures
      }
      await syncServerCookie(null);
      clearAuthState();
    },
    [clearAuthState, syncServerCookie]
  );

  /** Same-tab / Android recovery: refresh tokens + httpOnly cookie + server role. Does not clear auth on failure. */
  const resyncAuthOnDocumentActive = useCallback(async () => {
    const supabase = await getSupabaseClientOrNull();
    if (!supabase) {
      await refreshServerSession();
      return;
    }
    try {
      let {
        data: { session }
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        await supabase.auth.refreshSession().catch(() => undefined);
        const latest = (await supabase.auth.getSession()).data.session ?? session;
        await syncServerCookie(latest?.access_token ?? null);
        if (latest?.user) {
          setUserId(latest.user.id);
          setUserEmail(latest.user.email ?? null);
          setUserName((latest.user.user_metadata?.name as string | undefined) ?? null);
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      if (msg.includes("invalid refresh token") || msg.includes("refresh token not found")) {
        await recoverFromInvalidRefreshToken(supabase);
        return;
      }
    }
    await refreshServerSession();
  }, [recoverFromInvalidRefreshToken, refreshServerSession, syncServerCookie]);

  const resyncTimer = useRef<number | null>(null);
  const resyncInFlight = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const scheduleResync = () => {
      if (resyncTimer.current != null) window.clearTimeout(resyncTimer.current);
      resyncTimer.current = window.setTimeout(() => {
        resyncTimer.current = null;
        void (async () => {
          if (resyncInFlight.current) return;
          resyncInFlight.current = true;
          try {
            await resyncAuthOnDocumentActive();
          } finally {
            resyncInFlight.current = false;
          }
        })();
      }, 500);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") scheduleResync();
    };
    const onFocus = () => scheduleResync();
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) scheduleResync();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("pageshow", onPageShow as EventListener);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("pageshow", onPageShow as EventListener);
      if (resyncTimer.current != null) window.clearTimeout(resyncTimer.current);
    };
  }, [resyncAuthOnDocumentActive]);

  useEffect(() => {
    let mounted = true;
    let unsub: (() => void) | null = null;
    (async () => {
      try {
        const supabase = await getSupabaseClientOrNull();
        if (!supabase || !mounted) return;

        let sess: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"] = { session: null };
        try {
          const res = await supabase.auth.getSession();
          sess = res.data;
        } catch (e) {
          const msg = e instanceof Error ? e.message.toLowerCase() : "";
          if (msg.includes("invalid refresh token") || msg.includes("refresh token not found")) {
            await recoverFromInvalidRefreshToken(supabase);
            if (mounted) setIsLoading(false);
            return;
          }
          throw e;
        }
        await syncServerCookie(sess.session?.access_token ?? null);
        const sessionUser = sess.session?.user ?? null;
        if (mounted) {
          if (!sessionUser) {
            clearAuthState();
          } else {
            setUserId(sessionUser.id);
            setUserEmail(sessionUser.email ?? null);
            setUserName((sessionUser.user_metadata?.name as string | undefined) ?? null);
          }
          await refreshServerSession();
        }
        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!mounted) return;
          try {
            await syncServerCookie(session?.access_token ?? null);
          } catch {
            // keep auth state resilient for transient cookie-sync failures
          }
          if (!session?.user) {
            clearAuthState();
          } else {
            setUserId(session.user.id);
            setUserEmail(session.user.email ?? null);
            setUserName((session.user.user_metadata?.name as string | undefined) ?? null);
            setRole("CUSTOMER");
          }
          await refreshServerSession();
        });
        unsub = () => sub.subscription.unsubscribe();
      } catch {
        clearAuthState();
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
      unsub?.();
    };
  }, [clearAuthState, recoverFromInvalidRefreshToken, refreshServerSession, syncServerCookie]);
  const hasRole = useCallback(
    (allowedRoles: Role[]) => allowedRoles.includes(role),
    [role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      userId,
      userName,
      userEmail,
      role,
      isAuthenticated,
      isLoading,
      hasRole,
      login: async () => {
        window.location.href = "/auth/signin";
      },
      logout: async () => {
        const supabase = await getSupabaseClientOrNull();
        await supabase?.auth.signOut();
        await syncServerCookie(null);
      }
    }),
    [hasRole, isAuthenticated, isLoading, role, syncServerCookie, userEmail, userId, userName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return <AuthContextInner>{children}</AuthContextInner>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
