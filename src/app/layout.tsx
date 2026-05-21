import type { Metadata } from "next";
import { Manrope, Spline_Sans_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { ScrollProgress } from "@/components/scroll-progress";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-spline-sans-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEV Watch",
  description:
    "A public transparency tool tracking OFAC censorship of Ethereum MEV-boost blocks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${manrope.variable} ${splineSansMono.variable}`}>
        {/* Without JS the scroll observer never fires — keep content visible. */}
        <noscript>
          <style>{`.reveal{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        <ThemeProvider>
          {/* Fixed page-wide blueprint grid, behind all content */}
          <div className="bg-grid" aria-hidden="true" />
          <ScrollProgress />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
