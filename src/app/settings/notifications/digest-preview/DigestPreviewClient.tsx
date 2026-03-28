"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Mail, ExternalLink, ArrowLeft } from "lucide-react";
import Link from "next/link";

export function DigestPreviewClient() {
  const [html, setHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPreview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/digest/preview");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Vorschau konnte nicht geladen werden");
        return;
      }
      const text = await res.text();
      setHtml(text);
    } catch (e) {
      setError("Netzwerkfehler beim Laden der Vorschau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPreview();
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#2a2a2a] bg-[#0f0f0f] shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/notifications"
            className="flex items-center gap-1.5 text-zinc-500 hover:text-white transition-colors text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Zurück
          </Link>
          <span className="text-zinc-700">·</span>
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-white">E-Mail Digest Vorschau</span>
          </div>
          <span className="text-xs text-zinc-600 hidden sm:inline">
            So sieht dein täglicher Digest per E-Mail aus
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadPreview}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#1c1c1c] rounded-md transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Aktualisieren
          </button>
          <a
            href="/api/digest/preview"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-[#1c1c1c] rounded-md transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Im neuen Tab öffnen
          </a>
        </div>
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-y-auto bg-[#050505]">
        {loading ? (
          <div className="flex items-center justify-center h-64 gap-3 text-zinc-500">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm">Lade Vorschau…</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
            <Mail className="w-10 h-10 text-zinc-700" />
            <p className="text-zinc-500 text-sm">{error}</p>
            <button
              onClick={loadPreview}
              className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors"
            >
              Erneut versuchen
            </button>
          </div>
        ) : html ? (
          <div className="p-6">
            {/* Email-Client-Simulation */}
            <div className="max-w-[680px] mx-auto">
              {/* Simulierter Email-Header */}
              <div className="bg-[#111] border border-[#222] rounded-t-xl px-6 py-4 mb-0">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm flex-shrink-0">
                    🌲
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-sm font-medium text-white">Mission Control</span>
                        <span className="text-xs text-zinc-500 ml-2">&lt;noreply@koch-aufforstung.de&gt;</span>
                      </div>
                      <span className="text-xs text-zinc-600 flex-shrink-0">Heute 07:00 Uhr</span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      🌲 Mission Control Digest — Tagesübersicht
                    </p>
                  </div>
                </div>
              </div>

              {/* Email-Inhalt als iframe */}
              <div className="border border-[#222] border-t-0 rounded-b-xl overflow-hidden">
                <iframe
                  srcDoc={html}
                  className="w-full border-0"
                  style={{ minHeight: "800px" }}
                  title="E-Mail Digest Vorschau"
                  onLoad={(e) => {
                    // Höhe automatisch anpassen
                    const iframe = e.currentTarget;
                    try {
                      iframe.style.height =
                        (iframe.contentDocument?.documentElement?.scrollHeight ?? 800) + "px";
                    } catch {}
                  }}
                />
              </div>

              <p className="text-center text-xs text-zinc-700 mt-4">
                Dies ist eine Vorschau des E-Mail-Digests mit deinen aktuellen ungelesenen Benachrichtigungen.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
