import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { athletes, teams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const all = await db
    .select({ id: athletes.id, name: athletes.name, number: athletes.number, teamId: athletes.teamId, teamName: teams.name })
    .from(athletes)
    .leftJoin(teams, eq(athletes.teamId, teams.id))
    .orderBy(athletes.name);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const body = await req.json();
  const [athlete] = await db.insert(athletes).values({ name: body.name, number: body.number ?? null, teamId: body.teamId }).returning();
  return NextResponse.json(athlete, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const body = await req.json();
  const [athlete] = await db.update(athletes).set({ name: body.name, number: body.number ?? null, teamId: body.teamId }).where(eq(athletes.id, body.id)).returning();
  return NextResponse.json(athlete);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

  await db.delete(athletes).where(eq(athletes.id, id));
  return NextResponse.json({ ok: true });
}
