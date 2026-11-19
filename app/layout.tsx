import type { Metadata } from "next";
import Script from "next/script";
import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SAT Practice Hub", template: "%s · SAT Practice Hub" },
  description: "Digital SAT practice: question bank, full-length practice tests, score calculator and progress tracking."
};

const themeScript = `
(() => {
  try {
    const storedTheme = localStorage.getItem("sat-practice-theme");
    const theme = storedTheme === "dark" ? "dark" : "light";

    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script
          dangerouslySetInnerHTML={{ __html: themeScript }}
          id="theme-script"
          strategy="beforeInteractive"
        />
        {children}
      </body>
    </html>
  );
}
