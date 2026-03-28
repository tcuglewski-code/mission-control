"use client";

import { useState } from "react";
import { Euro, Pencil, Check, X } from "lucide-react";

interface BudgetCardProps {
  projectId: string;
  budget: number | null;
  budgetUsed: number | null;
}

function formatEuro(value: number): string {
  return value.toLocaleString("de-DE", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function BudgetCard({ projectId, budget, budgetUsed }: BudgetCardProps) {
  const [currentBudget, setCurrentBudget] = useState<number | null>(budget);
  const [currentUsed, setCurrentUsed] = useState<number>(budgetUsed ?? 0);

  const [editingBudget, setEditingBudget] = useState(false);
  const [editingUsed, setEditingUsed] = useState(false);
  const [inputBudget, setInputBudget] = useState(budget?.toString() ?? "");
  const [inputUsed, setInputUsed] = useState((budgetUsed ?? 0).toString());
  const [saving, setSaving] = useState(false);

  const budgetPercent = currentBudget
    ? Math.min(100, Math.round((currentUsed / currentBudget) * 100))
    : 0;

  const budgetColor =
    budgetPercent < 70
      ? "bg-emerald-500"
      : budgetPercent < 90
      ? "bg-yellow-500"
      : "bg-red-500";

  const textColor =
    budgetPercent < 70
      ? "text-emerald-400"
      : budgetPercent < 90
      ? "text-yellow-400"
      : "text-red-400";

  const remaining = currentBudget ? currentBudget - currentUsed : null;

  async function saveBudget(newBudget: number | null, newUsed: number) {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: newBudget, budgetUsed: newUsed }),
      });
    } finally {
      setSaving(false);
    }
  }

  function confirmBudget() {
    const val = parseFloat(inputBudget.replace(",", ".").replace(/[^0-9.]/g, ""));
    const newBudget = isNaN(val) ? null : val;
    setCurrentBudget(newBudget);
    setEditingBudget(false);
    saveBudget(newBudget, currentUsed);
  }

  function confirmUsed() {
    const val = parseFloat(inputUsed.replace(",", ".").replace(/[^0-9.]/g, ""));
    const newUsed = isNaN(val) ? 0 : val;
    setCurrentUsed(newUsed);
    setEditingUsed(false);
    saveBudget(currentBudget, newUsed);
  }

  return (
    <div className="bg-[#1c1c1c] border border-[#2a2a2a] rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Euro className="w-4 h-4 text-zinc-400" />
        <h2 className="text-sm font-semibold text-white">Budget</h2>
        {saving && (
          <span className="text-[10px] text-zinc-500 ml-auto animate-pulse">Speichern…</span>
        )}
      </div>

      <div className="space-y-3">
        {/* Budget Ziel */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Geplant</span>
          {editingBudget ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-400">€</span>
              <input
                type="text"
                value={inputBudget}
                onChange={(e) => setInputBudget(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmBudget();
                  if (e.key === "Escape") setEditingBudget(false);
                }}
                autoFocus
                className="w-24 text-xs bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
              />
              <button onClick={confirmBudget} className="text-emerald-400 hover:text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingBudget(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setInputBudget(currentBudget?.toString() ?? "");
                setEditingBudget(true);
              }}
              className="flex items-center gap-1.5 text-xs text-white hover:text-zinc-300 group"
            >
              <span className="font-semibold">
                {currentBudget != null ? `€ ${formatEuro(currentBudget)}` : "— kein Budget"}
              </span>
              <Pencil className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* Verbraucht */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">Verbraucht</span>
          {editingUsed ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-zinc-400">€</span>
              <input
                type="text"
                value={inputUsed}
                onChange={(e) => setInputUsed(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmUsed();
                  if (e.key === "Escape") setEditingUsed(false);
                }}
                autoFocus
                className="w-24 text-xs bg-[#252525] border border-[#3a3a3a] rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
              />
              <button onClick={confirmUsed} className="text-emerald-400 hover:text-emerald-300">
                <Check className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setEditingUsed(false)} className="text-zinc-500 hover:text-zinc-300">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setInputUsed(currentUsed.toString());
                setEditingUsed(true);
              }}
              className="flex items-center gap-1.5 text-xs group"
            >
              <span className={`font-semibold ${textColor}`}>
                € {formatEuro(currentUsed)}
              </span>
              {currentBudget && (
                <span className="text-zinc-600">({budgetPercent}%)</span>
              )}
              <Pencil className="w-3 h-3 text-zinc-600 group-hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {currentBudget && (
          <div>
            <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${budgetColor}`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Verbleibend */}
        {remaining !== null && (
          <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a]">
            <span className="text-xs text-zinc-500">Verbleibend</span>
            <span
              className={`text-xs font-semibold ${
                remaining >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {remaining >= 0 ? "€ " : "– € "}
              {formatEuro(Math.abs(remaining))}
            </span>
          </div>
        )}

        {/* Kein Budget gesetzt */}
        {!currentBudget && (
          <p className="text-[11px] text-zinc-600 text-center py-1">
            Klick auf &quot;— kein Budget&quot; um ein Budget festzulegen
          </p>
        )}
      </div>
    </div>
  );
}
