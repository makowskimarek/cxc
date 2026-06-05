"use client";

import { TeamScore } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface Props {
  scores: TeamScore[];
  compact?: boolean;
}

export function TeamRawResultsTable({ scores, compact = false }: Props) {
  if (scores.length === 0) {
    return <p className="text-center text-muted-foreground py-12">Brak wyników do wyświetlenia.</p>;
  }

  const competitions = scores[0]?.competitions ?? [];

  return (
    <div className="overflow-x-auto w-full">
      <table className={`w-full border-collapse ${compact ? "text-sm" : "text-base"}`}>
        <thead>
          <tr className="border-b-2 border-border">
            <th className="text-left py-3 px-3 font-semibold text-muted-foreground w-8">#</th>
            <th className="text-left py-3 px-3 font-semibold">Drużyna</th>
            {competitions.map((c) => (
              <th key={c.competitionId} className="text-center py-3 px-2 font-semibold text-muted-foreground min-w-[80px]">
                <span className="hidden md:block">{c.competitionName}</span>
                <span className="md:hidden">{c.displayOrder}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {scores.map((team, idx) => (
            <tr key={team.teamId} className="border-b hover:bg-muted/30 transition-colors">
              <td className="py-3 px-3 text-center font-bold text-lg text-muted-foreground">
                {idx + 1}
              </td>
              <td className="py-3 px-3 font-semibold">{team.teamName}</td>
              {team.competitions.map((c) => (
                <td key={c.competitionId} className="py-3 px-2 text-center">
                  {c.hasResult ? (
                    <Badge variant="outline" className="font-mono font-semibold">
                      {c.scoreType === "time" && c.rawTime !== null
                        ? formatTime(c.rawTime)
                        : c.rawPoints !== null
                        ? c.rawPoints
                        : "—"}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
