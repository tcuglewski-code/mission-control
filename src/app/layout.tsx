import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { QuickAddTaskModal } from "@/components/QuickAddTaskModal";
import { KeyboardShortcutsModal } from "@/components/layout/KeyboardShortcutsModal";
import { GlobalKeyboardShortcuts } from "@/components/layout/GlobalKeyboardShortcuts";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

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
    <html lang="de">
      <body className={`${inter.className} antialiased`}>
        <ThemeProvider>
          <SessionProvider>
            {children}
            <GlobalKeyboardShortcuts />
            <CommandPalette />
            <QuickAddTaskModal />
            <KeyboardShortcutsModal />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
