import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomTabNav } from "./BottomTabNav";
import { QuickCaptureFAB } from "./QuickCaptureFAB";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Use for master-detail pages that manage their own scroll */
  noScroll?: boolean;
}

export function AppShell({ children, title, subtitle, noScroll }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-[#0f0f0f]">
      {/* Skip-to-Content Link für Tastatur- und Screenreader-Navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:bg-emerald-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:text-sm focus:font-semibold focus:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        Zum Hauptinhalt springen
      </a>

      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main
          id="main-content"
          tabIndex={-1}
          className={`flex-1 min-h-0 pb-14 lg:pb-0 outline-none ${
            noScroll ? "overflow-hidden" : "overflow-y-auto"
          }`}
        >
          {children}
        </main>
      </div>
      <BottomTabNav />
      <QuickCaptureFAB />
    </div>
  );
}
