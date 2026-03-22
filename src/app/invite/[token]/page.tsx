"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Zap, Loader2 } from "lucide-react";

export default function InvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [valid, setValid] = useState<boolean | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/invite/${token}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setValid(false);
          setError(data.error);
        } else {
          setValid(true);
          setInviteEmail(data.email ?? "");
        }
      })
      .catch(() => setValid(false));
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein");
      return;
    }

    if (password.length < 8) {
      setError("Passwort muss mindestens 8 Zeichen haben");
      return;
    }

    setLoading(true);

    const res = await fetch(`/api/invite/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Fehler beim Registrieren");
    } else {
      router.push("/login?registered=1");
    }
  }

  if (valid === null) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-6 h-6 text-emerald-400" />
          <span className="text-xl font-semibold text-white">Mission Control</span>
        </div>

        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 shadow-xl">
          <h1 className="text-lg font-semibold text-white mb-1">Account erstellen</h1>
          <p className="text-sm text-zinc-500 mb-6">
            {valid
              ? "Wähle einen Benutzernamen und ein Passwort"
              : "Einladungslink ungültig oder abgelaufen"}
          </p>

          {!valid ? (
            <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
              {error}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {inviteEmail && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">E-Mail</label>
                  <input
                    type="text"
                    value={inviteEmail}
                    disabled
                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-zinc-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Benutzername
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                  placeholder="mein-username"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Passwort</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Passwort bestätigen
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Registrieren..." : "Account erstellen"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
