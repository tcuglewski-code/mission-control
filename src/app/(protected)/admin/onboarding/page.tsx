"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Calendar,
  Mail,
  User,
  Settings,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface CustomerOnboarding {
  id: string;
  tenantId: string;
  tenantName: string;
  status: string;
  week: number;
  startDate: string;
  targetGoLive: string | null;
  actualGoLive: string | null;
  // Checkpoints
  w1_kickoff: boolean;
  w1_requirements: boolean;
  w1_configPlan: boolean;
  w2_domain: boolean;
  w2_database: boolean;
  w2_appSetup: boolean;
  w2_dataImport: boolean;
  w3_adminTraining: boolean;
  w3_workerTraining: boolean;
  w3_testRun: boolean;
  w4_finalCheck: boolean;
  w4_goLive: boolean;
  w4_supportHandover: boolean;
  // Additional
  avvSigned: boolean;
  contractSigned: boolean;
  firstPayment: boolean;
  contactName: string | null;
  contactEmail: string | null;
  ownerName: string | null;
  notes: string | null;
  reminderCount: number;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  paused: "bg-amber-100 text-amber-800 border-amber-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<string, string> = {
  in_progress: "In Arbeit",
  completed: "Abgeschlossen",
  paused: "Pausiert",
  cancelled: "Abgebrochen",
};

const CHECKPOINTS = [
  { key: "w1_kickoff", label: "Kickoff-Meeting", week: 1 },
  { key: "w1_requirements", label: "Anforderungs-Workshop", week: 1 },
  { key: "w1_configPlan", label: "Konfigurationsplan", week: 1 },
  { key: "w2_domain", label: "Domain eingerichtet", week: 2 },
  { key: "w2_database", label: "Datenbank angelegt", week: 2 },
  { key: "w2_appSetup", label: "App-Setup", week: 2 },
  { key: "w2_dataImport", label: "Datenimport", week: 2 },
  { key: "w3_adminTraining", label: "Admin-Schulung", week: 3 },
  { key: "w3_workerTraining", label: "Mitarbeiter-Schulung", week: 3 },
  { key: "w3_testRun", label: "Testbetrieb", week: 3 },
  { key: "w4_finalCheck", label: "Finaler Check", week: 4 },
  { key: "w4_goLive", label: "Go-Live", week: 4 },
  { key: "w4_supportHandover", label: "Support-Übergabe", week: 4 },
];

function calculateProgress(onboarding: CustomerOnboarding): number {
  const checkpointKeys = CHECKPOINTS.map(c => c.key);
  const completed = checkpointKeys.filter(k => (onboarding as any)[k] === true).length;
  return Math.round((completed / checkpointKeys.length) * 100);
}

export default function OnboardingAdminPage() {
  const [onboardings, setOnboardings] = useState<CustomerOnboarding[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const [filter, setFilter] = useState<string>("all");

  // Form state for new onboarding
  const [newTenantId, setNewTenantId] = useState("");
  const [newTenantName, setNewTenantName] = useState("");
  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newTargetGoLive, setNewTargetGoLive] = useState("");

  useEffect(() => {
    loadOnboardings();
  }, []);

  async function loadOnboardings() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer-onboarding");
      if (res.ok) {
        const data = await res.json();
        setOnboardings(data.onboardings || []);
      }
    } catch (err) {
      console.error("Fehler beim Laden:", err);
    }
    setLoading(false);
  }

  async function createOnboarding() {
    if (!newTenantId || !newTenantName) return;

    try {
      const res = await fetch("/api/customer-onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: newTenantId,
          tenantName: newTenantName,
          contactName: newContactName || undefined,
          contactEmail: newContactEmail || undefined,
          targetGoLive: newTargetGoLive || undefined,
        }),
      });

      if (res.ok) {
        setShowCreateModal(false);
        setNewTenantId("");
        setNewTenantName("");
        setNewContactName("");
        setNewContactEmail("");
        setNewTargetGoLive("");
        loadOnboardings();
      }
    } catch (err) {
      console.error("Fehler beim Erstellen:", err);
    }
  }

  async function toggleCheckpoint(onboardingId: string, checkpointKey: string, currentValue: boolean) {
    try {
      const res = await fetch(`/api/customer-onboarding/${onboardingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [checkpointKey]: !currentValue }),
      });

      if (res.ok) {
        setOnboardings(prev =>
          prev.map(o =>
            o.id === onboardingId
              ? { ...o, [checkpointKey]: !currentValue }
              : o
          )
        );
      }
    } catch (err) {
      console.error("Fehler beim Update:", err);
    }
  }

  async function runManualCheck() {
    setRunningCheck(true);
    try {
      const res = await fetch("/api/cron/onboarding-check", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        console.log("Check-Ergebnis:", data);
      }
    } catch (err) {
      console.error("Fehler beim manuellen Check:", err);
    }
    setRunningCheck(false);
  }

  const filteredOnboardings = onboardings.filter(o => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  // Stats
  const stats = {
    total: onboardings.length,
    inProgress: onboardings.filter(o => o.status === "in_progress").length,
    completed: onboardings.filter(o => o.status === "completed").length,
    avgProgress: onboardings.length > 0
      ? Math.round(onboardings.reduce((sum, o) => sum + calculateProgress(o), 0) / onboardings.length)
      : 0,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#2C3A1C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#2C3A1C]">🤖 Cleo-Agent: Onboarding Dashboard</h1>
          <p className="text-gray-600 mt-1">Kunden-Onboarding Fortschritt verwalten</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={runManualCheck}
            disabled={runningCheck}
          >
            {runningCheck ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Check ausführen
          </Button>
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button className="bg-[#2C3A1C] hover:bg-[#3d4f2a]">
                <Plus className="w-4 h-4 mr-2" />
                Neues Onboarding
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neues Kunden-Onboarding</DialogTitle>
                <DialogDescription>
                  Erstelle ein neues Onboarding für einen Kunden.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Tenant-ID *</label>
                  <Input
                    placeholder="z.B. mueller-garten"
                    value={newTenantId}
                    onChange={(e) => setNewTenantId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Kundenname *</label>
                  <Input
                    placeholder="z.B. Müller Garten- und Landschaftsbau"
                    value={newTenantName}
                    onChange={(e) => setNewTenantName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Ansprechpartner</label>
                  <Input
                    placeholder="z.B. Max Müller"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">E-Mail</label>
                  <Input
                    type="email"
                    placeholder="z.B. max@mueller-garten.de"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Geplantes Go-Live</label>
                  <Input
                    type="date"
                    value={newTargetGoLive}
                    onChange={(e) => setNewTargetGoLive(e.target.value)}
                  />
                </div>
                <Button
                  className="w-full bg-[#2C3A1C] hover:bg-[#3d4f2a]"
                  onClick={createOnboarding}
                  disabled={!newTenantId || !newTenantName}
                >
                  Onboarding erstellen
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-[#c9a227]/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Gesamt</p>
                <p className="text-2xl font-bold text-[#2C3A1C]">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#c9a227]/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <PlayCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">In Arbeit</p>
                <p className="text-2xl font-bold text-[#2C3A1C]">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#c9a227]/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Abgeschlossen</p>
                <p className="text-2xl font-bold text-[#2C3A1C]">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[#c9a227]/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ø Fortschritt</p>
                <p className="text-2xl font-bold text-[#2C3A1C]">{stats.avgProgress}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "Alle" },
          { key: "in_progress", label: "In Arbeit" },
          { key: "completed", label: "Abgeschlossen" },
          { key: "paused", label: "Pausiert" },
        ].map(f => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f.key)}
            className={filter === f.key ? "bg-[#2C3A1C]" : ""}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Onboarding Cards */}
      <div className="space-y-4">
        {filteredOnboardings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Keine Onboardings gefunden.</p>
              <p className="text-sm mt-2">Erstelle ein neues Onboarding um zu starten.</p>
            </CardContent>
          </Card>
        ) : (
          filteredOnboardings.map(onboarding => {
            const progress = calculateProgress(onboarding);
            const isExpanded = expandedId === onboarding.id;

            return (
              <Card key={onboarding.id} className="border-[#c9a227]/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{onboarding.tenantName}</CardTitle>
                      <Badge className={STATUS_COLORS[onboarding.status]}>
                        {STATUS_LABELS[onboarding.status]}
                      </Badge>
                      <Badge variant="outline">Woche {onboarding.week}</Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : onboarding.id)}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>
                  <CardDescription className="flex items-center gap-4 mt-2">
                    {onboarding.contactName && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {onboarding.contactName}
                      </span>
                    )}
                    {onboarding.contactEmail && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {onboarding.contactEmail}
                      </span>
                    )}
                    {onboarding.targetGoLive && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Go-Live: {new Date(onboarding.targetGoLive).toLocaleDateString("de-DE")}
                      </span>
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Fortschritt</span>
                      <span className="font-medium text-[#2C3A1C]">{progress}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2C3A1C] transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4">
                      {/* Checkpoints by Week */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {[1, 2, 3, 4].map(week => (
                          <div key={week} className="bg-gray-50 rounded-lg p-3">
                            <h4 className="font-medium text-sm mb-2 text-[#2C3A1C]">
                              Woche {week}
                            </h4>
                            <div className="space-y-2">
                              {CHECKPOINTS.filter(c => c.week === week).map(checkpoint => (
                                <label
                                  key={checkpoint.key}
                                  className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded"
                                >
                                  <Checkbox
                                    checked={(onboarding as any)[checkpoint.key]}
                                    onCheckedChange={() =>
                                      toggleCheckpoint(
                                        onboarding.id,
                                        checkpoint.key,
                                        (onboarding as any)[checkpoint.key]
                                      )
                                    }
                                  />
                                  <span className={(onboarding as any)[checkpoint.key] ? "line-through text-gray-400" : ""}>
                                    {checkpoint.label}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Additional Checkpoints */}
                      <div className="bg-amber-50 rounded-lg p-3">
                        <h4 className="font-medium text-sm mb-2 text-amber-800">
                          Vertrag & Zahlung
                        </h4>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={onboarding.contractSigned}
                              onCheckedChange={() =>
                                toggleCheckpoint(onboarding.id, "contractSigned", onboarding.contractSigned)
                              }
                            />
                            <span className={onboarding.contractSigned ? "line-through text-gray-400" : ""}>
                              Vertrag unterschrieben
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={onboarding.avvSigned}
                              onCheckedChange={() =>
                                toggleCheckpoint(onboarding.id, "avvSigned", onboarding.avvSigned)
                              }
                            />
                            <span className={onboarding.avvSigned ? "line-through text-gray-400" : ""}>
                              AVV unterzeichnet
                            </span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <Checkbox
                              checked={onboarding.firstPayment}
                              onCheckedChange={() =>
                                toggleCheckpoint(onboarding.id, "firstPayment", onboarding.firstPayment)
                              }
                            />
                            <span className={onboarding.firstPayment ? "line-through text-gray-400" : ""}>
                              Erste Zahlung
                            </span>
                          </label>
                        </div>
                      </div>

                      {/* Meta Info */}
                      <div className="text-xs text-gray-500 flex items-center gap-4">
                        <span>Tenant-ID: {onboarding.tenantId}</span>
                        <span>Erinnerungen gesendet: {onboarding.reminderCount}</span>
                        <span>Letztes Update: {new Date(onboarding.updatedAt).toLocaleDateString("de-DE")}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
