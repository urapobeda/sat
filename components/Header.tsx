"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/practice", label: "Practice" },
  { href: "/tests", label: "Tests" },
  { href: "/progress", label: "Progress" }
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
        <Link className="flex items-center gap-3" href="/">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-neutral-950 text-sm font-bold text-white">
            SAT
          </span>
          <span className="text-base font-bold text-neutral-950">
            SAT Practice Hub
          </span>
        </Link>

        <nav className="flex flex-wrap items-center gap-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

            return (
              <Link
                className={[
                  "rounded-md px-3 py-2 text-sm font-medium transition",
                  isActive
                    ? "bg-neutral-950 text-white"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950"
                ].join(" ")}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
