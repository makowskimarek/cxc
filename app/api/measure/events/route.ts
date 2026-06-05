import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { events, eventJudges, eventTeams, eventCompetitions, competitions, teams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

    const userId = session.user?.id ?? "";
    const isAdmin = session.user?.role === "admin";

    let allowedEventIds: string[] | null = null;

    if (!isAdmin) {
      const judgeEvents = await db
        .select({ eventId: eventJudges.eventId })
        .from(eventJudges)
        .where(eq(eventJudges.userId, userId));
      allowedEventIds = judgeEvents.map((r) => r.eventId);
      if (allowedEventIds.length === 0) return NextResponse.json([]);
    }

    const allEvents = await db
      .select()
      .from(events)
      .where(eq(events.isActive, true))
      .orderBy(events.date);

    const filteredEvents = isAdmin
      ? allEvents
      : allEvents.filter((e) => allowedEventIds!.includes(e.id));

    const result = await Promise.all(
      filteredEvents.map(async (event) => {
        const comps = await db
          .select({
            id: competitions.id,
            name: competitions.name,
            scoreType: competitions.scoreType,
            lowerIsBetter: competitions.lowerIsBetter,
            measureMode: competitions.measureMode,
            displayOrder: eventCompetitions.displayOrder,
          })
          .from(eventCompetitions)
          .innerJoin(competitions, eq(eventCompetitions.competitionId, competitions.id))
          .where(eq(eventCompetitions.eventId, event.id))
          .orderBy(eventCompetitions.displayOrder);

        const teamRows = await db
          .select({ id: teams.id, name: teams.name })
          .from(eventTeams)
          .innerJoin(teams, eq(eventTeams.teamId, teams.id))
          .where(eq(eventTeams.eventId, event.id))
          .orderBy(eventTeams.displayOrder, teams.name);

        return { ...event, competitions: comps, teams: teamRows };
      })
    );

    return NextResponse.json(result);
  } catch (err) {
    console.error("[measure/events]", err);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
