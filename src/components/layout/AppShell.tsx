import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  /** Use for master-detail pages that manage their own scroll */
  noScroll?: boolean;
}

export function AppShell({ children, title, subtitle, noScroll }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#0f0f0f]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className={`flex-1 min-h-0 ${noScroll ? "overflow-hidden" : "overflow-y-auto"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
