"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { parseTimeToSeconds, formatTime } from "@/lib/format";

interface Competition {
  competitionId: string;
  name: string;
  scoreType: "points" | "time";
  lowerIsBetter: boolean;
  measureMode: "per_athlete" | "per_team";
  displayOrder: number;
}

interface Athlete {
  id: string;
  name: string;
  number: number | null;
  teamId: string;
  teamName: string | null;
}

interface ResultRow {
  athleteId: string | null;
  teamId: string | null;
  competitionId: string;
  points: number | null;
  timeSeconds: number | null;
}

type Props = { params: Promise<{ eventId: string }> };

export default function ResultsPage({ params }: Props) {
  const { eventId } = use(params);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [selectedComp, setSelectedComp] = useState<Competition | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  async function load() {
    const [compsR, athletesR, resultsR] = await Promise.all([
      fetch(`/api/events/${eventId}/competitions`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/athletes`).then((r) => r.json()),
      fetch(`/api/events/${eventId}/results`).then((r) => r.json()),
    ]);
    setCompetitions(compsR);
    setAthletes(athletesR);
    setResults(resultsR);
    setInputValues({});
    if (compsR.length > 0 && !selectedComp) setSelectedComp(compsR[0]);
  }

  useEffect(() => { load(); }, [eventId]);

  // Per-athlete result lookup
  function getAthleteResult(athleteId: string, competitionId: string) {
    return results.find((r) => r.athleteId === athleteId && r.competitionId === competitionId) ?? null;
  }

  // Per-team result lookup
  function getTeamResult(teamId: string, competitionId: string) {
    return results.find((r) => r.teamId === teamId && r.competitionId === competitionId && r.athleteId === null) ?? null;
  }

  function formatResult(r: ResultRow | null, comp: Competition): string {
    if (!r) return "";
    if (comp.scoreType === "time") return formatTime(r.timeSeconds);
    return r.points != null ? String(r.points) : "";
  }

  function inputKey(id: string, competitionId: string) {
    return `${id}:${competitionId}`;
  }

  function initInput(id: string, comp: Competition, currentValue: string) {
    const key = inputKey(id, comp.competitionId);
    if (inputValues[key] !== undefined) return;
    setInputValues((prev) => ({ ...prev, [key]: currentValue }));
  }

  async function saveAthlete(athlete: Athlete, comp: Competition) {
    const key = inputKey(athlete.id, comp.competitionId);
    const rawValue = inputValues[key] ?? "";
    if (!rawValue.trim()) { toast.error("Wpisz wynik"); return; }
    setSaving(key);

    let points: number | null = null;
    let timeSeconds: number | null = null;
    if (comp.scoreType === "time") {
      timeSeconds = parseTimeToSeconds(rawValue.trim());
      if (timeSeconds === null) { toast.error("Format czasu: M:SS (np. 3:07)"); setSaving(null); return; }
    } else {
      const n = parseInt(rawValue.trim());
      if (isNaN(n)) { toast.error("Wpisz liczbę całkowitą"); setSaving(null); return; }
      points = n;
    }

    const r = await fetch(`/api/events/${eventId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ athleteId: athlete.id, competitionId: comp.competitionId, points, timeSeconds }),
    });
    setSaving(null);
    if (r.ok) { toast.success(`Zapisano: ${athlete.name}`); load(); }
    else toast.error("Błąd zapisu");
  }

  async function saveTeam(teamId: string, teamName: string, comp: Competition) {
    const key = inputKey(teamId, comp.competitionId);
    const rawValue = inputValues[key] ?? "";
    if (!rawValue.trim()) { toast.error("Wpisz wynik"); return; }
    setSaving(key);

    let points: number | null = null;
    let timeSeconds: number | null = null;
    if (comp.scoreType === "time") {
      timeSeconds = parseTimeToSeconds(rawValue.trim());
      if (timeSeconds === null) { toast.error("Format czasu: M:SS (np. 3:07)"); setSaving(null); return; }
    } else {
      const n = parseInt(rawValue.trim());
      if (isNaN(n)) { toast.error("Wpisz liczbę całkowitą"); setSaving(null); return; }
      points = n;
    }

    const r = await fetch(`/api/events/${eventId}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId, competitionId: comp.competitionId, points, timeSeconds }),
    });
    setSaving(null);
    if (r.ok) { toast.success(`Zapisano: ${teamName}`); load(); }
    else toast.error("Błąd zapisu");
  }

  // Group athletes by team
  const groupedAthletes = athletes.reduce<Record<string, { teamId: string; athletes: Athlete[] }>>((acc, a) => {
    const key = a.teamName ?? "Brak drużyny";
    if (!acc[key]) acc[key] = { teamId: a.teamId, athletes: [] };
    acc[key].athletes.push(a);
    return acc;
  }, {});

  const placeholder = selectedComp?.scoreType === "time" ? "0:00" : "0";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b shadow-sm">
        <div className="px-4 py-3">
          <Link href={`/admin/events/${eventId}`} className="text-xs text-muted-foreground">← Zawody</Link>
          <h1 className="font-bold text-lg">Wpisywanie wyników</h1>
        </div>

        <div className="flex overflow-x-auto gap-2 px-4 pb-3 no-scrollbar">
          {competitions.map((comp) => (
            <button
              key={comp.competitionId}
              onClick={() => { setSelectedComp(comp); setInputValues({}); }}
              className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedComp?.competitionId === comp.competitionId
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {comp.displayOrder}. {comp.name}
            </button>
          ))}
        </div>
      </div>

      {selectedComp && (
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-3">
          <span className="font-semibold">{selectedComp.name}</span>
          <Badge variant="secondary" className="text-xs">
            {selectedComp.scoreType === "time" ? "Format: M:SS" : "Format: liczba"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {selectedComp.measureMode === "per_team" ? "drużyna" : "per zawodnik"}
          </Badge>
        </div>
      )}

      {selectedComp && (
        <div className="divide-y">
          {Object.entries(groupedAthletes).map(([teamName, { teamId, athletes: teamAthletes }]) => {
            const isPerTeam = selectedComp.measureMode === "per_team";

            if (isPerTeam) {
              // One result per team
              const teamResult = getTeamResult(teamId, selectedComp.competitionId);
              const currentDisplay = formatResult(teamResult, selectedComp);
              const key = inputKey(teamId, selectedComp.competitionId);
              return (
                <div key={teamName}>
                  <div className="px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {teamName}
                  </div>
                  <div className="px-4 py-4 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-base">Wynik drużyny</div>
                      {currentDisplay && (
                        <div className="text-sm text-green-600 font-mono mt-0.5">Zapisany: {currentDisplay}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Input
                        className="w-24 h-11 text-center text-base font-mono"
                        placeholder={placeholder}
                        value={inputValues[key] ?? ""}
                        onFocus={() => initInput(teamId, selectedComp, currentDisplay)}
                        onChange={(e) => setInputValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") saveTeam(teamId, teamName, selectedComp); }}
                        inputMode={selectedComp.scoreType === "points" ? "numeric" : "text"}
                      />
                      <Button
                        size="sm"
                        className="h-11 px-4 shrink-0"
                        onClick={() => saveTeam(teamId, teamName, selectedComp)}
                        disabled={saving === key}
                      >
                        {saving === key ? "…" : "✓"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            // Per-athlete
            return (
              <div key={teamName}>
                <div className="px-4 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {teamName}
                </div>
                {teamAthletes.map((athlete) => {
                  const athleteResult = getAthleteResult(athlete.id, selectedComp.competitionId);
                  const currentDisplay = formatResult(athleteResult, selectedComp);
                  const key = inputKey(athlete.id, selectedComp.competitionId);
                  return (
                    <div key={athlete.id} className="px-4 py-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base">
                          {athlete.number && <span className="text-muted-foreground mr-2">#{athlete.number}</span>}
                          {athlete.name}
                        </div>
                        {currentDisplay && (
                          <div className="text-sm text-green-600 font-mono mt-0.5">Wynik: {currentDisplay}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Input
                          className="w-24 h-11 text-center text-base font-mono"
                          placeholder={placeholder}
                          value={inputValues[key] ?? ""}
                          onFocus={() => initInput(athlete.id, selectedComp, currentDisplay)}
                          onChange={(e) => setInputValues((prev) => ({ ...prev, [key]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") saveAthlete(athlete, selectedComp); }}
                          inputMode={selectedComp.scoreType === "points" ? "numeric" : "text"}
                        />
                        <Button
                          size="sm"
                          className="h-11 px-4 shrink-0"
                          onClick={() => saveAthlete(athlete, selectedComp)}
                          disabled={saving === key}
                        >
                          {saving === key ? "…" : "✓"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {athletes.length === 0 && (
            <p className="text-center text-muted-foreground py-16 px-4">
              Brak zawodników przypisanych do tych zawodów.<br />
              <Link href={`/admin/events/${eventId}/teams`} className="text-primary underline">Przypisz drużyny</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
