"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

interface Props {
  token: string;
  shareId: string;
}

export function SharePasswordForm({ token, shareId }: Props) {
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`/api/share/${token}/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        // Cookie gesetzt, Seite neu laden
        window.location.reload();
      } else {
        setError("Falsches Passwort. Bitte erneut versuchen.");
      }
    } catch {
      setError("Fehler beim Überprüfen. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <h2 className="text-lg font-bold text-zinc-900">Passwortgeschützter Link</h2>
        <p className="text-sm text-zinc-500 mt-1">Bitte geben Sie das Passwort ein, um fortzufahren.</p>
      </div>

      <div className="relative">
        <input
          type={showPw ? "text" : "password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Passwort eingeben"
          className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent pr-10"
          required
          autoFocus
        />
        <button
          type="button"
          onClick={() => setShowPw(!showPw)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
        >
          {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || !password}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
      >
        {loading ? "Wird überprüft…" : "Zugang bestätigen"}
      </button>
    </form>
  );
}
