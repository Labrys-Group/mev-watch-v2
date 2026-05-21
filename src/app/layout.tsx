import type { Metadata } from "next";
import { Manrope, Spline_Sans_Mono } from "next/font/google";
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
        {children}
      </body>
    </html>
  );
}
