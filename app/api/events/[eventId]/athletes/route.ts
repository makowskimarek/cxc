import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { athletes, teams, eventTeams } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;

  const teamRows = await db
    .select({ teamId: eventTeams.teamId })
    .from(eventTeams)
    .where(eq(eventTeams.eventId, eventId));

  if (teamRows.length === 0) return NextResponse.json([]);

  const athleteList = await db
    .select({
      id: athletes.id,
      name: athletes.name,
      number: athletes.number,
      teamId: athletes.teamId,
      teamName: teams.name,
    })
    .from(athletes)
    .leftJoin(teams, eq(athletes.teamId, teams.id))
    .where(inArray(athletes.teamId, teamRows.map((r) => r.teamId)))
    .orderBy(teams.name, athletes.name);

  return NextResponse.json(athleteList);
}
