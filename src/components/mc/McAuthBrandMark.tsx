import Image from "next/image";

type Props = {
  className?: string;
  /** Compact row for minimal auth chrome (top bar). */
  variant?: "default" | "compact";
};

/** Figma-style stacked monogram + wordmark for auth screens */
export function McAuthBrandMark({ className = "", variant = "default" }: Props) {
  if (variant === "compact") {
    return (
      <div className={`flex flex-row items-center gap-2.5 text-left ${className}`}>
        <div className="relative h-9 w-9 shrink-0 sm:h-10 sm:w-10">
          <Image
            src="/branding/mc-loader-logo.png"
            alt=""
            fill
            className="object-contain"
            sizes="40px"
            quality={75}
            priority
            loading="eager"
            fetchPriority="high"
          />
        </div>
        <p className="font-mc-heading text-[10px] font-semibold uppercase leading-tight tracking-[0.22em] text-mc-gold sm:text-[11px] sm:tracking-[0.26em]">
          Magenta Crown
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="relative h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]">
        <Image
          src="/branding/mc-loader-logo.png"
          alt=""
          fill
          className="object-contain"
          sizes="72px"
          quality={75}
          priority
          loading="eager"
          fetchPriority="high"
        />
      </div>
      <p className="font-mc-heading mt-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-mc-gold sm:text-xs">
        Magenta Crown
      </p>
    </div>
  );
}
