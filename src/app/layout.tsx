import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brand Shop | Google Ads AI Agent",
  description: "Research, review and create safer Google Ads campaigns.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
