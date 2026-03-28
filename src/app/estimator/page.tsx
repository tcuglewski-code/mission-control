import { AppShell } from "@/components/layout/AppShell";
import { StoryPointEstimator } from "@/components/projects/StoryPointEstimator";

export default function EstimatorPage() {
  return (
    <AppShell title="Story Point Schätzer" subtitle="KI-gestützte Projektschätzung">
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">
            📊 Story Point Schätzer
          </h1>
          <p className="text-sm text-zinc-400">
            Lass Claude dein Projekt analysieren und eine realistische Story-Point-Schätzung erstellen.
            Die Schätzung basiert auf Referenz-Benchmarks aus echten AppFabrik-Projekten.
          </p>
        </div>

        <StoryPointEstimator />

        <div className="mt-6 p-4 bg-[#161616] border border-[#2a2a2a] rounded-xl">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Referenz-Benchmarks
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Auth + Grundgerüst</span>
              <span className="text-zinc-300 font-mono">50-80 SP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Einfaches CRUD-Modul</span>
              <span className="text-zinc-300 font-mono">30-50 SP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Komplexes Modul</span>
              <span className="text-zinc-300 font-mono">80-150 SP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Backend API + DB</span>
              <span className="text-zinc-300 font-mono">60-100 SP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Mobile App komplett</span>
              <span className="text-zinc-300 font-mono">800-1.500 SP</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Web App komplett</span>
              <span className="text-zinc-300 font-mono">400-800 SP</span>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
