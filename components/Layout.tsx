import type { ReactNode } from "react";
import { Navbar } from "@/components/Navbar";

type LayoutProps = {
  children: ReactNode;
};

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-12 lg:px-8 lg:py-14">
        {children}
      </main>
    </div>
  );
}
