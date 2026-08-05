import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";

type LayoutProps = {
  align?: "center" | "left";
  children: ReactNode;
};

export function Layout({ align = "center", children }: LayoutProps) {
  const mainClass =
    align === "left"
      ? "w-full max-w-[1720px] px-4 py-8 sm:px-5 sm:py-12 lg:ml-0 lg:mr-auto lg:px-8 lg:py-14 2xl:px-10"
      : "mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12 lg:px-8 lg:py-14";

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className={mainClass}>{children}</main>
    </div>
  );
}

