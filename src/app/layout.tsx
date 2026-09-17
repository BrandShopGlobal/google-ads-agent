import type { Metadata } from "next";
import { Jost, Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

const jost = Jost({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jost",
});

export const metadata: Metadata = {
  title: "Brand Shop | Google Ads AI Agent",
  description: "Research, review and create safer Google Ads campaigns.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${jost.variable}`}>{children}</body>
    </html>
  );
}
