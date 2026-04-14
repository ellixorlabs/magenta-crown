import { type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "bg-crown-700 text-white hover:bg-crown-800",
  secondary: "bg-white text-zinc-900 hover:bg-zinc-100",
  ghost: "bg-transparent text-zinc-700 hover:bg-zinc-100"
};

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-full px-5 py-2.5 text-sm font-medium transition ${variantClassMap[variant]} ${className}`}
      {...props}
    />
  );
}
