"use client";

import { useEffect, useState } from "react";
import AppLayout from "@/components/app/AppLayout";
import WebLayout from "@/components/web/WebLayout";
import { BreathingLogoMark } from "@/components/layout/BreathingLogoMark";
import { PwaStandaloneProvider } from "@/context/PwaStandaloneContext";
import { isPWA } from "@/lib/isPWA";

function Loader({ fadeOut = false }: { fadeOut?: boolean }) {
  return (
    <div
      className={`mc-loader-fullscreen z-[5000] flex items-center justify-center overflow-hidden bg-[#3f0812] transition-opacity duration-300 ${
        fadeOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_78%_at_50%_42%,rgba(165,37,82,0.24)_0%,rgba(88,10,31,0.08)_45%,rgba(45,4,16,0.38)_100%)]" />
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/25 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/28 to-transparent" />
      <div className="relative flex h-[min(44vw,13rem)] w-[min(44vw,13rem)] items-center justify-center rounded-[22%] bg-white/5 ring-1 ring-white/10 backdrop-blur-[1.5px] sm:h-52 sm:w-52">
        <BreathingLogoMark
          homeIntroBreath
          sizeClassName="h-[min(34vw,10rem)] w-[min(34vw,10rem)] sm:h-40 sm:w-40"
          imageSizes="(max-width: 640px) 40vw, 160px"
        />
      </div>
    </div>
  );
}

export default function RootWrapper({
  children,
  webChrome
}: Readonly<{ children: React.ReactNode; webChrome: React.ReactNode }>) {
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
        <AppLayout>{children}</AppLayout>
      ) : (
        <WebLayout webChrome={webChrome}>{children}</WebLayout>
      )}
      {showLoader ? <Loader fadeOut={!loading} /> : null}
    </PwaStandaloneProvider>
  );
}
