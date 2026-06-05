import { db } from "./index";
import { sql } from "drizzle-orm";

export interface CompetitionScore {
  competitionId: string;
  competitionName: string;
  displayOrder: number;
  rankingPoints: number;
  hasResult: boolean;
}

export interface TeamScore {
  teamId: string;
  teamName: string;
  logoUrl: string | null;
  eventId: string;
  competitions: CompetitionScore[];
  totalRankingPoints: number;
}

type RawRow = {
  team_id: string;
  team_name: string;
  logo_url: string | null;
  event_id: string;
  competition_id: string;
  competition_name: string;
  score_type: "points" | "time";
  display_order: number;
  lower_is_better: boolean;
  total_points: string | null;
  best_time: string | null;
};

export async function getDashboardScores(): Promise<TeamScore[]> {
  const rawResult = await db.execute(sql`
    SELECT
      t.id           AS team_id,
      t.name         AS team_name,
      t.logo_url,
      ec.competition_id,
      c.name         AS competition_name,
      c.score_type,
      ec.display_order,
      c.lower_is_better,
      e.id           AS event_id,
      COALESCE(tr.points,       SUM(ar.points))         AS total_points,
      COALESCE(tr.time_seconds, MIN(ar.time_seconds))   AS best_time
    FROM event_teams et
    JOIN teams t ON t.id = et.team_id
    JOIN events e ON e.id = et.event_id AND e.is_active = true
    JOIN event_competitions ec ON ec.event_id = e.id
    JOIN competitions c ON c.id = ec.competition_id
    LEFT JOIN results tr ON tr.event_id = e.id
        AND tr.competition_id = ec.competition_id
        AND tr.team_id = t.id
        AND tr.athlete_id IS NULL
    LEFT JOIN athletes a ON a.team_id = t.id
    LEFT JOIN results ar ON ar.athlete_id = a.id
        AND ar.competition_id = ec.competition_id
        AND ar.event_id = e.id
    GROUP BY t.id, t.name, t.logo_url, ec.competition_id, c.name,
             c.score_type, c.lower_is_better, ec.display_order, e.id,
             tr.points, tr.time_seconds
    ORDER BY t.name, ec.display_order
  `);

  const rows = rawResult.rows as RawRow[];
  if (rows.length === 0) return [];

  const teamIds = [...new Set(rows.map((r) => r.team_id))];
  const N = teamIds.length;

  // Group by competition
  const compMap = new Map<string, RawRow[]>();
  for (const row of rows) {
    if (!compMap.has(row.competition_id)) compMap.set(row.competition_id, []);
    compMap.get(row.competition_id)!.push(row);
  }

  // Assign ranking points per competition
  const rankingMap = new Map<string, Map<string, number>>();
  for (const teamId of teamIds) rankingMap.set(teamId, new Map());

  for (const [compId, compRows] of compMap) {
    const withResults = compRows.filter((r) => r.total_points !== null || r.best_time !== null);

    const sorted = [...withResults].sort((a, b) => {
      if (a.score_type === "time") {
        const aVal = a.best_time !== null ? Number(a.best_time) : Infinity;
        const bVal = b.best_time !== null ? Number(b.best_time) : Infinity;
        return a.lower_is_better ? aVal - bVal : bVal - aVal;
      }
      const aVal = a.total_points !== null ? Number(a.total_points) : -Infinity;
      const bVal = b.total_points !== null ? Number(b.total_points) : -Infinity;
      return bVal - aVal;
    });

    sorted.forEach((row, i) => {
      rankingMap.get(row.team_id)!.set(compId, N - i);
    });
  }

  // Build TeamScore
  const teamMap = new Map<string, TeamScore>();

  for (const row of rows) {
    if (!teamMap.has(row.team_id)) {
      teamMap.set(row.team_id, {
        teamId: row.team_id,
        teamName: row.team_name,
        logoUrl: row.logo_url,
        eventId: row.event_id,
        competitions: [],
        totalRankingPoints: 0,
      });
    }

    const team = teamMap.get(row.team_id)!;
    const rankingPoints = rankingMap.get(row.team_id)?.get(row.competition_id) ?? 0;
    const hasResult = row.total_points !== null || row.best_time !== null;

    team.competitions.push({
      competitionId: row.competition_id,
      competitionName: row.competition_name,
      displayOrder: Number(row.display_order),
      rankingPoints,
      hasResult,
    });

    team.totalRankingPoints += rankingPoints;
  }

  for (const team of teamMap.values()) {
    team.competitions.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  return Array.from(teamMap.values()).sort((a, b) => b.totalRankingPoints - a.totalRankingPoints);
}
