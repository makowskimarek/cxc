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

interface EventData {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  competitions: Competition[];
  teams: Team[];
}

interface Athlete {
  id: string;
  name: string;
  number: number | null;
  teamId: string;
  teamName: string | null;
}

interface AthleteStop {
  elapsedMs: number;
  editValue: string;
}

type Tab = "events" | "measure";
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

  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedCompId, setSelectedCompId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [setupStep, setSetupStep] = useState<SetupStep>("competition");
  const [phase, setPhase] = useState<Phase>("setup");

  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);

  const [athleteStops, setAthleteStops] = useState<Record<string, AthleteStop>>({});
  const [pointsInputs, setPointsInputs] = useState<Record<string, string>>({});
  const [teamInput, setTeamInput] = useState("");
  const [reviewValue, setReviewValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existingResults, setExistingResults] = useState<Array<{ teamId: string | null; athleteId: string | null; competitionId: string }>>([]);
  const [showOverwriteConfirm, setShowOverwriteConfirm] = useState(false);

  useEffect(() => {
    fetch("/api/measure/events")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<EventData[]>;
      })
      .then((data) => {
        setEvents(data);
        const savedEventId = localStorage.getItem(LS_EVENT);
        const savedCompId = localStorage.getItem(LS_COMP);

        const matchedEvent = data.find((e) => e.id === savedEventId);
        if (matchedEvent) {
          setSelectedEventId(matchedEvent.id);
          const comp = matchedEvent.competitions.find((c) => c.id === savedCompId) ?? matchedEvent.competitions[0];
          if (comp) setSelectedCompId(comp.id);
          setActiveTab("measure");
        } else if (data.length === 1) {
          setSelectedEventId(data[0].id);
          if (data[0].competitions[0]) setSelectedCompId(data[0].competitions[0].id);
          setActiveTab("measure");
        } else {
          setActiveTab("events");
        }
      })
      .catch(() => toast.error("Nie udało się załadować danych. Odśwież stronę."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    Promise.all([
      fetch(`/api/events/${selectedEventId}/athletes`).then((r) => r.json() as Promise<Athlete[]>),
      fetch(`/api/events/${selectedEventId}/results`).then((r) => r.json()),
    ]).then(([athletesData, resultsData]) => {
      setAthletes(athletesData);
      setExistingResults(resultsData);
    }).catch(() => {});
  }, [selectedEventId]);

  function reloadResults() {
    if (!selectedEventId) return;
    fetch(`/api/events/${selectedEventId}/results`)
      .then((r) => r.json())
      .then(setExistingResults)
      .catch(() => {});
  }

  function selectEvent(eventId: string) {
    const ev = events.find((e) => e.id === eventId)!;
    setSelectedEventId(eventId);
    const firstComp = ev.competitions[0];
    if (firstComp) setSelectedCompId(firstComp.id);
    localStorage.setItem(LS_EVENT, eventId);
    if (firstComp) localStorage.setItem(LS_COMP, firstComp.id);
    resetAll();
    setSetupStep("competition");
    setPhase("setup");
    setActiveTab("measure");
    toast.success(`Wybrano: ${ev.name}`);
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const selectedComp = selectedEvent?.competitions.find((c) => c.id === selectedCompId);
  const selectedTeam = selectedEvent?.teams.find((t) => t.id === selectedTeamId);
  const teamAthletes = athletes.filter((a) => a.teamId === selectedTeamId);

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

  function teamHasResult(teamId: string): boolean {
    if (!selectedCompId) return false;
    const comp = selectedEvent?.competitions.find((c) => c.id === selectedCompId);
    if (!comp) return false;
    if (comp.measureMode === "per_team") {
      return existingResults.some(
        (r) => r.teamId === teamId && r.competitionId === selectedCompId && r.athleteId === null
      );
    }
    const teamAthleteIds = athletes.filter((a) => a.teamId === teamId).map((a) => a.id);
    return existingResults.some(
      (r) => r.athleteId !== null && teamAthleteIds.includes(r.athleteId) && r.competitionId === selectedCompId
    );
  }

  function proceedReady() {
    if (selectedComp?.scoreType === "time") {
      setPhase("ready");
    } else {
      setPhase("points_entry");
    }
  }

  function handleStart() {
    localStorage.setItem(LS_COMP, selectedCompId);
    resetAll();
    startTimer();
    setPhase("running");
  }

  function handleReadyClick() {
    localStorage.setItem(LS_COMP, selectedCompId);
    if (teamHasResult(selectedTeamId)) {
      setShowOverwriteConfirm(true);
      return;
    }
    proceedReady();
  }

  function stopAthlete(athleteId: string) {
    const ms = Date.now() - startedAt.current!;
    setAthleteStops((prev) => ({
      ...prev,
      [athleteId]: { elapsedMs: ms, editValue: secondsToMMSS(Math.round(ms / 1000)) },
    }));
  }

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
    reloadResults();
    goToSetup("team");
  }

  function handleTeamStop() {
    stopTicker();
    const secs = Math.round((Date.now() - startedAt.current!) / 1000);
    setReviewValue(secondsToMMSS(secs));
    setPhase("review");
  }

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
      reloadResults();
      goToSetup("team");
    } else {
      toast.error("Błąd zapisu");
    }
  }

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
    reloadResults();
    goToSetup("team");
  }

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
      reloadResults();
      goToSetup("team");
    } else {
      toast.error("Błąd zapisu");
    }
  }

  const allAthletesStopped = teamAthletes.length > 0 && teamAthletes.every((a) => athleteStops[a.id]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Ładowanie…</div>;
  }

  // ─── Full-screen phases (no header/tabs) ──────────────────────────────────
  if (phase === "running" && selectedComp?.measureMode === "per_team") {
    return (
      <div className="h-[calc(100dvh-3.5rem)] md:h-dvh bg-black text-white flex flex-col select-none overflow-hidden">
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
          <Button className="w-full h-24 text-3xl font-black bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-lg" onClick={handleTeamStop}>
            STOP
          </Button>
          <button onClick={() => { stopTicker(); goToSetup("team"); }} className="w-full text-center text-white/30 text-sm py-3">
            Anuluj
          </button>
        </div>
      </div>
    );
  }

  // ─── Layout with header + tabs ─────────────────────────────────────────────
  return (
    <div className="h-[calc(100dvh-3.5rem)] md:h-dvh bg-background flex flex-col overflow-hidden">

      {/* Header */}
      <header className="px-5 py-3 border-b bg-card sticky top-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-black">⏱ Pomiar</h1>
          {selectedEvent && (
            <button
              onClick={() => setActiveTab("events")}
              className="text-xs text-muted-foreground border rounded-full px-3 py-1 hover:bg-muted transition-colors truncate max-w-[180px]"
            >
              {selectedEvent.name}
            </button>
          )}
        </div>

      </header>

      {/* ─── TAB: Zawody ──────────────────────────────────────────────────────── */}
      {activeTab === "events" && (
        <div className="flex-1 min-h-0 overflow-auto p-5 max-w-lg mx-auto w-full space-y-3">
          {events.length === 0 && (
            <div className="text-center py-16">
              <p className="text-2xl font-bold mb-2">Brak dostępnych zawodów</p>
              <p className="text-muted-foreground text-sm">Poproś administratora o aktywowanie zawodów i przypisanie Cię jako sędziego.</p>
            </div>
          )}
          {events.map((ev) => {
            const isSelected = ev.id === selectedEventId;
            return (
              <button
                key={ev.id}
                onClick={() => selectEvent(ev.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-semibold text-base">{ev.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5 space-x-3">
                      {ev.date && <span>📅 {ev.date}</span>}
                      {ev.location && <span>📍 {ev.location}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {ev.competitions.length} konkurencji · {ev.teams.length} drużyn
                    </div>
                  </div>
                  {isSelected
                    ? <Badge className="bg-primary text-primary-foreground shrink-0">Aktywne</Badge>
                    : <span className="text-sm text-primary font-medium shrink-0">Wybierz →</span>
                  }
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── TAB: Pomiar ──────────────────────────────────────────────────────── */}
      {activeTab === "measure" && (
        <>
          {/* SETUP */}
          {phase === "setup" && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto p-5 space-y-6 max-w-lg mx-auto w-full pb-28">

                {/* Competition */}
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
                      {selectedEvent?.competitions.map((comp) => (
                        <button
                          key={comp.id}
                          onClick={() => { setSelectedCompId(comp.id); setSetupStep("team"); setSelectedTeamId(""); }}
                          className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-colors ${
                            selectedCompId === comp.id ? "border-primary bg-primary/5 font-semibold" : "border-border"
                          }`}
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

                {/* Team */}
                {setupStep === "team" && selectedEvent && (
                  <section>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-3">
                      2. Drużyna
                    </label>
                    <div className="space-y-2">
                      {selectedEvent.teams.map((team) => {
                        const hasResult = teamHasResult(team.id);
                        const isSelected = selectedTeamId === team.id;
                        return (
                          <button
                            key={team.id}
                            onClick={() => setSelectedTeamId(team.id)}
                            className={`w-full text-left px-4 py-4 rounded-xl border-2 transition-colors text-lg font-medium ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : hasResult
                                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                                  : "border-border"
                            }`}
                          >
                            <span>{team.name}</span>
                            {isSelected && <span className="float-right text-primary">✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>

              {setupStep === "team" && selectedTeamId && selectedComp && (
                <div className="fixed bottom-0 left-0 right-0 p-5 bg-card border-t max-w-lg mx-auto">
                  <Button className="w-full h-14 text-lg font-bold" onClick={handleReadyClick}>
                    {selectedComp.scoreType === "time" ? "Gotowy → Start pomiaru" : "Gotowy → Wpisz wyniki"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* READY */}
          {phase === "ready" && (
            <div className="flex-1 flex flex-col">
              <div className="px-5 py-4 border-b bg-card">
                <button onClick={() => goToSetup("team")} className="text-sm text-muted-foreground mb-1">← Wróć</button>
                <h2 className="font-bold text-xl">{selectedComp?.name}</h2>
                <p className="text-muted-foreground">{selectedTeam?.name}</p>
                {selectedComp?.measureMode !== "per_team" && (
                  <p className="text-xs text-muted-foreground mt-1">{teamAthletes.length} zawodników · jeden start, osobne stopy</p>
                )}
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
                <div className="text-8xl font-mono font-black tabular-nums text-muted-foreground/30">0:00.0</div>
                <p className="text-muted-foreground text-center">
                  {selectedComp?.measureMode === "per_team"
                    ? "Naciśnij START gdy drużyna ruszy"
                    : "Naciśnij START gdy drużyna ruszy — zatrzymasz każdego zawodnika osobno"}
                </p>
                <Button className="w-full max-w-sm h-24 text-3xl font-black bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg" onClick={handleStart}>
                  START
                </Button>
              </div>
            </div>
          )}

          {/* RUNNING per_athlete */}
          {phase === "running" && selectedComp?.measureMode === "per_athlete" && (
            <div className="flex-1 flex flex-col overflow-hidden">
              <header className="px-5 py-4 border-b bg-card shrink-0">
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
              <div className="flex-1 min-h-0 overflow-auto p-4 space-y-2 max-w-lg mx-auto w-full">
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
                      <Button size="sm" className="h-10 px-5 bg-red-600 hover:bg-red-700 text-white font-bold" onClick={() => stopAthlete(athlete.id)}>
                        STOP
                      </Button>
                    </div>
                  );
                })}
              </div>
              <div className="shrink-0 p-4 bg-card border-t max-w-lg mx-auto w-full space-y-2">
                {allAthletesStopped ? (
                  <Button className="w-full h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white" onClick={saveAllAthletesTimes} disabled={submitting}>
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
          )}

          {/* REVIEW */}
          {phase === "review" && (
            <div className="flex-1 flex flex-col">
              <div className="px-5 py-4 border-b bg-card">
                <h2 className="font-bold text-xl">{selectedComp?.name}</h2>
                <p className="text-muted-foreground">{selectedTeam?.name}</p>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8">
                <p className="text-sm text-muted-foreground uppercase tracking-widest">Wynik drużyny</p>
                <div className="text-7xl font-mono font-black tabular-nums">{reviewValue}</div>
                <div className="w-full max-w-xs space-y-1.5">
                  <label className="text-sm text-muted-foreground">Popraw jeśli potrzeba (format M:SS)</label>
                  <Input className="text-center text-2xl font-mono h-14" value={reviewValue} onChange={(e) => setReviewValue(e.target.value)} inputMode="text" placeholder="0:00" />
                </div>
              </div>
              <div className="p-5 border-t bg-card space-y-3 max-w-lg mx-auto w-full">
                <Button className="w-full h-16 text-xl font-black bg-green-600 hover:bg-green-700 text-white rounded-2xl" onClick={saveTeamTime} disabled={submitting || !reviewValue.trim()}>
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
          )}

          {/* POINTS ENTRY */}
          {phase === "points_entry" && (
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="px-5 py-4 border-b bg-card shrink-0">
                <button onClick={() => goToSetup("team")} className="text-sm text-muted-foreground mb-1">← Wróć</button>
                <h2 className="font-bold text-xl">{selectedComp?.name}</h2>
                <p className="text-muted-foreground">{selectedTeam?.name}</p>
              </div>
              <div className="flex-1 min-h-0 overflow-auto p-5 space-y-3 max-w-lg mx-auto w-full pb-28">
                {selectedComp?.measureMode === "per_team" ? (
                  <div className="space-y-4 py-8">
                    <label className="text-sm text-muted-foreground block text-center">Wynik drużyny (punkty)</label>
                    <Input className="text-center text-4xl font-mono h-20" type="number" inputMode="numeric" value={teamInput} onChange={(e) => setTeamInput(e.target.value)} placeholder="0" autoFocus />
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
                  onClick={selectedComp?.measureMode === "per_team" ? saveTeamPoints : saveAllPoints}
                  disabled={submitting || (selectedComp?.measureMode === "per_team" ? !teamInput.trim() : teamAthletes.every((a) => !pointsInputs[a.id]?.trim()))}
                >
                  {submitting ? "Zapisywanie…" : "✓ Zapisz wyniki"}
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Potwierdzenie nadpisania wyniku */}
      {showOverwriteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="bg-card w-full rounded-t-2xl p-6 space-y-4 max-w-lg mx-auto shadow-2xl">
            <h3 className="font-bold text-xl">Drużyna ma już wynik</h3>
            <p className="text-muted-foreground">
              <strong>{selectedTeam?.name}</strong> ma już zapisany wynik w konkurencji <strong>{selectedComp?.name}</strong>. Czy na pewno chcesz wykonać pomiar ponownie i nadpisać wynik?
            </p>
            <Button
              className="w-full h-14 text-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl"
              onClick={() => { setShowOverwriteConfirm(false); proceedReady(); }}
            >
              Tak, zmierz ponownie
            </Button>
            <Button
              variant="outline"
              className="w-full h-12 rounded-xl"
              onClick={() => setShowOverwriteConfirm(false)}
            >
              Anuluj
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
