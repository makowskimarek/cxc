"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
}

type Props = { params: Promise<{ eventId: string }> };

export default function EventTeamsPage({ params }: Props) {
  const { eventId } = use(params);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  async function load() {
    const [all, assigned] = await Promise.all([
      fetch("/api/teams").then((r) => r.json()),
      fetch(`/api/events/${eventId}/teams`).then((r) => r.json()),
    ]);
    setAllTeams(all);
    setAssignedIds(new Set(assigned.map((t: { teamId: string }) => t.teamId)));
  }

  useEffect(() => { load(); }, [eventId]);

  async function toggle(teamId: string) {
    if (assignedIds.has(teamId)) {
      await fetch(`/api/events/${eventId}/teams?teamId=${teamId}`, { method: "DELETE" });
      toast.success("Usunięto drużynę z zawodów");
    } else {
      await fetch(`/api/events/${eventId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      toast.success("Dodano drużynę do zawodów");
    }
    load();
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href={`/admin/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground">← Zawody</Link>
        <h1 className="text-2xl font-bold mt-2">Drużyny w zawodach</h1>
        <p className="text-muted-foreground text-sm mt-1">Wybierz które drużyny uczestniczą w tych zawodach.</p>
      </div>

      <div className="space-y-2 max-w-xl">
        {allTeams.map((team) => {
          const assigned = assignedIds.has(team.id);
          return (
            <div key={team.id} className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${assigned ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex items-center gap-3">
                {assigned && <span className="text-green-600">✓</span>}
                <span className="font-medium">{team.name}</span>
              </div>
              <Button variant={assigned ? "destructive" : "default"} size="sm" onClick={() => toggle(team.id)}>
                {assigned ? "Usuń" : "Dodaj"}
              </Button>
            </div>
          );
        })}
        {allTeams.length === 0 && (
          <p className="text-muted-foreground py-8 text-center">
            Brak drużyn. <Link href="/admin/teams" className="text-primary underline">Utwórz drużyny</Link>
          </p>
        )}
      </div>
    </div>
  );
}
