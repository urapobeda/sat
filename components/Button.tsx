import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  href?: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
} & Pick<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "onClick" | "type">;

const variants = {
  primary:
    "bg-blue-600 text-white shadow-soft shadow-blue-600/20 hover:bg-blue-700 active:bg-blue-800 focus-visible:outline-blue-600",
  secondary:
    "border border-blue-200 bg-white text-blue-700 hover:border-blue-300 hover:bg-blue-50 active:bg-blue-100 focus-visible:outline-blue-500"
};

export function Button({
  children,
  disabled = false,
  href,
  icon,
  onClick,
  type = "button",
  variant = "primary",
  className = ""
}: ButtonProps) {
  const classes = [
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    variants[variant],
    disabled ? "cursor-not-allowed opacity-55" : "",
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
    <button className={classes} disabled={disabled} onClick={onClick} type={type}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
