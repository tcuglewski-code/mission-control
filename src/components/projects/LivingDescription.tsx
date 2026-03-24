"use client";

import { useState } from "react";
import { Pencil, Check, X, FileText } from "lucide-react";

interface LivingDescriptionProps {
  projectId: string;
  initialText: string | null;
}

export function LivingDescription({ projectId, initialText }: LivingDescriptionProps) {
  const [text, setText] = useState(initialText ?? "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);

  const handleEdit = () => {
    setDraft(text);
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setDraft(text);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ longDescription: draft }),
      });
      if (res.ok) {
        setText(draft);
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-400" />
          <h2 className="text-sm font-semibold text-white">Projektbeschreibung</h2>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Living Document
          </span>
        </div>
        {!editing ? (
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#2a2a2a]"
          >
            <Pencil className="w-3 h-3" />
            Bearbeiten
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 text-[11px] text-zinc-500 hover:text-white transition-colors px-2 py-1 rounded hover:bg-[#2a2a2a]"
            >
              <X className="w-3 h-3" />
              Abbrechen
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors px-2 py-1 rounded hover:bg-emerald-500/10 disabled:opacity-50"
            >
              <Check className="w-3 h-3" />
              {saving ? "Speichern…" : "Speichern"}
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full min-h-[160px] bg-[#161616] border border-[#3a3a3a] rounded-lg p-3 text-sm text-white placeholder-zinc-600 resize-y focus:outline-none focus:border-emerald-500/50 transition-colors"
          placeholder="Projektbeschreibung hier eingeben… (unterstützt Zeilenumbrüche)"
          autoFocus
        />
      ) : text ? (
        <p className="text-sm text-zinc-400 whitespace-pre-wrap leading-relaxed">{text}</p>
      ) : (
        <p className="text-sm text-zinc-600 italic">
          Noch keine Beschreibung vorhanden.{" "}
          <button
            onClick={handleEdit}
            className="text-emerald-500 hover:text-emerald-400 transition-colors underline underline-offset-2"
          >
            Jetzt hinzufügen
          </button>
        </p>
      )}
    </div>
  );
}
