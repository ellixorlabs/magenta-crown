"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import AppLayout from "@/components/app/AppLayout";
import WebLayout from "@/components/web/WebLayout";
import { BreathingLogoMark } from "@/components/layout/BreathingLogoMark";
import { PwaStandaloneProvider } from "@/context/PwaStandaloneContext";
import { isPWA } from "@/lib/isPWA";
import { MC_LOADER_MAROON } from "@/lib/loader-theme";

function Loader({ fadeOut = false }: { fadeOut?: boolean }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <div
      className={`mc-loader-fullscreen z-[5000] flex items-center justify-center overflow-hidden transition-opacity duration-300 ${
        fadeOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      style={{ backgroundColor: MC_LOADER_MAROON }}
    >
      <BreathingLogoMark
        homeIntroBreath
        competeWithHeroLcp={isHome}
        priority={!isHome}
        sizeClassName="h-[min(36vw,10rem)] w-[min(36vw,10rem)] sm:h-40 sm:w-40"
        imageSizes="(max-width: 640px) 40vw, 160px"
      />
    </div>
  );
}

export default function RootWrapper({
  children,
  webChrome,
  footer
}: Readonly<{ children: React.ReactNode; webChrome: React.ReactNode; footer?: React.ReactNode }>) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [appMode, setAppMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAppMode(isPWA());

    const t = window.setTimeout(() => setLoading(false), 520);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    if (loading) return;
    const t = window.setTimeout(() => setShowLoader(false), 300);
    return () => window.clearTimeout(t);
  }, [loading]);

  if (!mounted) return <Loader />;

  return (
    <PwaStandaloneProvider>
      {appMode ? (
        <AppLayout footer={footer}>{children}</AppLayout>
      ) : (
        <WebLayout webChrome={webChrome} footer={footer}>
          {children}
        </WebLayout>
      )}
      {showLoader ? <Loader fadeOut={!loading} /> : null}
    </PwaStandaloneProvider>
  );
}
