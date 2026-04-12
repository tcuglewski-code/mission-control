"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Zap, Loader2, Shield, Key } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 2FA Flow States
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!requiresTwoFactor) {
        // Schritt 1: Prüfe ob 2FA erforderlich ist
        const checkRes = await fetch("/api/login/2fa-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        
        const checkData = await checkRes.json();
        
        if (!checkRes.ok) {
          setError(checkData.error || "Ungültige Anmeldedaten");
          setLoading(false);
          return;
        }

        if (checkData.requiresTwoFactor) {
          // 2FA erforderlich → zeige Token-Eingabe
          setRequiresTwoFactor(true);
          setLoading(false);
          return;
        }

        // Kein 2FA → direkt anmelden
        const result = await signIn("credentials", {
          username,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Ungültige Anmeldedaten. Bitte erneut versuchen.");
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        // Schritt 2: 2FA Token validieren
        const validateRes = await fetch("/api/auth/2fa/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            username, 
            password, 
            token: totpToken,
            isBackupCode: useBackupCode
          })
        });

        const validateData = await validateRes.json();

        if (!validateRes.ok) {
          setError(validateData.error || "Ungültiger Code");
          setLoading(false);
          return;
        }

        // 2FA erfolgreich → jetzt anmelden
        // Wir nutzen einen speziellen Parameter um 2FA-bypass zu signalisieren
        const result = await signIn("credentials", {
          username,
          password,
          twoFactorValidated: "true",
          redirect: false,
        });

        if (result?.error) {
          setError("Anmeldung fehlgeschlagen. Bitte erneut versuchen.");
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      }
    } catch {
      setError("Ein Fehler ist aufgetreten. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setRequiresTwoFactor(false);
    setTotpToken("");
    setUseBackupCode(false);
    setError("");
  };

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-6 h-6 text-emerald-400" />
          <span className="text-xl font-semibold text-white">Mission Control</span>
        </div>

        {/* Card */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl p-6 shadow-xl">
          {!requiresTwoFactor ? (
            <>
              <h1 className="text-lg font-semibold text-white mb-1">Anmelden</h1>
              <p className="text-sm text-zinc-500 mb-6">Melde dich mit deinen Zugangsdaten an</p>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-1">
                <Shield className="w-5 h-5 text-emerald-400" />
                <h1 className="text-lg font-semibold text-white">Zwei-Faktor-Authentifizierung</h1>
              </div>
              <p className="text-sm text-zinc-500 mb-6">
                {useBackupCode 
                  ? "Gib einen deiner Backup-Codes ein" 
                  : "Gib den Code aus deiner Authenticator-App ein"}
              </p>
            </>
          )}

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2 mb-4">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!requiresTwoFactor ? (
              // Schritt 1: Username & Passwort
              <>
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
                    placeholder="tomek"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-zinc-400">
                      Passwort
                    </label>
                    <a
                      href="/forgot-password"
                      className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                    >
                      Passwort vergessen?
                    </a>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </>
            ) : (
              // Schritt 2: 2FA Token
              <>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                    {useBackupCode ? "Backup-Code" : "Authentifizierungscode"}
                  </label>
                  <input
                    type="text"
                    value={totpToken}
                    onChange={(e) => setTotpToken(e.target.value.replace(/\s/g, ''))}
                    required
                    autoFocus
                    placeholder={useBackupCode ? "XXXX-XXXX" : "000000"}
                    maxLength={useBackupCode ? 9 : 6}
                    className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-white text-center text-2xl font-mono tracking-widest placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setUseBackupCode(!useBackupCode)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
                >
                  <Key className="w-4 h-4" />
                  {useBackupCode 
                    ? "Authenticator-App verwenden" 
                    : "Backup-Code verwenden"}
                </button>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-4 py-2 rounded-md transition-colors"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading 
                ? (requiresTwoFactor ? "Wird überprüft..." : "Anmelden...") 
                : (requiresTwoFactor ? "Verifizieren" : "Anmelden")}
            </button>

            {requiresTwoFactor && (
              <button
                type="button"
                onClick={handleBackToLogin}
                className="w-full text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Zurück zur Anmeldung
              </button>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Mission Control · Amadeus AI Platform
        </p>
      </div>
    </div>
  );
}
