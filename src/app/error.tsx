'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Page Error]', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
        <div className="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertTriangle className="w-7 h-7 text-amber-500" />
        </div>
        
        <h2 className="text-lg font-semibold text-white mb-2">
          Seite konnte nicht geladen werden
        </h2>
        
        <p className="text-zinc-400 text-sm mb-6">
          Beim Laden dieser Seite ist ein Fehler aufgetreten.
        </p>

        {error.digest && (
          <p className="text-xs text-zinc-600 mb-4 font-mono bg-[#0f0f0f] px-3 py-1.5 rounded">
            {error.digest}
          </p>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Erneut laden
          </button>
          
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
