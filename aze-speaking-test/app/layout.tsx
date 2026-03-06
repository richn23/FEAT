import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AZE Speaking Test — Task 1 Demo",
  description: "Stakeholder demo: AI-driven interactive speaking assessment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
