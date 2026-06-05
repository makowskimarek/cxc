import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { teams } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const all = await db.select().from(teams).orderBy(teams.name);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const body = await req.json();
  const [team] = await db.insert(teams).values({ name: body.name, logoUrl: body.logoUrl ?? null }).returning();
  return NextResponse.json(team, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Brak dostępu" }, { status: 401 });

  const body = await req.json();
  const [team] = await db.update(teams).set({ name: body.name, logoUrl: body.logoUrl ?? null }).where(eq(teams.id, body.id)).returning();
  return NextResponse.json(team);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

  await db.delete(teams).where(eq(teams.id, id));
  return NextResponse.json({ ok: true });
}
