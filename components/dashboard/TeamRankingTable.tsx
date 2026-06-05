"use client";

import { TeamScore } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";

const medals = ["🥇", "🥈", "🥉"];
const medalColors = [
  "border-yellow-400 bg-yellow-50 dark:bg-yellow-950",
  "border-gray-300 bg-gray-50 dark:bg-gray-950",
  "border-amber-600 bg-amber-50 dark:bg-amber-950",
];

interface Props {
  scores: TeamScore[];
  compact?: boolean;
}

export function TeamRankingTable({ scores, compact = false }: Props) {
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
            <th className="text-right py-3 px-3 font-bold min-w-[80px]">Punkty</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((team, idx) => (
            <tr
              key={team.teamId}
              className={`border-b transition-colors ${idx < 3 ? medalColors[idx] + " border-l-4" : "hover:bg-muted/30"}`}
            >
              <td className="py-3 px-3 text-center font-bold text-lg">
                {medals[idx] ?? idx + 1}
              </td>
              <td className="py-3 px-3 font-semibold">{team.teamName}</td>
              {team.competitions.map((c) => (
                <td key={c.competitionId} className="py-3 px-2 text-center">
                  {c.hasResult
                    ? <Badge variant="secondary" className="font-mono font-semibold">{c.rankingPoints}</Badge>
                    : <span className="text-muted-foreground">—</span>}
                </td>
              ))}
              <td className="py-3 px-3 text-right font-bold text-lg">{team.totalRankingPoints}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
