import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventCompetitions, competitions } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const rows = await db
    .select({
      id: eventCompetitions.id,
      eventId: eventCompetitions.eventId,
      competitionId: eventCompetitions.competitionId,
      displayOrder: eventCompetitions.displayOrder,
      name: competitions.name,
      scoreType: competitions.scoreType,
      lowerIsBetter: competitions.lowerIsBetter,
      measureMode: competitions.measureMode,
    })
    .from(eventCompetitions)
    .leftJoin(competitions, eq(eventCompetitions.competitionId, competitions.id))
    .where(eq(eventCompetitions.eventId, eventId))
    .orderBy(eventCompetitions.displayOrder);
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  await db.insert(eventCompetitions).values({
    eventId,
    competitionId: body.competitionId,
    displayOrder: body.displayOrder ?? 0,
  }).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body: { competitionId: string; displayOrder: number }[] = await req.json();
  await Promise.all(
    body.map(({ competitionId, displayOrder }) =>
      db
        .update(eventCompetitions)
        .set({ displayOrder })
        .where(and(eq(eventCompetitions.eventId, eventId), eq(eventCompetitions.competitionId, competitionId)))
    )
  );
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const competitionId = searchParams.get("competitionId");
  if (!competitionId) return NextResponse.json({ error: "Brak competitionId" }, { status: 400 });

  await db.delete(eventCompetitions).where(
    and(eq(eventCompetitions.eventId, eventId), eq(eventCompetitions.competitionId, competitionId))
  );
  return NextResponse.json({ ok: true });
}
