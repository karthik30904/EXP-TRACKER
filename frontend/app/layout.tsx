import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "₹ FIN$ight",
  description: "FIN$ight — Futuristic financial cockpit with smart logging, spending heatmaps, and financial health intelligence.",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><defs><linearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'><stop offset='0%25' stop-color='%23f59e0b'/><stop offset='50%25' stop-color='%23d97706'/><stop offset='100%25' stop-color='%23b45309'/></linearGradient></defs><rect width='100' height='100' rx='28' fill='url(%23g)'/><text x='50%25' y='68%25' font-size='68' font-family='Arial, sans-serif' font-weight='900' fill='white' text-anchor='middle'>₹</text></svg>",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
