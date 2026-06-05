import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventTeams, teams } from "@/lib/db/schema";
import { eq, and, max, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const rows = await db
    .select({ teamId: eventTeams.teamId, name: teams.name, logoUrl: teams.logoUrl, displayOrder: eventTeams.displayOrder })
    .from(eventTeams)
    .leftJoin(teams, eq(eventTeams.teamId, teams.id))
    .where(eq(eventTeams.eventId, eventId))
    .orderBy(asc(eventTeams.displayOrder));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();

  const [maxRow] = await db
    .select({ maxOrder: max(eventTeams.displayOrder) })
    .from(eventTeams)
    .where(eq(eventTeams.eventId, eventId));

  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  await db.insert(eventTeams).values({ eventId, teamId: body.teamId, displayOrder: nextOrder }).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { order }: { order: string[] } = await req.json();

  await db.transaction(async (tx) => {
    for (let i = 0; i < order.length; i++) {
      await tx
        .update(eventTeams)
        .set({ displayOrder: i })
        .where(and(eq(eventTeams.eventId, eventId), eq(eventTeams.teamId, order[i])));
    }
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");
  if (!teamId) return NextResponse.json({ error: "Brak teamId" }, { status: 400 });

  await db.delete(eventTeams).where(and(eq(eventTeams.eventId, eventId), eq(eventTeams.teamId, teamId)));
  return NextResponse.json({ ok: true });
}
