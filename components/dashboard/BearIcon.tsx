type BearIconProps = {
  size?: number;
  className?: string;
  variant?: "filled" | "outline";
};

export function BearIcon({ size = 24, className, variant = "filled" }: BearIconProps) {
  const isOutline = variant === "outline";

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={isOutline ? "none" : "currentColor"}
      height={size}
      stroke={isOutline ? "currentColor" : "none"}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={isOutline ? 3 : 0}
      viewBox="0 0 100 100"
      width={size}
    >
      <circle cx="26" cy="24" r="13" />
      <circle cx="74" cy="24" r="13" />
      <circle cx="50" cy="56" r="36" />
      <circle cx="39" cy="52" fill={isOutline ? "currentColor" : "white"} r={isOutline ? 3 : 4} stroke="none" />
      <circle cx="61" cy="52" fill={isOutline ? "currentColor" : "white"} r={isOutline ? 3 : 4} stroke="none" />
      <ellipse cx="50" cy="64" fill={isOutline ? "none" : "white"} rx="13" ry="9" stroke={isOutline ? "currentColor" : "none"} />
      <circle cx="50" cy="60" fill="currentColor" r="2.5" stroke="none" />
    </svg>
  );
}
