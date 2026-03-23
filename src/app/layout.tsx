import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { CommandPalette } from "@/components/layout/CommandPalette";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mission Control",
  description: "AI-gestützte Projektsteuerung — Dashboard & Command Center",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className="dark">
      <body className={`${inter.className} bg-[#0f0f0f] text-white antialiased`}>
        <SessionProvider>
          {children}
          <CommandPalette />
        </SessionProvider>
      </body>
    </html>
  );
}
