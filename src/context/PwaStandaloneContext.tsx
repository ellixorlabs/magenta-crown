"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { isPWA } from "@/lib/isPWA";

const PwaStandaloneContext = createContext(false);

export function usePwaStandalone(): boolean {
  return useContext(PwaStandaloneContext);
}

export function PwaStandaloneProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isPwa, setIsPwa] = useState(false);

  useEffect(() => {
    setIsPwa(isPWA());

    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setIsPwa(isPWA());

    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }

    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);

  const value = useMemo(() => isPwa, [isPwa]);

  return <PwaStandaloneContext.Provider value={value}>{children}</PwaStandaloneContext.Provider>;
}
