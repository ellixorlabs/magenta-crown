/** iOS-style activity indicator (ring with gap). */
export function IosSpinner({ className = "", size = 16 }: { className?: string; size?: number }) {
  return (
    <span
      role="status"
      aria-hidden
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`.trim()}
      style={{ width: size, height: size }}
    />
  );
}
