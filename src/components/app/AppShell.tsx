import type { ReactNode } from "react";

export default function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="min-h-dvh bg-mc-cream">
      <div className="mx-auto w-full max-w-lg">{children}</div>
    </div>
  );
}

