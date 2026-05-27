import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SAT Practice Hub",
  description: "A minimal SAT preparation site for Math, Reading, and Writing."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
