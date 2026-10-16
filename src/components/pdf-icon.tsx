import { cn } from "@/lib/utils";

type PdfIconProps = {
  className?: string;
  /** brand = red badge with white text (use on light surfaces) · light = white badge with red text (use on red/dark surfaces) */
  tone?: "brand" | "light";
};

export function PdfIcon({ className, tone = "brand" }: PdfIconProps) {
  const isBrand = tone === "brand";
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-5 w-5 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="24" height="24" rx="5" fill={isBrand ? "#FA0F00" : "#FFFFFF"} />
      <text
        x="12"
        y="15.2"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="8.5"
        fontWeight="700"
        letterSpacing="-0.3"
        fill={isBrand ? "#FFFFFF" : "#FA0F00"}
      >
        PDF
      </text>
    </svg>
  );
}
