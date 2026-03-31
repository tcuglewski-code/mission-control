"use client";

import { useEffect } from "react";
import { RefreshCw, AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#161616] border border-[#2a2a2a] rounded-xl p-8 text-center space-y-4">
        <div className="flex justify-center">
          <AlertTriangle className="w-12 h-12 text-red-400" />
        </div>
        <h2 className="text-xl font-semibold text-white">Etwas ist schiefgelaufen</h2>
        <p className="text-sm text-zinc-400">
          Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.
        </p>
        {error.digest && (
          <p className="text-xs text-zinc-600 font-mono">Digest: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
