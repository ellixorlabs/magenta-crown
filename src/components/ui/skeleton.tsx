type Props = React.HTMLAttributes<HTMLDivElement> & { rounded?: "sm" | "md" | "lg" | "xl" | "full" };

const round: Record<NonNullable<Props["rounded"]>, string> = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full"
};

export function Skeleton({ className = "", rounded = "lg", ...props }: Props) {
  return <div className={`mc-shimmer ${round[rounded]} ${className}`.trim()} {...props} />;
}
