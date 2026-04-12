"use client";

import { RefreshCw, AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de">
      <body className="antialiased bg-[#0f0f0f]">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#161616] border border-[#2a2a2a] rounded-xl p-8 text-center space-y-4">
            <div className="flex justify-center">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-white">Kritischer Fehler</h2>
            <p className="text-sm text-zinc-400">
              Mission Control hat einen unerwarteten Fehler erlebt.
            </p>
            {error.digest && (
              <p className="text-xs text-zinc-600 font-mono">Digest: {error.digest}</p>
            )}
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Neu laden
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
