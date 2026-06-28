import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Investment Research Agent",
  description: "AI agent that researches companies and gives invest or pass decisions",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
