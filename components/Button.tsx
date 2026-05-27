import Link from "next/link";
import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

const variants = {
  primary:
    "bg-neutral-950 text-white shadow-soft hover:bg-neutral-800 focus-visible:outline-neutral-950",
  secondary:
    "border border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-neutral-500"
};

export function Button({
  children,
  href,
  icon,
  variant = "primary",
  className = ""
}: ButtonProps) {
  const classes = [
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    variants[variant],
    className
  ].join(" ");

  if (href) {
    return (
      <Link className={classes} href={href}>
        {icon}
        <span>{children}</span>
      </Link>
    );
  }

  return (
    <button className={classes} type="button">
      {icon}
      <span>{children}</span>
    </button>
  );
}
