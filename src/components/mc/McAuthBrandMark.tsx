import Image from "next/image";

type Props = {
  className?: string;
};

/** Figma-style stacked monogram + wordmark for auth screens */
export function McAuthBrandMark({ className = "" }: Props) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <div className="relative h-16 w-16 sm:h-[4.5rem] sm:w-[4.5rem]">
        <Image
          src="/branding/mc-loader-logo.png"
          alt=""
          fill
          className="object-contain"
          sizes="72px"
          priority
        />
      </div>
      <p className="font-mc-heading mt-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-mc-gold sm:text-xs">
        Magenta Crown
      </p>
    </div>
  );
}
