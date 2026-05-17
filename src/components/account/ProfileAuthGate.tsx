"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type Props = {
  children: ReactNode;
  callbackPath: string;
};

export function ProfileAuthGate({ children, callbackPath }: Props) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace(`/auth/signin?callbackUrl=${encodeURIComponent(callbackPath)}`);
      return;
    }
    setReady(true);
  }, [isAuthenticated, isLoading, router, callbackPath]);

  if (isLoading || !ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[#F5F1E9] px-4">
        <p className="text-sm text-zinc-600">Loading…</p>
      </div>
    );
  }

  return <>{children}</>;
}
