import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventTeams, teams } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const rows = await db
    .select({ teamId: eventTeams.teamId, name: teams.name, logoUrl: teams.logoUrl })
    .from(eventTeams)
    .leftJoin(teams, eq(eventTeams.teamId, teams.id))
    .where(eq(eventTeams.eventId, eventId));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  await db.insert(eventTeams).values({ eventId, teamId: body.teamId }).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
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
