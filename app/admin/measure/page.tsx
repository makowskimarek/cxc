"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Competition {
  id: string;
  name: string;
  scoreType: "points" | "time";
  lowerIsBetter: boolean;
  measureMode: "per_athlete" | "per_team";
  displayOrder: number;
}

interface Team {
  id: string;
  name: string;
}

interface Athlete {
  id: string;
  name: string;
  number: number | null;
  teamId: string;
  teamName: string | null;
}

interface EventData {
  id: string;
  name: string;
  competitions: Competition[];
  teams: Team[];
}

interface AthleteStop {
  elapsedMs: number;
  editValue: string;
}

type SetupStep = "competition" | "team";
type Phase = "setup" | "ready" | "running" | "points_entry" | "review";

const LS_EVENT = "cxc_measure_event";
const LS_COMP = "cxc_measure_comp";

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  const tenths = Math.floor((ms % 1000) / 100);
  return `${m}:${String(s).padStart(2, "0")}.${tenths}`;
}

function secondsToMMSS(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

function parseMMSS(val: string): number | null {
  const match = val.trim().match(/^(\d+):([0-5]\d)$/);
  if (!match) return null;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

export default function MeasurePage() {
  const [events, setEvents] = useState<EventData[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedCompId, setSelectedCompId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [setupStep, setSetupStep] = useState<SetupStep>("competition");
  const [phase, setPhase] = useState<Phase>("setup");

  // Shared stopwatch
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-athlete stops (for per_athlete + time)
  const [athleteStops, setAthleteStops] = useState<Record<string, AthleteStop>>({});

  // Points inputs
  const [pointsInputs, setPointsInputs] = useState<Record<string, string>>({});
  const [teamInput, setTeamInput] = useState("");

  // Review (per_team + time)
  const [reviewValue, setReviewValue] = useState("");

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/measure/events")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<EventData[]>;
      })
      .then((data) => {
        setEvents(data);
        const savedEvent = localStorage.getItem(LS_EVENT);
        const savedComp = localStorage.getItem(LS_COMP);
        let eventId = "";
        if (data.length === 1) eventId = data[0].id;
        else if (savedEvent && data.find((e) => e.id === savedEvent)) eventId = savedEvent;
        if (eventId) {
          setSelectedEventId(eventId);
          const ev = data.find((e) => e.id === eventId)!;
          const comp = ev.competitions.find((c) => c.id === savedComp) ?? ev.competitions[0];
          if (comp) setSelectedCompId(comp.id);
        }
      })
      .catch(() => toast.error("Nie udało się załadować danych. Odśwież stronę."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    fetch(`/api/events/${selectedEventId}/athletes`)
      .then((r) => r.json() as Promise<Athlete[]>)
      .then(setAthletes)
      .catch(() => {});
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const selectedComp = selectedEvent?.competitions.find((c) => c.id === selectedCompId);
  const selectedTeam = selectedEvent?.teams.find((t) => t.id === selectedTeamId);
  const teamAthletes = athletes.filter((a) => a.teamId === selectedTeamId);

  function saveSelections() {
    localStorage.setItem(LS_EVENT, selectedEventId);
    localStorage.setItem(LS_COMP, selectedCompId);
  }

  function stopTicker() {
    if (ticker.current) { clearInterval(ticker.current); ticker.current = null; }
  }

  function startTimer() {
    startedAt.current = Date.now();
    ticker.current = setInterval(() => setElapsed(Date.now() - startedAt.current!), 100);
  }

  function resetAll() {
    stopTicker();
    setElapsed(0);
    setAthleteStops({});
    setPointsInputs({});
    setTeamInput("");
    setReviewValue("");
  }

  function goToSetup(step: SetupStep = "competition") {
    resetAll();
    setSetupStep(step);
    setPhase("setup");
  }

  function handleStart() {
    saveSelections();
    resetAll();
    startTimer();
    setPhase("running");
  }

  function handleReadyClick() {
    saveSelections();
    if (selectedComp?.scoreType === "time") {
      setPhase("ready");
    } else {
      setPhase("points_entry");
    }
  }

  // Per-athlete: stop individual athlete
  function stopAthlete(athleteId: string) {
    const ms = Date.now() - startedAt.current!;
    setAthleteStops((prev) => ({
      ...prev,
      [athleteId]: { elapsedMs: ms, editValue: secondsToMMSS(Math.round(ms / 1000)) },
    }));
  }

  // Per-athlete + time: save all at once
  async function saveAllAthletesTimes() {
    for (const athlete of teamAthletes) {
      const stop = athleteStops[athlete.id];
      if (!stop) continue;
      if (parseMMSS(stop.editValue) === null) {
        toast.error(`Zły format czasu dla ${athlete.name} (M:SS)`);
        return;
      }
    }
    setSubmitting(true);
    let saved = 0;
    for (const athlete of teamAthletes) {
      const stop = athleteStops[athlete.id];
      if (!stop) continue;
      const timeSeconds = parseMMSS(stop.editValue)!;
      const r = await fetch(`/api/events/${selectedEvent!.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: athlete.id, competitionId: selectedComp!.id, timeSeconds }),
      });
      if (r.ok) saved++;
    }
    setSubmitting(false);
    toast.success(`Zapisano ${saved} wyników`);
    goToSetup("team");
  }

  // Per-team + time: STOP
  function handleTeamStop() {
    stopTicker();
    const secs = Math.round((Date.now() - startedAt.current!) / 1000);
    setReviewValue(secondsToMMSS(secs));
    setPhase("review");
  }

  // Per-team + time: save in review
  async function saveTeamTime() {
    const parsed = parseMMSS(reviewValue);
    if (parsed === null) { toast.error("Zły format czasu (M:SS)"); return; }
    setSubmitting(true);
    const r = await fetch(`/api/events/${selectedEvent!.id}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selectedTeamId, competitionId: selectedComp!.id, timeSeconds: parsed }),
    });
    setSubmitting(false);
    if (r.ok) {
      toast.success(`✓ ${selectedTeam?.name} — ${secondsToMMSS(parsed)}`);
      goToSetup("team");
    } else {
      toast.error("Błąd zapisu");
    }
  }

  // Per-athlete + points: save all
  async function saveAllPoints() {
    setSubmitting(true);
    let saved = 0;
    for (const athlete of teamAthletes) {
      const val = pointsInputs[athlete.id]?.trim();
      if (!val) continue;
      const pts = parseInt(val);
      if (isNaN(pts)) continue;
      const r = await fetch(`/api/events/${selectedEvent!.id}/results`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athleteId: athlete.id, competitionId: selectedComp!.id, points: pts }),
      });
      if (r.ok) saved++;
    }
    setSubmitting(false);
    toast.success(`Zapisano ${saved} wyników`);
    goToSetup("team");
  }

  // Per-team + points: save
  async function saveTeamPoints() {
    const pts = parseInt(teamInput);
    if (isNaN(pts)) { toast.error("Wpisz liczbę"); return; }
    setSubmitting(true);
    const r = await fetch(`/api/events/${selectedEvent!.id}/results`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teamId: selectedTeamId, competitionId: selectedComp!.id, points: pts }),
    });
    setSubmitting(false);
    if (r.ok) {
      toast.success(`✓ ${selectedTeam?.name} — ${pts} pkt`);
      goToSetup("team");
    } else {
      toast.error("Błąd zapisu");
    }
  }

  const allAthletesStopped = teamAthletes.length > 0 && teamAthletes.every((a) => athleteStops[a.id]);

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Ładowanie…</div>;
  }

  if (events.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center">
        <div>
          <p className="text-2xl font-bold mb-2">Brak aktywnych zawodów</p>
          <p className="text-muted-foreground text-sm">Poproś administratora o aktywowanie zawodów i przypisanie Cię jako sędziego.</p>
        </div>
      </div>
    );
  }

  // ─── SETUP ────────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-5 py-4 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-black">⏱ Pomiar</h1>
            {selectedComp && (
              <Badge variant="outline" className="font-mono">
                {selectedComp.displayOrder}. {selectedComp.name}
              </Badge>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5 space-y-6 max-w-lg mx-auto w-full pb-28">

          {/* STEP: Competition */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                1. Konkurencja
              </label>
              {setupStep !== "competition" && selectedComp && (
                <button onClick={() => setSetupStep("competition")} className="text-xs text-primary underline">
                  Zmień
                </button>
              )}
            </div>

            {setupStep === "competition" ? (
              <div className="space-y-2">
                {events.length > 1 && (
                  <div className="mb-4 space-y-1">
                    <p className="text-xs text-muted-foreground mb-2">Zawody:</p>
                    {events.map((ev) => (
                      <button key={ev.id} onClick={() => { setSelectedEventId(ev.id); setSelectedCompId(""); }}
                        className={`w-full text-left px-3 py-2 rounded-lg border-2 text-sm ${selectedEventId === ev.id ? "border-primary bg-primary/5 font-semibold" : "border-border"}`}>
                        {ev.name}
                      </button>
                    ))}
                  </div>
                )}
                {selectedEvent?.competitions.map((comp) => (
                  <button
                    key={comp.id}
                    onClick={() => { setSelectedCompId(comp.id); setSetupStep("team"); setSelectedTeamId(""); }}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-colors ${selectedCompId === comp.id ? "border-primary bg-primary/5 font-semibold" : "border-border"}`}
                  >
                    <span className="text-muted-foreground text-sm mr-2">{comp.displayOrder}.</span>
                    {comp.name}
                    <span className="ml-2 text-sm">{comp.scoreType === "time" ? "⏱" : "🏆"}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{comp.measureMode === "per_team" ? "· drużyna" : ""}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-3 rounded-xl bg-muted/50 font-semibold">
                {selectedComp?.displayOrder}. {selectedComp?.name}
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {selectedComp?.scoreType === "time" ? "⏱ Czas" : "🏆 Punkty"}
                  {selectedComp?.measureMode === "per_team" ? " · drużyna" : ""}
                </span>
              </div>
            )}
          </section>

          {/* STEP: Team */}
          {setupStep === "team" && selectedEvent && (
            <section>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                2. Drużyna
              </label>
              <div className="space-y-2">
                {selectedEvent.teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => setSelectedTeamId(team.id)}
                    className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-colors text-lg font-medium ${selectedTeamId === team.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    {team.name}
                    {selectedTeamId === team.id && <span className="float-right text-primary">✓</span>}
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {setupStep === "team" && selectedTeamId && selectedComp && (
          <div className="fixed bottom-0 left-0 right-0 p-5 bg-card border-t max-w-lg mx-auto">
            <Button
              className="w-full h-14 text-lg font-bold"
              onClick={handleReadyClick}
            >
              {selectedComp.scoreType === "time" ? "Gotowy → Start pomiaru" : "Gotowy → Wpisz wyniki"}
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── READY (czas, oba tryby) ───────────────────────────────────────────────
  if (phase === "ready") {
    const isPerTeam = selectedComp?.measureMode === "per_team";
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-5 py-4 border-b bg-card">
          <button onClick={() => goToSetup("team")} className="text-sm text-muted-foreground mb-1">← Wróć</button>
          <h2 className="font-bold text-xl">{selectedComp?.name}</h2>
          <p className="text-muted-foreground">{selectedTeam?.name}</p>
          {!isPerTeam && (
            <p className="text-xs text-muted-foreground mt-1">
              {teamAthletes.length} zawodników · jeden start, osobne stoopy
            </p>
          )}
        </header>

        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
          <div className="text-8xl font-mono font-black tabular-nums text-muted-foreground/30">0:00.0</div>
          <p className="text-muted-foreground text-center">
            {isPerTeam ? "Naciśnij START gdy drużyna ruszy" : "Naciśnij START gdy drużyna ruszy — zatrzymasz każdego zawodnika osobno"}
          </p>
          <Button
            className="w-full max-w-sm h-24 text-3xl font-black bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg"
            onClick={handleStart}
          >
            START
          </Button>
        </div>
      </div>
    );
  }

  // ─── RUNNING (czas) ────────────────────────────────────────────────────────
  if (phase === "running") {
    const isPerTeam = selectedComp?.measureMode === "per_team";

    // Per-team: jedna czarna strona z STOP
    if (isPerTeam) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col select-none">
          <header className="px-5 py-4 border-b border-white/20">
            <h2 className="font-bold text-lg">{selectedComp?.name}</h2>
            <p className="text-white/60">{selectedTeam?.name}</p>
          </header>
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-[4.5rem] md:text-[7rem] font-mono font-black tabular-nums leading-none">
              {formatElapsed(elapsed)}
            </div>
            <div className="flex items-center gap-2 text-red-400">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm">Pomiar w toku</span>
            </div>
          </div>
          <div className="p-6 space-y-3">
            <Button
              className="w-full h-24 text-3xl font-black bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-lg"
              onClick={handleTeamStop}
            >
              STOP
            </Button>
            <button onClick={() => { stopTicker(); goToSetup("team"); }} className="w-full text-center text-white/30 text-sm py-3">
              Anuluj
            </button>
          </div>
        </div>
      );
    }

    // Per-athlete: timer + lista zawodników z osobnymi STOP
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-5 py-4 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">{selectedComp?.name} · {selectedTeam?.name}</p>
              <div className="text-3xl font-mono font-black tabular-nums">{formatElapsed(elapsed)}</div>
            </div>
            <div className="flex items-center gap-2 text-red-500">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-medium">LIVE</span>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-2 max-w-lg mx-auto w-full pb-36">
          {teamAthletes.map((athlete) => {
            const stop = athleteStops[athlete.id];
            if (stop) {
              return (
                <div key={athlete.id} className="px-4 py-4 rounded-xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-950/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      {athlete.number != null && <span className="text-muted-foreground text-sm mr-2">#{athlete.number}</span>}
                      <span className="font-semibold text-lg">{athlete.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">zatrzymany</span>
                  </div>
                  <Input
                    className="font-mono text-center h-11"
                    value={stop.editValue}
                    onChange={(e) => setAthleteStops((prev) => ({ ...prev, [athlete.id]: { ...prev[athlete.id], editValue: e.target.value } }))}
                    inputMode="text"
                    placeholder="M:SS"
                  />
                </div>
              );
            }
            return (
              <div key={athlete.id} className="flex items-center justify-between px-4 py-4 rounded-xl border-2 border-border">
                <div>
                  {athlete.number != null && <span className="text-muted-foreground text-sm mr-2">#{athlete.number}</span>}
                  <span className="font-medium text-lg">{athlete.name}</span>
                </div>
                <Button
                  size="sm"
                  className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white font-bold"
                  onClick={() => stopAthlete(athlete.id)}
                >
                  STOP
                </Button>
              </div>
            );
          })}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t max-w-lg mx-auto space-y-2">
          {allAthletesStopped ? (
            <Button
              className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
              onClick={saveAllAthletesTimes}
              disabled={submitting}
            >
              {submitting ? "Zapisywanie…" : `✓ Zapisz wszystkich (${teamAthletes.length})`}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground py-1">
              Pozostało: {teamAthletes.filter((a) => !athleteStops[a.id]).length} zawodników
            </p>
          )}
          <button onClick={() => { stopTicker(); goToSetup("team"); }} className="w-full text-center text-muted-foreground text-sm py-1">
            Anuluj — wróć do wyboru drużyny
          </button>
        </div>
      </div>
    );
  }

  // ─── REVIEW (per_team + time) ──────────────────────────────────────────────
  if (phase === "review") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-5 py-4 border-b bg-card">
          <h2 className="font-bold text-xl">{selectedComp?.name}</h2>
          <p className="text-muted-foreground">{selectedTeam?.name}</p>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Wynik drużyny</p>
          <div className="text-7xl font-mono font-black tabular-nums">{reviewValue}</div>
          <div className="w-full max-w-xs space-y-1.5">
            <label className="text-sm text-muted-foreground">Popraw jeśli potrzeba (format M:SS)</label>
            <Input
              className="text-center text-2xl font-mono h-14"
              value={reviewValue}
              onChange={(e) => setReviewValue(e.target.value)}
              inputMode="text"
              placeholder="0:00"
            />
          </div>
        </div>
        <div className="p-5 border-t bg-card space-y-3 max-w-lg mx-auto w-full">
          <Button
            className="w-full h-16 text-xl font-black bg-green-600 hover:bg-green-700 text-white rounded-2xl"
            onClick={saveTeamTime}
            disabled={submitting || !reviewValue.trim()}
          >
            {submitting ? "Zapisywanie…" : "✓ Wyślij wynik"}
          </Button>
          <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => { resetAll(); startTimer(); setPhase("running"); }} disabled={submitting}>
            Zmierz ponownie
          </Button>
          <button onClick={() => goToSetup("team")} className="w-full text-center text-muted-foreground text-sm py-2" disabled={submitting}>
            Anuluj — wróć do wyboru drużyny
          </button>
        </div>
      </div>
    );
  }

  // ─── POINTS ENTRY ─────────────────────────────────────────────────────────
  if (phase === "points_entry") {
    const isPerTeam = selectedComp?.measureMode === "per_team";
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="px-5 py-4 border-b bg-card">
          <button onClick={() => goToSetup("team")} className="text-sm text-muted-foreground mb-1">← Wróć</button>
          <h2 className="font-bold text-xl">{selectedComp?.name}</h2>
          <p className="text-muted-foreground">{selectedTeam?.name}</p>
        </header>

        <div className="flex-1 overflow-auto p-5 space-y-3 max-w-lg mx-auto w-full pb-28">
          {isPerTeam ? (
            <div className="space-y-4 py-8">
              <label className="text-sm text-muted-foreground block text-center">Wynik drużyny (punkty)</label>
              <Input
                className="text-center text-4xl font-mono h-20"
                type="number"
                inputMode="numeric"
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                placeholder="0"
                autoFocus
              />
            </div>
          ) : (
            teamAthletes.map((athlete) => (
              <div key={athlete.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border">
                <div className="flex-1">
                  {athlete.number != null && <span className="text-muted-foreground text-sm mr-2">#{athlete.number}</span>}
                  <span className="font-medium">{athlete.name}</span>
                </div>
                <Input
                  className="w-24 text-center font-mono h-10"
                  type="number"
                  inputMode="numeric"
                  value={pointsInputs[athlete.id] ?? ""}
                  onChange={(e) => setPointsInputs((prev) => ({ ...prev, [athlete.id]: e.target.value }))}
                  placeholder="pkt"
                />
              </div>
            ))
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-5 bg-card border-t max-w-lg mx-auto space-y-2">
          <Button
            className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white"
            onClick={isPerTeam ? saveTeamPoints : saveAllPoints}
            disabled={submitting || (isPerTeam ? !teamInput.trim() : teamAthletes.every((a) => !pointsInputs[a.id]?.trim()))}
          >
            {submitting ? "Zapisywanie…" : "✓ Zapisz wyniki"}
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
