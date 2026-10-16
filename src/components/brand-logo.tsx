import { cn } from "@/lib/utils";

type BrandLogoProps = {
  onDark?: boolean;
  className?: string;
  priority?: boolean;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export function BrandLogo({ onDark = false, className }: BrandLogoProps) {
  const src = `${basePath}${onDark ? "/logo-dark.png" : "/logo.png"}`;
  return (
    <img
      src={src}
      alt="Simms Engineering"
      width={232}
      height={83}
      loading="eager"
      decoding="async"
      className={cn("h-6 w-auto object-contain", onDark && "drop-shadow-sm", className)}
    />
  );
}