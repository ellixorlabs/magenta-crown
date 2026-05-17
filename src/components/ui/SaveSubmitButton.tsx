"use client";

import { useFormStatus } from "react-dom";
import { IosSpinner } from "@/components/ui/IosSpinner";

type Props = {
  idleLabel: string;
  savingLabel?: string;
  className?: string;
  disabled?: boolean;
};

/** Submit button with iOS-style spinner while a parent `<form action={...}>` is pending. */
export function SaveSubmitButton({
  idleLabel,
  savingLabel = "Saving…",
  className,
  disabled
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 ${className ?? ""}`.trim()}
    >
      {pending ? (
        <>
          <IosSpinner size={14} />
          <span>{savingLabel}</span>
        </>
      ) : (
        <span>{idleLabel}</span>
      )}
    </button>
  );
}
