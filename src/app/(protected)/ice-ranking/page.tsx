"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, TargetIcon, TrendingUpIcon, ZapIcon, AlertTriangle, CheckCircle2 } from "lucide-react";
import { IceScoreBadge } from "@/components/tasks/IceScoreBadge";
import { IceScoreEditor } from "@/components/tasks/IceScoreEditor";
import { cn } from "@/lib/utils";

interface IceTask {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  iceImpact?: number | null;
  iceConfidence?: number | null;
  iceEase?: number | null;
  iceScore?: number | null;
  project?: { id: string; name: string; color: string } | null;
  assignee?: { id: string; name: string; avatar?: string } | null;
  sprint?: { id: string; name: string } | null;
}

interface IceStats {
  totalTasks: number;
  scoredCount: number;
  unscoredCount: number;
  avgImpact: number;
  avgConfidence: number;
  avgEase: number;
  avgScore: number;
  distribution: {
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
  };
}

interface Project {
  id: string;
  name: string;
  color: string;
}

export default function IceRankingPage() {
  const [tasks, setTasks] = useState<IceTask[]>([]);
  const [stats, setStats] = useState<IceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  
  // Filter
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [showUnscored, setShowUnscored] = useState(false);

  // Daten laden
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Projekte laden
      const projectsRes = await fetch("/api/projects");
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }

      // ICE Ranking laden
      const params = new URLSearchParams();
      if (selectedProject !== "all") params.set("projectId", selectedProject);
      if (showUnscored) params.set("includeUnscored", "true");
      params.set("limit", "100");

      const res = await fetch(`/api/tasks/ice-ranking?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch ICE ranking:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedProject, showUnscored]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ICE Score speichern
  const handleSaveIce = async (taskId: string, values: { iceImpact: number; iceConfidence: number; iceEase: number; iceScore: number }) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (res.ok) {
      // Liste aktualisieren
      fetchData();
    }
  };

  const statusLabels: Record<string, { label: string; color: string }> = {
    todo: { label: "Offen", color: "bg-gray-100 text-gray-700" },
    backlog: { label: "Backlog", color: "bg-purple-100 text-purple-700" },
    in_progress: { label: "In Arbeit", color: "bg-blue-100 text-blue-700" },
    review: { label: "Review", color: "bg-amber-100 text-amber-700" },
    done: { label: "Erledigt", color: "bg-green-100 text-green-700" },
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TargetIcon className="h-7 w-7 text-green-600" />
            ICE Scoring & Priorisierung
          </h1>
          <p className="text-gray-500 mt-1">
            Feature-Priorisierung nach Impact, Confidence und Ease
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Gesamt</p>
                  <p className="text-2xl font-bold">{stats.totalTasks}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
              </div>
              <div className="mt-2 flex gap-2 text-xs">
                <span className="text-green-600">{stats.scoredCount} bewertet</span>
                <span className="text-gray-400">•</span>
                <span className="text-amber-600">{stats.unscoredCount} offen</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ø ICE Score</p>
                  <p className="text-2xl font-bold">{stats.avgScore}</p>
                </div>
                <TargetIcon className="h-8 w-8 text-blue-500 opacity-50" />
              </div>
              <div className="mt-2 flex gap-1 text-[10px]">
                <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded">I:{stats.avgImpact}</span>
                <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded">C:{stats.avgConfidence}</span>
                <span className="bg-gray-200 dark:bg-gray-700 px-1 rounded">E:{stats.avgEase}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Top Priority</p>
                  <p className="text-2xl font-bold text-green-600">{stats.distribution.veryHigh}</p>
                </div>
                <TrendingUpIcon className="h-8 w-8 text-green-500 opacity-50" />
              </div>
              <p className="mt-2 text-xs text-gray-500">Score ≥ 75</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Quick Wins</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.distribution.high}</p>
                </div>
                <ZapIcon className="h-8 w-8 text-amber-500 opacity-50" />
              </div>
              <p className="mt-2 text-xs text-gray-500">Score 50-74</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score-Verteilung Visualisierung */}
      {stats && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Score-Verteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-16">
              <div
                className="bg-gray-200 dark:bg-gray-700 rounded-t flex-1 transition-all"
                style={{ height: `${stats.scoredCount > 0 ? (stats.distribution.low / stats.scoredCount) * 100 : 0}%` }}
                title={`Niedrig (0-24): ${stats.distribution.low}`}
              />
              <div
                className="bg-amber-400 rounded-t flex-1 transition-all"
                style={{ height: `${stats.scoredCount > 0 ? (stats.distribution.medium / stats.scoredCount) * 100 : 0}%` }}
                title={`Mittel (25-49): ${stats.distribution.medium}`}
              />
              <div
                className="bg-blue-500 rounded-t flex-1 transition-all"
                style={{ height: `${stats.scoredCount > 0 ? (stats.distribution.high / stats.scoredCount) * 100 : 0}%` }}
                title={`Hoch (50-74): ${stats.distribution.high}`}
              />
              <div
                className="bg-green-500 rounded-t flex-1 transition-all"
                style={{ height: `${stats.scoredCount > 0 ? (stats.distribution.veryHigh / stats.scoredCount) * 100 : 0}%` }}
                title={`Sehr hoch (75-100): ${stats.distribution.veryHigh}`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0-24</span>
              <span>25-49</span>
              <span>50-74</span>
              <span>75-100</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Projekt:</span>
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Alle Projekte" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Projekte</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant={showUnscored ? "default" : "outline"}
          size="sm"
          onClick={() => setShowUnscored(!showUnscored)}
        >
          <AlertTriangle className="h-4 w-4 mr-1" />
          Unbewertete Tasks {showUnscored ? "ausblenden" : "anzeigen"}
        </Button>
      </div>

      {/* Task-Liste */}
      <Card>
        <CardHeader>
          <CardTitle>ICE Ranking</CardTitle>
          <CardDescription>
            Tasks sortiert nach ICE-Score (höchster zuerst)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TargetIcon className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Keine Tasks mit ICE-Bewertung gefunden.</p>
              <p className="text-sm mt-2">
                Klicke auf einen Task und vergib Impact, Confidence und Ease Werte.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                    "hover:bg-gray-50 dark:hover:bg-gray-800/50",
                    index < 3 && task.iceScore && task.iceScore >= 50 && "bg-green-50/50 dark:bg-green-900/10 border-green-200 dark:border-green-800"
                  )}
                >
                  {/* Rang */}
                  <div className="w-8 text-center">
                    {task.iceScore ? (
                      <span className={cn(
                        "font-bold text-lg",
                        index === 0 && "text-amber-500",
                        index === 1 && "text-gray-400",
                        index === 2 && "text-amber-700",
                        index > 2 && "text-gray-300"
                      )}>
                        #{index + 1}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </div>

                  {/* ICE Editor */}
                  <div className="w-24">
                    <IceScoreEditor
                      taskId={task.id}
                      initialImpact={task.iceImpact}
                      initialConfidence={task.iceConfidence}
                      initialEase={task.iceEase}
                      initialScore={task.iceScore}
                      onSave={(values) => handleSaveIce(task.id, values)}
                    />
                  </div>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{task.title}</span>
                      {task.project && (
                        <Badge
                          variant="outline"
                          className="text-[10px] shrink-0"
                          style={{
                            borderColor: task.project.color,
                            color: task.project.color,
                          }}
                        >
                          {task.project.name}
                        </Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Status */}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "shrink-0 text-xs",
                      statusLabels[task.status]?.color
                    )}
                  >
                    {statusLabels[task.status]?.label || task.status}
                  </Badge>

                  {/* Assignee */}
                  {task.assignee && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium shrink-0">
                      {task.assignee.avatar ? (
                        <img
                          src={task.assignee.avatar}
                          alt={task.assignee.name}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        task.assignee.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ICE Erklärung */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <TargetIcon className="h-4 w-4" />
            Was ist ICE Scoring?
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <p>
            ICE ist ein Priorisierungs-Framework für Feature-Entscheidungen:
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <TrendingUpIcon className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-semibold">Impact (1-10)</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Wie viel Wert bringt das Feature für Nutzer oder Business?
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TargetIcon className="h-5 w-5 text-purple-500 mt-0.5" />
              <div>
                <p className="font-semibold">Confidence (1-10)</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Wie sicher sind wir bei unserer Einschätzung?
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ZapIcon className="h-5 w-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold">Ease (1-10)</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Wie einfach/schnell ist die Umsetzung?
                </p>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 border-t pt-3 mt-3">
            <strong>Formel:</strong> ICE Score = (Impact × Confidence × Ease) / 10 — Max: 100
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
