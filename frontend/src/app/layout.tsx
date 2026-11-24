import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TransitIQ — Fleet Intelligence Platform",
  description: "Real-time logistics intelligence, route optimization, and risk detection for modern freight operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans text-slate-200 overflow-x-hidden bg-[#0a0e17]">
        <Navbar />
        <main>{children}</main>
      </body>
    </html>
  );
}
