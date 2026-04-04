'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console for debugging
    console.error('[Global Error]', error);
  }, [error]);

  return (
    <html lang="de">
      <body className="bg-[#0f0f0f] min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          
          <h1 className="text-xl font-bold text-white mb-2">
            Ein Fehler ist aufgetreten
          </h1>
          
          <p className="text-zinc-400 text-sm mb-6">
            Die Anwendung hat einen unerwarteten Fehler festgestellt.
            Bitte versuche es erneut oder lade die Seite neu.
          </p>

          {error.digest && (
            <p className="text-xs text-zinc-600 mb-4 font-mono">
              Error ID: {error.digest}
            </p>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Erneut versuchen
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="px-4 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-lg text-sm font-medium transition-colors"
            >
              Zum Dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
