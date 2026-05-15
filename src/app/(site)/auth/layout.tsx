import type { ReactNode } from "react";
import { AuthVisualUrlProvider } from "@/components/auth/AuthVisualUrlContext";
import { getCachedAuthVisualImageUrl } from "@/lib/auth-visual-url";

export default async function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  const rawUrl = await getCachedAuthVisualImageUrl();

  return (
    <AuthVisualUrlProvider value={rawUrl}>
      <div className="relative min-w-0">
        {rawUrl ? <link rel="preload" as="image" href={rawUrl} fetchPriority="high" /> : null}
        {children}
      </div>
    </AuthVisualUrlProvider>
  );
}
