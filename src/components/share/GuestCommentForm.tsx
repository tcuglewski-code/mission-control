"use client";

import { useState } from "react";
import { Send, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  token: string;
}

export function GuestCommentForm({ token }: Props) {
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState(""); // Spam-Schutz
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading" || status === "success") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/share/${token}/comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guestName.trim() || undefined,
          guestEmail: guestEmail.trim() || undefined,
          message: message.trim(),
          honeypot, // Wird auf Server geprüft
        }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("");
        setGuestName("");
        setGuestEmail("");
      } else {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error ?? "Fehler beim Senden. Bitte erneut versuchen.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Netzwerkfehler. Bitte erneut versuchen.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-500" />
        <h3 className="text-base font-bold text-zinc-900">Nachricht gesendet!</h3>
        <p className="text-sm text-zinc-500 max-w-sm">
          Vielen Dank für Ihre Nachricht. Das Projektteam wird sich bei Ihnen melden.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium mt-1"
        >
          Weitere Nachricht senden
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            Name <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Ihr Name"
            maxLength={100}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1.5">
            E-Mail <span className="text-zinc-400">(optional)</span>
          </label>
          <input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="ihre@email.de"
            maxLength={200}
            className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Honeypot-Feld — versteckt für echte Nutzer, ausgefüllt von Bots */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          name="website"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1.5">
          Ihre Nachricht <span className="text-red-500">*</span>
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Ihre Fragen, Anmerkungen oder Feedback zum Projekt…"
          rows={4}
          maxLength={2000}
          required
          className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
        />
        <div className="flex justify-between mt-1">
          <span className="text-xs text-zinc-400">Min. 5 Zeichen</span>
          <span className="text-xs text-zinc-400">{message.length}/2000</span>
        </div>
      </div>

      {status === "error" && errorMsg && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      <button
        type="submit"
        disabled={status === "loading" || message.trim().length < 5}
        className="flex items-center justify-center gap-2 w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
      >
        {status === "loading" ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Wird gesendet…
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Nachricht senden
          </>
        )}
      </button>
    </form>
  );
}
