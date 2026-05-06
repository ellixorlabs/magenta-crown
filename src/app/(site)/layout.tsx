import { Suspense } from "react";
import RootWrapper from "@/components/RootWrapper";
import { SiteNavSuspenseFallback } from "@/components/layout/SiteNavSuspenseFallback";
import { SiteNavWithData } from "@/server/SiteNavWithData";

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <RootWrapper
      webChrome={
        <Suspense fallback={<SiteNavSuspenseFallback />}>
          <SiteNavWithData />
        </Suspense>
      }
    >
      {children}
    </RootWrapper>
  );
}
