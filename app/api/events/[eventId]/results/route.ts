import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { results, athletes, teams, eventTeams, eventCompetitions, competitions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const rows = await db
    .select({
      id: results.id,
      athleteId: results.athleteId,
      teamId: results.teamId,
      competitionId: results.competitionId,
      points: results.points,
      timeSeconds: results.timeSeconds,
      updatedAt: results.updatedAt,
      athleteName: athletes.name,
      athleteNumber: athletes.number,
      athleteTeamId: athletes.teamId,
      teamName: teams.name,
    })
    .from(results)
    .leftJoin(athletes, eq(results.athleteId, athletes.id))
    .leftJoin(teams, eq(athletes.teamId, teams.id))
    .where(eq(results.eventId, eventId));

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const body = await req.json();
  const { athleteId, teamId, competitionId, points, timeSeconds } = body;

  if (!athleteId && !teamId) {
    return NextResponse.json({ error: "Wymagane athleteId lub teamId" }, { status: 400 });
  }

  const judgeId = session.user?.id ?? null;
  const set = { points: points ?? null, timeSeconds: timeSeconds ?? null, judgeId, updatedAt: new Date() };

  let result;

  if (teamId) {
    [result] = await db
      .insert(results)
      .values({ eventId, teamId, athleteId: null, competitionId, ...set })
      .onConflictDoUpdate({
        target: [results.eventId, results.teamId, results.competitionId],
        set,
      })
      .returning();
  } else {
    [result] = await db
      .insert(results)
      .values({ eventId, athleteId, teamId: null, competitionId, ...set })
      .onConflictDoUpdate({
        target: [results.eventId, results.athleteId, results.competitionId],
        set,
      })
      .returning();
  }

  return NextResponse.json(result);
}

export async function GET_athletes(_req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;

  const teamIds = await db
    .select({ teamId: eventTeams.teamId })
    .from(eventTeams)
    .where(eq(eventTeams.eventId, eventId));

  const athleteList = await db
    .select({ id: athletes.id, name: athletes.name, number: athletes.number, teamId: athletes.teamId, teamName: teams.name })
    .from(athletes)
    .leftJoin(teams, eq(athletes.teamId, teams.id))
    .where(inArray(athletes.teamId, teamIds.map((r) => r.teamId)));

  return NextResponse.json(athleteList);
}
