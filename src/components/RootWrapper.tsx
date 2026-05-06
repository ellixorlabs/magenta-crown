"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import WebLayout from "@/components/web/WebLayout";
import { BreathingLogoMark } from "@/components/layout/BreathingLogoMark";
import { PwaStandaloneProvider } from "@/context/PwaStandaloneContext";
import { isPWA } from "@/lib/isPWA";

function Loader() {
  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-[#3f0812]">
      <BreathingLogoMark
        homeIntroBreath
        sizeClassName="h-[min(38vw,11rem)] w-[min(38vw,11rem)] sm:h-44 sm:w-44"
        imageSizes="(max-width: 640px) 45vw, 176px"
      />
    </div>
  );
}

export default function RootWrapper({
  children,
  webChrome
}: Readonly<{ children: React.ReactNode; webChrome: React.ReactNode }>) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAppMode(isPWA());

    const t = window.setTimeout(() => setLoading(false), 800);
    return () => window.clearTimeout(t);
  }, []);

  if (!mounted || loading) return <Loader />;

  return (
    <PwaStandaloneProvider>
      {appMode ? (
        <AppLayout>{children}</AppLayout>
      ) : (
        <WebLayout webChrome={webChrome}>{children}</WebLayout>
      )}
    </PwaStandaloneProvider>
  );
}
