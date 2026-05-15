"use client";

import { createContext, useContext, type ReactNode } from "react";

const AuthVisualUrlContext = createContext<string>("");

export function AuthVisualUrlProvider({ value, children }: Readonly<{ value: string; children: ReactNode }>) {
  return <AuthVisualUrlContext.Provider value={value}>{children}</AuthVisualUrlContext.Provider>;
}

export function useAuthVisualUrlFromServer() {
  return useContext(AuthVisualUrlContext);
}
