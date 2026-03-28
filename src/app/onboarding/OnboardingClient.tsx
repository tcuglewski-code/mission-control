"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Zap,
  User,
  FolderKanban,
  Users,
  Rocket,
  MapIcon,
  Loader2,
} from "lucide-react";

// ─── Avatar-Farben ────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { value: "#10b981", label: "Smaragd" },
  { value: "#3b82f6", label: "Blau" },
  { value: "#8b5cf6", label: "Violett" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Rot" },
  { value: "#ec4899", label: "Pink" },
  { value: "#14b8a6", label: "Türkis" },
  { value: "#f97316", label: "Orange" },
];

interface FormData {
  displayName: string;
  avatarColor: string;
  projectName: string;
  projectDescription: string;
  inviteEmails: string[];
  inviteInput: string;
}

// ─── Schritt-Indikatoren ──────────────────────────────────────────────────────
function StepIndicator({
  step,
  currentStep,
  label,
}: {
  step: number;
  currentStep: number;
  label: string;
}) {
  const done = step < currentStep;
  const active = step === currentStep;

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
          done
            ? "bg-emerald-500 text-white"
            : active
            ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400"
            : "bg-[#1c1c1c] border border-[#2a2a2a] text-zinc-500"
        }`}
      >
        {done ? <CheckCircle className="w-4 h-4" /> : step}
      </div>
      <span
        className={`text-[10px] font-medium whitespace-nowrap ${
          active ? "text-emerald-400" : done ? "text-zinc-400" : "text-zinc-600"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

// ─── Schritt 1: Willkommen + Profil ──────────────────────────────────────────
function Step1({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <User className="w-8 h-8 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Willkommen bei Mission Control! 👋
        </h2>
        <p className="text-zinc-400 text-sm max-w-sm mx-auto">
          Lass uns dein Profil einrichten, damit dein Team dich erkennt.
        </p>
      </div>

      <div className="space-y-4">
        {/* Anzeigename */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Dein Anzeigename
          </label>
          <input
            type="text"
            value={data.displayName}
            onChange={(e) => onChange({ displayName: e.target.value })}
            placeholder="z.B. Max Mustermann"
            className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Avatar-Farbe */}
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-3">
            Avatar-Farbe wählen
          </label>
          <div className="flex flex-wrap gap-3">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.label}
                onClick={() => onChange({ avatarColor: c.value })}
                className={`w-9 h-9 rounded-full transition-all ${
                  data.avatarColor === c.value
                    ? "ring-2 ring-white ring-offset-2 ring-offset-[#161616] scale-110"
                    : "hover:scale-105"
                }`}
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </div>

        {/* Vorschau */}
        {data.displayName && (
          <div className="flex items-center gap-3 p-4 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
              style={{ backgroundColor: data.avatarColor + "33", border: `2px solid ${data.avatarColor}66` }}
            >
              <span style={{ color: data.avatarColor }}>
                {data.displayName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{data.displayName}</p>
              <p className="text-xs text-zinc-500">So wirst du im Team gesehen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Schritt 2: Erstes Projekt ─────────────────────────────────────────────────
function Step2({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FolderKanban className="w-8 h-8 text-blue-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Dein erstes Projekt</h2>
        <p className="text-zinc-400 text-sm max-w-sm mx-auto">
          Erstelle ein neues Projekt oder überspringe diesen Schritt — du kannst jederzeit
          Projekte anlegen.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-400 mb-2">
            Projektname <span className="text-zinc-600">(optional)</span>
          </label>
          <input
            type="text"
            value={data.projectName}
            onChange={(e) => onChange({ projectName: e.target.value })}
            placeholder="z.B. Website-Relaunch"
            className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
        </div>

        {data.projectName && (
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-2">
              Kurzbeschreibung <span className="text-zinc-600">(optional)</span>
            </label>
            <textarea
              value={data.projectDescription}
              onChange={(e) => onChange({ projectDescription: e.target.value })}
              placeholder="Was ist das Ziel dieses Projekts?"
              rows={3}
              className="w-full bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-blue-500/50 transition-colors resize-none"
            />
          </div>
        )}

        {!data.projectName && (
          <div className="p-4 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg text-center">
            <FolderKanban className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">
              Du kannst diesen Schritt überspringen und später unter{" "}
              <span className="text-zinc-400">Projekte</span> ein Projekt erstellen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Schritt 3: Team einladen ──────────────────────────────────────────────────
function Step3({
  data,
  onChange,
}: {
  data: FormData;
  onChange: (updates: Partial<FormData>) => void;
}) {
  function addEmail() {
    const email = data.inviteInput.trim();
    if (!email) return;
    if (!email.includes("@")) return;
    if (data.inviteEmails.includes(email)) return;
    onChange({
      inviteEmails: [...data.inviteEmails, email],
      inviteInput: "",
    });
  }

  function removeEmail(email: string) {
    onChange({ inviteEmails: data.inviteEmails.filter((e) => e !== email) });
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-violet-500/10 border border-violet-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-violet-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Team einladen</h2>
        <p className="text-zinc-400 text-sm max-w-sm mx-auto">
          Lade Kollegen ein, damit ihr gemeinsam an Projekten arbeiten könnt. Du kannst diesen
          Schritt auch überspringen.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <input
            type="email"
            value={data.inviteInput}
            onChange={(e) => onChange({ inviteInput: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addEmail();
              }
            }}
            placeholder="kollegin@firma.de"
            className="flex-1 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            type="button"
            onClick={addEmail}
            disabled={!data.inviteInput.includes("@")}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
          >
            Hinzufügen
          </button>
        </div>

        {data.inviteEmails.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 font-medium">
              {data.inviteEmails.length} Einladung{data.inviteEmails.length > 1 ? "en" : ""}
            </p>
            {data.inviteEmails.map((email) => (
              <div
                key={email}
                className="flex items-center justify-between px-4 py-2.5 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg"
              >
                <span className="text-sm text-zinc-300">{email}</span>
                <button
                  type="button"
                  onClick={() => removeEmail(email)}
                  className="text-zinc-600 hover:text-red-400 text-xs transition-colors"
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg text-center">
            <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            <p className="text-xs text-zinc-500">
              Noch keine Einladungen. Du kannst diesen Schritt überspringen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Schritt 4: Fertig ────────────────────────────────────────────────────────
function Step4({ startTour }: { startTour: boolean; onToggleTour: () => void }) {
  return (
    <div className="space-y-6 text-center">
      <div className="mb-8">
        <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Rocket className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Alles bereit! 🎉</h2>
        <p className="text-zinc-400 text-sm max-w-sm mx-auto">
          Dein Mission Control ist eingerichtet. Möchtest du eine kurze Dashboard-Tour
          starten, die dir die wichtigsten Funktionen zeigt?
        </p>
      </div>

      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
            startTour
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-[#2a2a2a] bg-[#1c1c1c]"
          }`}
        >
          <MapIcon className={`w-5 h-5 ${startTour ? "text-emerald-400" : "text-zinc-500"}`} />
          <div className="flex-1 text-left">
            <p className={`text-sm font-medium ${startTour ? "text-white" : "text-zinc-400"}`}>
              Dashboard-Tour {startTour ? "aktiviert" : "deaktiviert"}
            </p>
            <p className="text-xs text-zinc-500">
              {startTour
                ? "Du bekommst eine geführte Einführung"
                : "Du kannst die Tour jederzeit in den Einstellungen starten"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left">
          {[
            { icon: "📋", text: "Projekte & Tasks" },
            { icon: "⌨️", text: "Tastenkürzel" },
            { icon: "🔍", text: "Schnellsuche" },
            { icon: "⏱️", text: "Zeiterfassung" },
          ].map(({ icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-2 p-3 bg-[#1c1c1c] border border-[#2a2a2a] rounded-lg"
            >
              <span className="text-base">{icon}</span>
              <span className="text-xs text-zinc-400">{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Haupt-Komponente ─────────────────────────────────────────────────────────
export function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [startTour, setStartTour] = useState(true);

  const [form, setForm] = useState<FormData>({
    displayName: "",
    avatarColor: "#10b981",
    projectName: "",
    projectDescription: "",
    inviteEmails: [],
    inviteInput: "",
  });

  function updateForm(updates: Partial<FormData>) {
    setForm((prev) => ({ ...prev, ...updates }));
  }

  const STEPS = [
    { label: "Profil" },
    { label: "Projekt" },
    { label: "Team" },
    { label: "Fertig" },
  ];

  function canProceed() {
    if (step === 1) return form.displayName.trim().length >= 2;
    return true; // Alle anderen Schritte können übersprungen werden
  }

  async function handleNext() {
    if (step < 4) {
      // Schritt 1: Profilname speichern
      if (step === 1 && form.displayName.trim()) {
        try {
          await fetch("/api/settings/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: form.displayName.trim() }),
          });
        } catch {
          // Fehler ignorieren — nicht kritisch
        }
      }

      // Schritt 2: Projekt erstellen
      if (step === 2 && form.projectName.trim()) {
        try {
          await fetch("/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: form.projectName.trim(),
              description: form.projectDescription.trim() || undefined,
            }),
          });
        } catch {
          // Fehler ignorieren
        }
      }

      setStep((s) => s + 1);
    } else {
      // Schritt 4: Onboarding abschließen
      setSaving(true);
      try {
        // Onboarding als abgeschlossen markieren
        await fetch("/api/onboarding/complete", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });

        // Falls Tour übersprungen: tourComplete sofort setzen
        if (!startTour) {
          await fetch("/api/onboarding/tour-complete", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
          });
        }

        // Session neu laden durch Hard-Redirect
        window.location.href = "/dashboard" + (startTour ? "?tour=1" : "");
      } catch {
        setSaving(false);
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Zap className="w-6 h-6 text-emerald-400" />
          <span className="text-lg font-semibold text-white">Mission Control</span>
        </div>

        {/* Schritte */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center">
              <StepIndicator
                step={i + 1}
                currentStep={step}
                label={s.label}
              />
              {i < STEPS.length - 1 && (
                <div
                  className={`w-10 h-px mx-2 mt-[-18px] transition-colors ${
                    i + 1 < step ? "bg-emerald-500" : "bg-[#2a2a2a]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Karte */}
        <div className="bg-[#161616] border border-[#2a2a2a] rounded-2xl p-8">
          {step === 1 && <Step1 data={form} onChange={updateForm} />}
          {step === 2 && <Step2 data={form} onChange={updateForm} />}
          {step === 3 && <Step3 data={form} onChange={updateForm} />}
          {step === 4 && (
            <Step4
              startTour={startTour}
              onToggleTour={() => setStartTour((v) => !v)}
            />
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => s - 1)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2.5 border border-[#2a2a2a] text-zinc-400 hover:text-white hover:border-[#3a3a3a] text-sm rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Zurück
              </button>
            )}

            <div className="flex-1" />

            {step < 4 && (
              <button
                onClick={() => setStep((s) => s + 1)}
                disabled={saving}
                className="px-4 py-2.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
              >
                Überspringen
              </button>
            )}

            {step === 4 && (
              <button
                onClick={() => setStartTour((v) => !v)}
                className={`px-4 py-2.5 text-sm rounded-lg border transition-colors ${
                  startTour
                    ? "border-[#2a2a2a] text-zinc-400 hover:text-white"
                    : "border-emerald-500/30 text-emerald-400 hover:border-emerald-500"
                }`}
              >
                {startTour ? "Tour überspringen" : "Tour aktivieren"}
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : step === 4 ? (
                <>
                  <Rocket className="w-4 h-4" />
                  {startTour ? "Tour starten" : "Zum Dashboard"}
                </>
              ) : (
                <>
                  Weiter
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-6">
          Mission Control · Koch Aufforstung GmbH
        </p>
      </div>
    </div>
  );
}
