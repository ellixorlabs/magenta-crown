"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode
} from "react";
import { useSession, SessionProvider, signIn, signOut } from "next-auth/react";

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
  const { data, status } = useSession();
  const isLoading = status === "loading";
  const isAuthenticated = status === "authenticated";

  const role = (data?.user?.role as Role | undefined) ?? "CUSTOMER";
  const hasRole = useCallback(
    (allowedRoles: Role[]) => allowedRoles.includes(role),
    [role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      userId: data?.user?.id ?? null,
      userName: data?.user?.name ?? null,
      userEmail: data?.user?.email ?? null,
      role,
      isAuthenticated,
      isLoading,
      hasRole,
      login: async () => {
        await signIn();
      },
      logout: async () => {
        await signOut();
      }
    }),
    [data?.user?.email, data?.user?.id, data?.user?.name, hasRole, isAuthenticated, isLoading, role]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextInner>{children}</AuthContextInner>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
