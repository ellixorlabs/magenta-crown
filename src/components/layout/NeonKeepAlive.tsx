"use client";

import { useEffect } from "react";

const INTERVAL_MS = 5 * 60 * 1000;

export function NeonKeepAlive() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/ping", { method: "GET", cache: "no-store" }).catch(() => {});
    };
    ping();
    const id = window.setInterval(ping, INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  return null;
}
