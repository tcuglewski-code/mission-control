"use client";

import { useState } from "react";
import { LayoutTemplate, X, Loader2, Check } from "lucide-react";

interface SaveAsTemplateButtonProps {
  projectId: string;
  projectName: string;
}

export function SaveAsTemplateButton({ projectId, projectName }: SaveAsTemplateButtonProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(`${projectName} — Vorlage`);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleOpen() {
    setName(`${projectName} — Vorlage`);
    setDescription("");
    setCategory("");
    setError("");
    setSuccess("");
    setOpen(true);
  }

  async function handleSave() {
    setError("");
    if (!name.trim()) { setError("Name ist erforderlich"); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/save-as-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          category: category || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Fehler beim Speichern");
      }
      const data = await res.json();
      setSuccess(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded hover:bg-emerald-500/10 border border-emerald-500/20 transition-colors"
      >
        <LayoutTemplate className="w-3.5 h-3.5" />
        Als Vorlage
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-[#2a2a2a]">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white">Als Vorlage speichern</h2>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Tasks werden ohne Daten & Zuweisungen übernommen
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {success ? (
                <>
                  <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                    <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-sm text-emerald-400">{success}</p>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setOpen(false)}
                      className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
                    >
                      Schließen
                    </button>
                    <a
                      href="/templates"
                      className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
                    >
                      Zur Vorlagen-Bibliothek
                    </a>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-1">Vorlagen-Name *</label>
                    <input
                      className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-1">Beschreibung</label>
                    <textarea
                      className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 resize-none"
                      rows={2}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Kurze Beschreibung der Vorlage"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-gray-700 dark:text-zinc-300 mb-1">Kategorie</label>
                    <select
                      className="w-full bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-[#333] rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">Keine Kategorie</option>
                      <option value="aufforstung">Aufforstung</option>
                      <option value="pflege">Waldpflege</option>
                      <option value="saatgut">Saatguternte</option>
                      <option value="allgemein">Allgemein</option>
                    </select>
                  </div>

                  <p className="text-xs text-gray-400 dark:text-zinc-500">
                    ℹ️ Es werden alle Tasks ohne Fälligkeitsdaten, Zuweisungen und Kommentare gespeichert.
                    Meilensteine werden als Metadaten übernommen.
                  </p>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={() => setOpen(false)}
                      className="px-4 py-2 text-sm rounded-lg bg-gray-100 dark:bg-[#222] text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 text-sm rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                      Als Vorlage speichern
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
