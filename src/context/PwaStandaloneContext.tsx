"use client";

import {
  createContext,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { getIsPwaStandalone, subscribeIsPwaStandalone } from "@/lib/pwa/is-standalone";

const PwaStandaloneContext = createContext(false);

export function usePwaStandalone(): boolean {
  return useContext(PwaStandaloneContext);
}

export function PwaStandaloneProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [isPwa, setIsPwa] = useState(false);

  useLayoutEffect(() => {
    setIsPwa(getIsPwaStandalone());
    return subscribeIsPwaStandalone(() => setIsPwa(getIsPwaStandalone()));
  }, []);

  const value = useMemo(() => isPwa, [isPwa]);

  return <PwaStandaloneContext.Provider value={value}>{children}</PwaStandaloneContext.Provider>;
}
