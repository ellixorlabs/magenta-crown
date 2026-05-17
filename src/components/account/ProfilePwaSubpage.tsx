"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
};

export function ProfilePwaSubpage({ title, children }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-[100dvh] bg-[#F5F1E9] pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]">
      <header className="sticky top-0 z-10 bg-[#F5F1E9]/95 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur-sm">
        <div className="relative flex items-center justify-center px-4 py-3">
          <button
            type="button"
            aria-label="Go back"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                router.back();
                return;
              }
              router.push("/account/profile");
            }}
            className="absolute left-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-900 transition hover:bg-black/5 active:scale-[0.97]"
          >
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <h1 className="font-mc-heading text-lg font-semibold tracking-tight text-zinc-900">{title}</h1>
        </div>
      </header>

      <div className="px-4 py-5">{children}</div>
    </div>
  );
}
