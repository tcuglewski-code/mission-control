"use client";

import { useEffect, useState } from "react";
import {
  User,
  Lock,
  Bell,
  Key,
  Save,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  Plus,
  Loader2,
  ShieldCheck,
  MapIcon,
  Palette,
  Sun,
  Moon,
  Trees,
  Monitor,
  Layout,
  Shield,
  ShieldOff,
  RefreshCw,
  QrCode,
  Smartphone,
} from "lucide-react";
import { MC_ROLES } from "@/lib/permissions";
import { useThemeStore, ThemeOption } from "@/store/useThemeStore";

interface ProfileData {
  id: string;
  username: string;
  email?: string;
  role: string;
  mcRole: string;
  active: boolean;
  notifEmailDigest: boolean;
  notifPush: boolean;
  createdAt: string;
  twoFactorEnabled?: boolean;
}

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

type Tab = "profil" | "passwort" | "sicherheit" | "benachrichtigungen" | "api-keys" | "darstellung";

function Avatar({ name, size = "lg" }: { name: string; size?: "sm" | "lg" }) {
  const initials = name.slice(0, 2).toUpperCase();
  const sz = size === "lg" ? "w-16 h-16 text-xl" : "w-8 h-8 text-xs";
  return (
    <div
      className={`${sz} rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center font-semibold text-emerald-400`}
    >
      {initials}
    </div>
  );
}

export function ProfileClient() {
  const [tab, setTab] = useState<Tab>("profil");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profil form
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState<string>("0");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Passwort form
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Notification settings
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifMsg, setNotifMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Tour
  const [tourRestarting, setTourRestarting] = useState(false);
  const [tourMsg, setTourMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Theme & Darstellung
  const { theme: storeTheme, compact: storeCompact, setTheme: setStoreTheme, setCompact: setStoreCompact } = useThemeStore();
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(storeTheme);
  const [selectedCompact, setSelectedCompact] = useState(storeCompact);
  const [darstellungSaving, setDarstellungSaving] = useState(false);
  const [darstellungMsg, setDarstellungMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorSetupMode, setTwoFactorSetupMode] = useState(false);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState<string | null>(null);
  const [twoFactorSecret, setTwoFactorSecret] = useState<string | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorBackupCodes, setTwoFactorBackupCodes] = useState<string[]>([]);
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorMsg, setTwoFactorMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [backupCodesPassword, setBackupCodesPassword] = useState("");
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (tab === "api-keys") loadApiKeys();
  }, [tab]);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/profile");
      if (res.ok) {
        const data: ProfileData = await res.json();
        setProfile(data);
        setEditName(data.username);
        setEditEmail(data.email ?? "");
        setEditHourlyRate(String((data as ProfileData & { hourlyRate?: number }).hourlyRate ?? 0));
        setNotifEmail(data.notifEmailDigest);
        setNotifPush(data.notifPush);
        setTwoFactorEnabled(data.twoFactorEnabled ?? false);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadApiKeys() {
    setKeysLoading(true);
    try {
      const res = await fetch("/api/settings/profile/api-keys");
      if (res.ok) setApiKeys(await res.json());
    } finally {
      setKeysLoading(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: editName, email: editEmail || null, hourlyRate: parseFloat(editHourlyRate) || 0 }),
      });
      const data = await res.json();
      if (res.ok) {
        setProfile((p) => p ? { ...p, username: data.username, email: data.email } : p);
        setProfileMsg({ type: "ok", text: "Profil erfolgreich gespeichert" });
      } else {
        setProfileMsg({ type: "err", text: data.error ?? "Fehler beim Speichern" });
      }
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ type: "err", text: "Passwörter stimmen nicht überein" });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "err", text: "Passwort muss mindestens 8 Zeichen lang sein" });
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch("/api/settings/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwMsg({ type: "ok", text: "Passwort erfolgreich geändert" });
        setCurrentPw("");
        setNewPw("");
        setConfirmPw("");
      } else {
        setPwMsg({ type: "err", text: data.error ?? "Fehler beim Ändern" });
      }
    } finally {
      setPwSaving(false);
    }
  }

  async function saveNotifications() {
    setNotifSaving(true);
    setNotifMsg(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifEmailDigest: notifEmail, notifPush: notifPush }),
      });
      if (res.ok) {
        setNotifMsg({ type: "ok", text: "Einstellungen gespeichert" });
      } else {
        setNotifMsg({ type: "err", text: "Fehler beim Speichern" });
      }
    } finally {
      setNotifSaving(false);
    }
  }

  async function restartTour() {
    setTourRestarting(true);
    setTourMsg(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tourComplete: false }),
      });
      if (res.ok) {
        setTourMsg({ type: "ok", text: "Tour zurückgesetzt — beim nächsten Dashboard-Besuch startet sie automatisch." });
      } else {
        setTourMsg({ type: "err", text: "Fehler beim Zurücksetzen" });
      }
    } finally {
      setTourRestarting(false);
    }
  }

  async function createApiKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const res = await fetch("/api/settings/profile/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.key) {
        setCreatedKey(data.key);
        setNewKeyName("");
        loadApiKeys();
      }
    } finally {
      setCreatingKey(false);
    }
  }

  async function deleteApiKey(id: string, name: string) {
    if (!confirm(`API-Key "${name}" wirklich löschen?`)) return;
    await fetch(`/api/settings/profile/api-keys?id=${id}`, { method: "DELETE" });
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
  }

  async function saveDarstellung() {
    setDarstellungSaving(true);
    setDarstellungMsg(null);
    try {
      const res = await fetch("/api/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: selectedTheme, compact: selectedCompact }),
      });
      if (res.ok) {
        setStoreTheme(selectedTheme);
        setStoreCompact(selectedCompact);
        setDarstellungMsg({ type: "ok", text: "Darstellungseinstellungen gespeichert" });
      } else {
        setDarstellungMsg({ type: "err", text: "Fehler beim Speichern" });
      }
    } finally {
      setDarstellungSaving(false);
    }
  }

  function copyKey() {
    if (!createdKey) return;
    navigator.clipboard.writeText(createdKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }

  // 2FA Functions
  async function startTwoFactorSetup() {
    setTwoFactorLoading(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorQrCode(data.qrCode);
        setTwoFactorSecret(data.secret);
        setTwoFactorSetupMode(true);
      } else {
        setTwoFactorMsg({ type: "err", text: data.error ?? "Fehler beim Setup" });
      }
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function verifyTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setTwoFactorLoading(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: twoFactorToken }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(true);
        setTwoFactorSetupMode(false);
        setTwoFactorBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setTwoFactorToken("");
        setTwoFactorMsg({ type: "ok", text: "2FA erfolgreich aktiviert!" });
      } else {
        setTwoFactorMsg({ type: "err", text: data.error ?? "Ungültiger Code" });
      }
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function disableTwoFactor(e: React.FormEvent) {
    e.preventDefault();
    setTwoFactorLoading(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(false);
        setDisablePassword("");
        setTwoFactorMsg({ type: "ok", text: "2FA wurde deaktiviert" });
      } else {
        setTwoFactorMsg({ type: "err", text: data.error ?? "Fehler beim Deaktivieren" });
      }
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function regenerateBackupCodes(e: React.FormEvent) {
    e.preventDefault();
    setTwoFactorLoading(true);
    setTwoFactorMsg(null);
    try {
      const res = await fetch("/api/auth/2fa/backup-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: backupCodesPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        setBackupCodesPassword("");
        setTwoFactorMsg({ type: "ok", text: "Neue Backup-Codes generiert!" });
      } else {
        setTwoFactorMsg({ type: "err", text: data.error ?? "Fehler beim Generieren" });
      }
    } finally {
      setTwoFactorLoading(false);
    }
  }

  function cancelTwoFactorSetup() {
    setTwoFactorSetupMode(false);
    setTwoFactorQrCode(null);
    setTwoFactorSecret(null);
    setTwoFactorToken("");
    setTwoFactorMsg(null);
  }

  const roleInfo = MC_ROLES.find((r) => r.value === profile?.mcRole) ?? MC_ROLES[2];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Profile Header */}
      {profile && (
        <div className="flex items-center gap-4 mb-8 p-5 bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl">
          <Avatar name={profile.username} size="lg" />
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {profile.username}
            </h1>
            {profile.email && (
              <p className="text-sm text-zinc-500 truncate">{profile.email}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${roleInfo.bg} ${roleInfo.color}`}
              >
                {profile.mcRole === "admin" ? (
                  <ShieldCheck className="w-3 h-3" />
                ) : (
                  <User className="w-3 h-3" />
                )}
                {roleInfo.label}
              </span>
              <span className="text-xs text-zinc-600">
                Mitglied seit {new Date(profile.createdAt).toLocaleDateString("de-DE")}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-[#2a2a2a] overflow-x-auto">
        {[
          { id: "profil" as Tab, icon: User, label: "Profil" },
          { id: "passwort" as Tab, icon: Lock, label: "Passwort" },
          { id: "sicherheit" as Tab, icon: Shield, label: "Sicherheit" },
          { id: "benachrichtigungen" as Tab, icon: Bell, label: "Benachrichtigungen" },
          { id: "api-keys" as Tab, icon: Key, label: "API-Keys" },
          { id: "darstellung" as Tab, icon: Palette, label: "Darstellung" },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === id
                ? "border-emerald-500 text-emerald-500 dark:text-emerald-400"
                : "border-transparent text-zinc-500 hover:text-gray-900 dark:hover:text-zinc-300"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── PROFIL TAB ── */}
      {tab === "profil" && (
        <>
        <form onSubmit={saveProfile} className="space-y-5">
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Persönliche Daten
            </h2>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Benutzername
              </label>
              <div className="flex items-center gap-3">
                <Avatar name={editName || "U"} size="sm" />
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="Dein Name"
                  required
                  minLength={2}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                E-Mail-Adresse
              </label>
              <input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Stundensatz (€/h)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-400">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editHourlyRate}
                  onChange={(e) => setEditHourlyRate(e.target.value)}
                  className="w-28 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  placeholder="0"
                />
                <span className="text-xs text-zinc-500">pro Stunde — für Personalkosten-Kalkulation</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Rolle</label>
              <p className={`text-sm font-medium ${roleInfo.color}`}>{roleInfo.label}</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                Rollen können nur von Administratoren geändert werden.
              </p>
            </div>
          </div>

          {profileMsg && (
            <div
              className={`p-3 rounded-lg text-sm ${
                profileMsg.type === "ok"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {profileMsg.type === "ok" ? "✓ " : "⚠️ "}
              {profileMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={profileSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {profileSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Änderungen speichern
          </button>
        </form>

        {/* Dashboard-Tour neu starten */}
        <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MapIcon className="w-4 h-4 text-emerald-400" />
            Dashboard-Tour
          </h2>
          <p className="text-xs text-zinc-500">
            Die geführte Tour zeigt dir die wichtigsten Funktionen von Mission Control.
            Du kannst sie jederzeit neu starten.
          </p>
          {tourMsg && (
            <div
              className={`p-3 rounded-lg text-xs ${
                tourMsg.type === "ok"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {tourMsg.type === "ok" ? "✓ " : "⚠️ "}
              {tourMsg.text}
            </div>
          )}
          <button
            onClick={restartTour}
            disabled={tourRestarting}
            className="flex items-center gap-2 px-4 py-2 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/5 text-emerald-400 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
          >
            {tourRestarting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapIcon className="w-4 h-4" />
            )}
            Tour neu starten
          </button>
        </div>
        </>
      )}

      {/* ── PASSWORT TAB ── */}
      {tab === "passwort" && (
        <form onSubmit={changePassword} className="space-y-5">
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Passwort ändern
            </h2>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Aktuelles Passwort
              </label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 pr-10 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Neues Passwort
              </label>
              <input
                type={showPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                required
                minLength={8}
                placeholder="Mindestens 8 Zeichen"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">
                Neues Passwort bestätigen
              </label>
              <input
                type={showPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className={`w-full bg-gray-50 dark:bg-[#1c1c1c] border rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors ${
                  confirmPw && confirmPw !== newPw
                    ? "border-red-500/50"
                    : "border-gray-200 dark:border-[#2a2a2a]"
                }`}
                required
              />
              {confirmPw && confirmPw !== newPw && (
                <p className="text-xs text-red-400 mt-1">Passwörter stimmen nicht überein</p>
              )}
            </div>
          </div>

          {pwMsg && (
            <div
              className={`p-3 rounded-lg text-sm ${
                pwMsg.type === "ok"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {pwMsg.type === "ok" ? "✓ " : "⚠️ "}
              {pwMsg.text}
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving || (!!confirmPw && confirmPw !== newPw)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {pwSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
            Passwort ändern
          </button>
        </form>
      )}

      {/* ── SICHERHEIT TAB (2FA) ── */}
      {tab === "sicherheit" && (
        <div className="space-y-5">
          {/* 2FA Status */}
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${twoFactorEnabled ? 'bg-emerald-500/20' : 'bg-zinc-500/20'}`}>
                  {twoFactorEnabled ? (
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <ShieldOff className="w-5 h-5 text-zinc-400" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Zwei-Faktor-Authentifizierung (2FA)
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {twoFactorEnabled 
                      ? "Dein Account ist durch 2FA geschützt" 
                      : "Erhöhe die Sicherheit deines Accounts mit 2FA"}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                twoFactorEnabled 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : 'bg-zinc-500/20 text-zinc-400'
              }`}>
                {twoFactorEnabled ? 'Aktiviert' : 'Deaktiviert'}
              </span>
            </div>

            {twoFactorMsg && (
              <div className={`p-3 rounded-lg text-sm ${
                twoFactorMsg.type === "ok"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}>
                {twoFactorMsg.type === "ok" ? "✓ " : "⚠️ "}
                {twoFactorMsg.text}
              </div>
            )}

            {!twoFactorEnabled && !twoFactorSetupMode && (
              <button
                onClick={startTwoFactorSetup}
                disabled={twoFactorLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
              >
                {twoFactorLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Smartphone className="w-4 h-4" />
                )}
                2FA aktivieren
              </button>
            )}

            {/* Setup Mode: QR-Code + Verification */}
            {twoFactorSetupMode && twoFactorQrCode && (
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <img 
                        src={twoFactorQrCode} 
                        alt="2FA QR-Code" 
                        className="w-40 h-40 rounded-lg border border-gray-200 dark:border-[#2a2a2a]"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-emerald-400" />
                        Schritt 1: QR-Code scannen
                      </h3>
                      <p className="text-xs text-zinc-500 mb-3">
                        Öffne deine Authenticator-App (Google Authenticator, Authy, 1Password, etc.) 
                        und scanne den QR-Code.
                      </p>
                      <div className="space-y-2">
                        <p className="text-xs text-zinc-500">
                          Oder gib diesen Code manuell ein:
                        </p>
                        <code className="block px-3 py-2 bg-black/30 rounded-md text-xs font-mono text-amber-300 break-all select-all">
                          {twoFactorSecret}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={verifyTwoFactor} className="bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    Schritt 2: Code verifizieren
                  </h3>
                  <p className="text-xs text-zinc-500 mb-3">
                    Gib den 6-stelligen Code aus deiner Authenticator-App ein:
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={twoFactorToken}
                      onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="flex-1 bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-center text-2xl font-mono tracking-widest text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={twoFactorLoading || twoFactorToken.length !== 6}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      {twoFactorLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Aktivieren"
                      )}
                    </button>
                  </div>
                </form>

                <button
                  type="button"
                  onClick={cancelTwoFactorSetup}
                  className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            )}

            {/* Backup Codes Display */}
            {showBackupCodes && twoFactorBackupCodes.length > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-medium text-amber-300">
                    Backup-Codes — Nur jetzt sichtbar!
                  </h3>
                </div>
                <p className="text-xs text-amber-200/70">
                  Speichere diese Codes sicher ab. Du kannst sie verwenden, wenn du keinen Zugang 
                  zu deiner Authenticator-App hast. Jeder Code kann nur einmal verwendet werden.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {twoFactorBackupCodes.map((code, i) => (
                    <code 
                      key={i} 
                      className="px-3 py-2 bg-black/30 rounded-md text-sm font-mono text-amber-200 text-center select-all"
                    >
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(twoFactorBackupCodes.join('\n'));
                    setTwoFactorMsg({ type: "ok", text: "Backup-Codes kopiert!" });
                  }}
                  className="flex items-center gap-2 text-xs text-amber-300 hover:text-amber-200 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Alle kopieren
                </button>
                <button
                  onClick={() => setShowBackupCodes(false)}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Schließen
                </button>
              </div>
            )}
          </div>

          {/* Disable 2FA / Regenerate Backup Codes */}
          {twoFactorEnabled && !twoFactorSetupMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Regenerate Backup Codes */}
              <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  Neue Backup-Codes
                </h3>
                <p className="text-xs text-zinc-500">
                  Generiere neue Backup-Codes. Alle bisherigen Codes werden ungültig.
                </p>
                <form onSubmit={regenerateBackupCodes} className="space-y-3">
                  <input
                    type="password"
                    value={backupCodesPassword}
                    onChange={(e) => setBackupCodesPassword(e.target.value)}
                    placeholder="Passwort bestätigen"
                    className="w-full bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    disabled={twoFactorLoading || !backupCodesPassword}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/5 text-emerald-400 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {twoFactorLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Neue Codes generieren
                  </button>
                </form>
              </div>

              {/* Disable 2FA */}
              <div className="bg-white dark:bg-[#161616] border border-red-500/20 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShieldOff className="w-4 h-4 text-red-400" />
                  2FA deaktivieren
                </h3>
                <p className="text-xs text-zinc-500">
                  Deaktiviert 2FA für deinen Account. Dies verringert die Sicherheit.
                </p>
                <form onSubmit={disableTwoFactor} className="space-y-3">
                  <input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Passwort bestätigen"
                    className="w-full bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-red-500/50 transition-colors"
                    required
                  />
                  <button
                    type="submit"
                    disabled={twoFactorLoading || !disablePassword}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-500/30 hover:border-red-500 hover:bg-red-500/5 text-red-400 text-sm font-medium rounded-md transition-colors disabled:opacity-50"
                  >
                    {twoFactorLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldOff className="w-4 h-4" />
                    )}
                    2FA deaktivieren
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BENACHRICHTIGUNGEN TAB ── */}
      {tab === "benachrichtigungen" && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Benachrichtigungseinstellungen
            </h2>

            {/* Email Digest */}
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-lg cursor-pointer hover:border-emerald-500/30 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  E-Mail-Digest
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Tägliche Zusammenfassung aller Aktivitäten per E-Mail erhalten
                </p>
              </div>
              <div
                onClick={() => setNotifEmail((v) => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                  notifEmail ? "bg-emerald-500" : "bg-zinc-600"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    notifEmail ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </div>
            </label>

            {/* Push */}
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-lg cursor-pointer hover:border-emerald-500/30 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Push-Benachrichtigungen
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Browser-Push-Benachrichtigungen für wichtige Ereignisse
                </p>
              </div>
              <div
                onClick={() => setNotifPush((v) => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors cursor-pointer ${
                  notifPush ? "bg-emerald-500" : "bg-zinc-600"
                }`}
              >
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    notifPush ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </div>
            </label>
          </div>

          {notifMsg && (
            <div
              className={`p-3 rounded-lg text-sm ${
                notifMsg.type === "ok"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {notifMsg.type === "ok" ? "✓ " : "⚠️ "}
              {notifMsg.text}
            </div>
          )}

          <button
            onClick={saveNotifications}
            disabled={notifSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {notifSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Einstellungen speichern
          </button>
        </div>
      )}

      {/* ── API KEYS TAB ── */}
      {tab === "api-keys" && (
        <div className="space-y-5">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-300">
              <span className="font-medium">API-Keys</span> ermöglichen den Zugriff auf die Mission
              Control API von externen Anwendungen oder Agenten.{" "}
              <code className="text-xs bg-black/30 px-1.5 py-0.5 rounded font-mono">
                Authorization: Bearer mc_live_...
              </code>
            </p>
          </div>

          {/* Create Key Form */}
          <form
            onSubmit={createApiKey}
            className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5"
          >
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Neuen API-Key erstellen
            </h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-md px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                placeholder="z.B. Mein Claude Agent"
                required
              />
              <button
                type="submit"
                disabled={creatingKey || !newKeyName.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm rounded-md transition-colors"
              >
                {creatingKey ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Erstellen
              </button>
            </div>
          </form>

          {/* Newly created key */}
          {createdKey && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 space-y-3">
              <p className="text-sm font-medium text-amber-300">
                ⚠️ Nur jetzt sichtbar — kopiere diesen Key und bewahre ihn sicher auf!
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={createdKey}
                  className="flex-1 bg-black/30 border border-amber-500/20 rounded-md px-3 py-2 text-xs text-amber-200 font-mono select-all"
                />
                <button
                  onClick={copyKey}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs rounded-md transition-colors"
                >
                  {keyCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {keyCopied ? "Kopiert!" : "Kopieren"}
                </button>
              </div>
              <button
                onClick={() => { setCreatedKey(null); setKeyCopied(false); }}
                className="text-xs text-amber-400/70 hover:text-amber-300 transition-colors"
              >
                Schließen
              </button>
            </div>
          )}

          {/* Keys List */}
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
            {keysLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-5 h-5 text-emerald-400 animate-spin" />
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="py-10 text-center">
                <Key className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm text-zinc-500">Noch keine API-Keys vorhanden</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#2a2a2a]">
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">Prefix</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                      Zuletzt genutzt
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-zinc-500">
                      Erstellt
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr
                      key={k.id}
                      className="border-b border-gray-100 dark:border-[#1e1e1e] hover:bg-gray-50 dark:hover:bg-[#1c1c1c] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Key className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {k.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs text-zinc-400 bg-gray-100 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] px-2 py-0.5 rounded font-mono">
                          {k.keyPrefix}...
                        </code>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {k.lastUsedAt
                          ? new Date(k.lastUsedAt).toLocaleString("de-DE")
                          : "Noch nie"}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-500">
                        {new Date(k.createdAt).toLocaleDateString("de-DE")}
                        {k.expiresAt && (
                          <span className="ml-1 text-amber-400">
                            (läuft ab: {new Date(k.expiresAt).toLocaleDateString("de-DE")})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => deleteApiKey(k.id, k.name)}
                          className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── DARSTELLUNG TAB ── */}
      {tab === "darstellung" && (
        <div className="space-y-6">
          {/* Theme-Auswahl */}
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-emerald-400" />
              Farbschema
            </h2>
            <p className="text-xs text-zinc-500">
              Wähle ein Theme für Mission Control. &quot;System&quot; übernimmt automatisch die
              Einstellung deines Betriebssystems.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: "light" as ThemeOption, label: "Hell", desc: "Weißer Hintergrund", icon: Sun, iconClass: "text-amber-500", preview: <div className="w-full h-16 rounded-lg bg-white border border-gray-200 mb-3 overflow-hidden flex flex-col"><div className="h-3 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-1"><div className="w-1.5 h-1.5 rounded-full bg-gray-300" /><div className="w-8 h-1 rounded bg-gray-300" /></div><div className="flex-1 p-1.5 flex gap-1"><div className="w-10 bg-gray-100 rounded" /><div className="flex-1 space-y-1"><div className="h-1.5 bg-gray-200 rounded w-3/4" /><div className="h-1.5 bg-emerald-200 rounded w-1/2" /></div></div></div> },
                { value: "dark" as ThemeOption, label: "Dunkel", desc: "Dunkler Hintergrund", icon: Moon, iconClass: "text-blue-400", preview: <div className="w-full h-16 rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] mb-3 overflow-hidden flex flex-col"><div className="h-3 bg-[#1c1c1c] border-b border-[#2a2a2a] flex items-center px-2 gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#3a3a3a]" /><div className="w-8 h-1 rounded bg-[#3a3a3a]" /></div><div className="flex-1 p-1.5 flex gap-1"><div className="w-10 bg-[#1c1c1c] rounded" /><div className="flex-1 space-y-1"><div className="h-1.5 bg-[#2a2a2a] rounded w-3/4" /><div className="h-1.5 bg-emerald-900 rounded w-1/2" /></div></div></div> },
                { value: "wald" as ThemeOption, label: "Wald", desc: "Dunkelgrün + Gold", icon: Trees, iconClass: "text-emerald-500", preview: <div className="w-full h-16 rounded-lg bg-[#1a2e1a] border border-[#2d4a2d] mb-3 overflow-hidden flex flex-col"><div className="h-3 bg-[#1f361f] border-b border-[#2d4a2d] flex items-center px-2 gap-1"><div className="w-1.5 h-1.5 rounded-full bg-[#3a5a3a]" /><div className="w-8 h-1 rounded bg-[#3a5a3a]" /></div><div className="flex-1 p-1.5 flex gap-1"><div className="w-10 bg-[#1f361f] rounded" /><div className="flex-1 space-y-1"><div className="h-1.5 bg-[#2d4a2d] rounded w-3/4" /><div className="h-1.5 rounded w-1/2" style={{backgroundColor:"#FFB300"}} /></div></div></div> },
                { value: "system" as ThemeOption, label: "System", desc: "Automatisch (OS)", icon: Monitor, iconClass: "text-zinc-400", preview: <div className="w-full h-16 rounded-lg mb-3 overflow-hidden flex border border-gray-200 dark:border-[#2a2a2a]"><div className="w-1/2 bg-white" /><div className="w-1/2 bg-[#0f0f0f]" /></div> },
              ] as const).map(({ value, label, desc, icon: Icon, iconClass, preview }) => (
                <button
                  key={value}
                  onClick={() => setSelectedTheme(value)}
                  className={"relative p-4 rounded-xl border-2 transition-all text-left " + (selectedTheme === value ? (value === "wald" ? "border-amber-500 bg-amber-500/5" : "border-emerald-500 bg-emerald-500/5") : "border-gray-200 dark:border-[#2a2a2a] hover:border-emerald-500/40")}
                >
                  {preview}
                  <div className="flex items-center gap-2">
                    <Icon className={"w-4 h-4 " + iconClass} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                    {selectedTheme === value && <Check className={`w-3.5 h-3.5 ml-auto ${value === "wald" ? "text-amber-500" : "text-emerald-500"}`} />}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Kompaktmodus */}
          <div className="bg-white dark:bg-[#161616] border border-gray-200 dark:border-[#2a2a2a] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Layout className="w-4 h-4 text-emerald-400" />
              Kompakte Darstellung
            </h2>
            <label className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#1c1c1c] border border-gray-200 dark:border-[#2a2a2a] rounded-lg cursor-pointer hover:border-emerald-500/30 transition-colors">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Kompaktmodus aktivieren</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Reduziert Abstände und Schriftgröße um ~30% — ideal für dichte Arbeit mit vielen Tasks
                </p>
              </div>
              <div
                onClick={() => setSelectedCompact((v) => !v)}
                className={"relative w-10 h-6 rounded-full transition-colors cursor-pointer flex-shrink-0 " + (selectedCompact ? "bg-emerald-500" : "bg-zinc-600")}
              >
                <div className={"absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform " + (selectedCompact ? "translate-x-5" : "translate-x-1")} />
              </div>
            </label>
            <p className="text-xs text-zinc-500">
              💡 Kompaktmodus verkleinert Padding, Schriften und Buttons systemweit. Nützlich auf kleineren Bildschirmen oder bei vielen gleichzeitigen Tasks.
            </p>
          </div>

          {darstellungMsg && (
            <div className={"p-3 rounded-lg text-sm " + (darstellungMsg.type === "ok" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400")}>
              {darstellungMsg.type === "ok" ? "✓ " : "⚠️ "}
              {darstellungMsg.text}
            </div>
          )}

          <button
            onClick={saveDarstellung}
            disabled={darstellungSaving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {darstellungSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Einstellungen speichern
          </button>
        </div>
      )}
    </div>
  );
}
