"use client";

import { useState } from "react";
import {
  Plus,
  Copy,
  Trash2,
  ExternalLink,
  Link2,
  Shield,
  Clock,
  Eye,
  EyeOff,
  Mail,
  Check,
  MessageSquare,
  Settings2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface ShareItem {
  id: string;
  token: string;
  label?: string | null;
  expiresAt?: Date | string | null;
  showTimeTracking: boolean;
  showCosts: boolean;
  hasPassword: boolean;
  commentCount: number;
  shareUrl: string;
  fullUrl: string;
  createdAt: Date | string;
}

interface Props {
  projectId: string;
  projectName: string;
  projectColor: string;
  initialShares: ShareItem[];
  isAdmin: boolean;
  baseUrl: string;
}

export function SharingClient({
  projectId,
  projectName,
  projectColor,
  initialShares,
  isAdmin,
  baseUrl,
}: Props) {
  const [shares, setShares] = useState<ShareItem[]>(initialShares);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Create form state
  const [newLabel, setNewLabel] = useState("");
  const [newExpiresInDays, setNewExpiresInDays] = useState<string>("");
  const [newShowTime, setNewShowTime] = useState(false);
  const [newShowCosts, setNewShowCosts] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Email modal state
  const [emailModal, setEmailModal] = useState<ShareItem | null>(null);
  const [emailTo, setEmailTo] = useState("");
  const [emailName, setEmailName] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailResult, setEmailResult] = useState<{ method: string; html?: string } | null>(null);

  async function createShare() {
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel || undefined,
          expiresInDays: newExpiresInDays ? parseInt(newExpiresInDays) : null,
          showTimeTracking: newShowTime,
          showCosts: newShowCosts,
          password: newPassword || undefined,
        }),
      });
      if (!res.ok) throw new Error("Fehler");
      const data = await res.json();

      const newShare: ShareItem = {
        id: data.id,
        token: data.token,
        label: newLabel || null,
        expiresAt: newExpiresInDays
          ? new Date(Date.now() + parseInt(newExpiresInDays) * 86400000)
          : null,
        showTimeTracking: newShowTime,
        showCosts: newShowCosts,
        hasPassword: !!newPassword,
        commentCount: 0,
        shareUrl: data.shareUrl,
        fullUrl: data.fullUrl || `${baseUrl}${data.shareUrl}`,
        createdAt: new Date(),
      };
      setShares([newShare, ...shares]);
      setShowCreateForm(false);
      setNewLabel("");
      setNewExpiresInDays("");
      setNewShowTime(false);
      setNewShowCosts(false);
      setNewPassword("");
    } finally {
      setCreating(false);
    }
  }

  async function deleteShare(shareId: string, token: string) {
    if (!confirm("Share-Link wirklich widerrufen? Kunden können dann nicht mehr auf den Status zugreifen.")) return;
    await fetch(`/api/projects/${projectId}/share`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shareId }),
    });
    setShares(shares.filter((s) => s.id !== shareId));
  }

  async function copyLink(share: ShareItem) {
    const url = share.fullUrl || `${window.location.origin}${share.shareUrl}`;
    await navigator.clipboard.writeText(url);
    setCopiedToken(share.token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  async function sendEmail() {
    if (!emailModal || !emailTo) return;
    setEmailSending(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipientEmail: emailTo,
          recipientName: emailName || undefined,
          shareToken: emailModal.token,
          updateMessage: emailMessage || undefined,
        }),
      });
      const data = await res.json();
      setEmailResult(data);
    } finally {
      setEmailSending(false);
    }
  }

  const isExpired = (expiresAt?: Date | string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-emerald-950/30 border border-emerald-800/30 rounded-xl p-4 flex items-start gap-3">
        <Link2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-300">Kunden-Share-Links</p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Erstellen Sie sichere Links, mit denen Kunden den Projektstatus ohne Login einsehen können.
            Kunden können auch direkt Kommentare hinterlassen.
          </p>
        </div>
      </div>

      {/* Share-Links Liste */}
      {shares.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-3">
            <Link2 className="w-5 h-5 text-zinc-500" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Noch keine Share-Links</p>
          <p className="text-xs text-zinc-600">Erstellen Sie einen Link, um den Projektstatus mit Kunden zu teilen.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shares.map((share) => (
            <div
              key={share.id}
              className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all ${
                isExpired(share.expiresAt)
                  ? "border-red-800/40 opacity-60"
                  : "border-zinc-800"
              }`}
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-900/50 border border-emerald-800/30 flex items-center justify-center shrink-0">
                      <Link2 className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-white">
                          {share.label || "Kunden-Link"}
                        </span>
                        {share.hasPassword && (
                          <span className="flex items-center gap-1 text-xs bg-amber-900/30 text-amber-400 border border-amber-800/30 px-2 py-0.5 rounded-full">
                            <Shield className="w-3 h-3" />
                            Passwort
                          </span>
                        )}
                        {isExpired(share.expiresAt) && (
                          <span className="text-xs bg-red-900/30 text-red-400 border border-red-800/30 px-2 py-0.5 rounded-full">
                            Abgelaufen
                          </span>
                        )}
                        {share.commentCount > 0 && (
                          <span className="flex items-center gap-1 text-xs bg-blue-900/30 text-blue-400 border border-blue-800/30 px-2 py-0.5 rounded-full">
                            <MessageSquare className="w-3 h-3" />
                            {share.commentCount} Kommentar{share.commentCount !== 1 ? "e" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5 font-mono truncate">
                        {share.fullUrl || `${typeof window !== "undefined" ? window.location.origin : ""}${share.shareUrl}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {share.expiresAt && !isExpired(share.expiresAt) && (
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="w-3 h-3" />
                            Bis {format(new Date(share.expiresAt), "d. MMM yyyy", { locale: de })}
                          </span>
                        )}
                        <span className="text-xs text-zinc-600">
                          Erstellt {format(new Date(share.createdAt), "d. MMM yyyy", { locale: de })}
                        </span>
                        {share.showTimeTracking && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Zeiterfassung sichtbar
                          </span>
                        )}
                        {share.showCosts && (
                          <span className="text-xs text-zinc-500 flex items-center gap-1">
                            <Eye className="w-3 h-3" /> Kosten sichtbar
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Aktionen */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => copyLink(share)}
                      className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors"
                      title="Link kopieren"
                    >
                      {copiedToken === share.token ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span className="hidden sm:inline">{copiedToken === share.token ? "Kopiert!" : "Kopieren"}</span>
                    </button>
                    <a
                      href={share.shareUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors"
                      title="Vorschau öffnen"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Vorschau</span>
                    </a>
                    <button
                      onClick={() => {
                        setEmailModal(share);
                        setEmailResult(null);
                        setEmailTo("");
                        setEmailName("");
                        setEmailMessage("");
                      }}
                      className="flex items-center gap-1.5 text-xs bg-emerald-900/40 hover:bg-emerald-800/50 text-emerald-300 border border-emerald-800/30 px-2.5 py-1.5 rounded-lg transition-colors"
                      title="Per E-Mail senden"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">E-Mail</span>
                    </button>
                    <button
                      onClick={() => setExpandedId(expandedId === share.id ? null : share.id)}
                      className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 p-1.5 rounded-lg transition-colors"
                    >
                      {expandedId === share.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => deleteShare(share.id, share.token)}
                      className="text-xs bg-red-900/20 hover:bg-red-900/40 text-red-400 p-1.5 rounded-lg transition-colors"
                      title="Widerrufen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Erweitert: Einstellungen */}
                {expandedId === share.id && (
                  <ShareSettings
                    share={share}
                    projectId={projectId}
                    onUpdate={(updated) =>
                      setShares(shares.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)))
                    }
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Neuen Link erstellen */}
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 text-sm bg-emerald-700 hover:bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Neuen Share-Link erstellen
        </button>
      ) : (
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-zinc-400" />
            Neuer Share-Link
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Bezeichnung <span className="text-zinc-600">(optional)</span>
              </label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="z.B. Kunde Müller"
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Ablaufdatum <span className="text-zinc-600">(in Tagen, optional)</span>
              </label>
              <input
                type="number"
                value={newExpiresInDays}
                onChange={(e) => setNewExpiresInDays(e.target.value)}
                placeholder="z.B. 30"
                min={1}
                max={365}
                className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5">
              Passwortschutz <span className="text-zinc-600">(optional)</span>
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Passwort für Kunden (leer = kein Schutz)"
              className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setNewShowTime(!newShowTime)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                  newShowTime ? "bg-emerald-600" : "bg-zinc-700"
                }`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${newShowTime ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-xs text-zinc-400">Zeiterfassung zeigen</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setNewShowCosts(!newShowCosts)}
                className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${
                  newShowCosts ? "bg-emerald-600" : "bg-zinc-700"
                }`}
              >
                <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${newShowCosts ? "translate-x-4" : "translate-x-0.5"}`} />
              </div>
              <span className="text-xs text-zinc-400">Kosten zeigen</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={createShare}
              disabled={creating}
              className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {creating ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {creating ? "Wird erstellt…" : "Link erstellen"}
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-sm text-zinc-500 hover:text-zinc-300 px-3 py-2 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* E-Mail Modal */}
      {emailModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                Projekt-Update per E-Mail senden
              </h3>
              <button
                onClick={() => setEmailModal(null)}
                className="text-zinc-500 hover:text-zinc-300 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {emailResult ? (
                <div>
                  {emailResult.method === "smtp" ? (
                    <div className="flex items-center gap-3 bg-emerald-900/30 border border-emerald-800/30 rounded-xl p-4">
                      <Check className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="text-sm font-semibold text-emerald-300">E-Mail erfolgreich gesendet!</p>
                        <p className="text-xs text-zinc-400 mt-0.5">Empfänger wurde benachrichtigt.</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-amber-300 bg-amber-900/20 border border-amber-800/30 rounded-xl p-3">
                        <Mail className="w-4 h-4" />
                        <span>SMTP nicht konfiguriert — E-Mail-Vorschau:</span>
                      </div>
                      <div className="bg-white rounded-xl overflow-hidden max-h-80 overflow-y-auto text-xs">
                        <div dangerouslySetInnerHTML={{ __html: emailResult.html ?? "" }} />
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setEmailModal(null)}
                    className="w-full mt-4 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 py-2 rounded-lg"
                  >
                    Schließen
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Name des Empfängers</label>
                      <input
                        type="text"
                        value={emailName}
                        onChange={(e) => setEmailName(e.target.value)}
                        placeholder="Herr Müller"
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                        E-Mail-Adresse <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="email"
                        value={emailTo}
                        onChange={(e) => setEmailTo(e.target.value)}
                        placeholder="kunde@beispiel.de"
                        required
                        className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                      Update-Nachricht <span className="text-zinc-600">(optional)</span>
                    </label>
                    <textarea
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      placeholder="Persönliche Nachricht an den Kunden…"
                      rows={3}
                      className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600 resize-none"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={sendEmail}
                      disabled={emailSending || !emailTo}
                      className="flex items-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      {emailSending ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Mail className="w-3.5 h-3.5" />
                      )}
                      {emailSending ? "Wird gesendet…" : "E-Mail senden"}
                    </button>
                    <button
                      onClick={() => setEmailModal(null)}
                      className="text-sm text-zinc-500 hover:text-zinc-300"
                    >
                      Abbrechen
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Einstellungen-Unterkomponente für einen Share-Link
function ShareSettings({
  share,
  projectId,
  onUpdate,
}: {
  share: ShareItem;
  projectId: string;
  onUpdate: (updated: Partial<ShareItem> & { id: string }) => void;
}) {
  const [showTime, setShowTime] = useState(share.showTimeTracking);
  const [showCosts, setShowCosts] = useState(share.showCosts);
  const [expiresAt, setExpiresAt] = useState(
    share.expiresAt ? new Date(share.expiresAt).toISOString().split("T")[0] : ""
  );
  const [newPassword, setNewPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/share`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shareId: share.id,
          showTimeTracking: showTime,
          showCosts,
          expiresAt: expiresAt || null,
          password: newPassword || undefined,
          removePassword,
        }),
      });
      if (res.ok) {
        onUpdate({
          id: share.id,
          showTimeTracking: showTime,
          showCosts,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          hasPassword: removePassword ? false : newPassword ? true : share.hasPassword,
        });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        setNewPassword("");
        setRemovePassword(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-zinc-800 space-y-4">
      <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Einstellungen</h4>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">Ablaufdatum</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1.5">
            {share.hasPassword ? "Passwort ändern" : "Passwort setzen"} <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setRemovePassword(false); }}
            placeholder="Neues Passwort…"
            className="w-full bg-zinc-800 border border-zinc-700 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        <ToggleRow
          label="Zeiterfassung anzeigen"
          value={showTime}
          onChange={setShowTime}
        />
        <ToggleRow
          label="Kosten anzeigen"
          value={showCosts}
          onChange={setShowCosts}
        />
        {share.hasPassword && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={removePassword}
              onChange={(e) => { setRemovePassword(e.target.checked); if (e.target.checked) setNewPassword(""); }}
              className="w-3.5 h-3.5 accent-red-500"
            />
            <span className="text-xs text-red-400">Passwortschutz entfernen</span>
          </label>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 text-xs bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors"
      >
        {saving ? (
          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : saved ? (
          <Check className="w-3 h-3 text-emerald-400" />
        ) : (
          <Settings2 className="w-3 h-3" />
        )}
        {saved ? "Gespeichert!" : saving ? "Speichert…" : "Speichern"}
      </button>
    </div>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer" onClick={() => onChange(!value)}>
      <div
        className={`w-8 h-4 rounded-full transition-colors relative ${value ? "bg-emerald-600" : "bg-zinc-700"}`}
      >
        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
      </div>
      <span className="text-xs text-zinc-400">{label}</span>
    </label>
  );
}
