import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { eventJudges, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";

type Ctx = { params: Promise<{ eventId: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const rows = await db
    .select({ userId: eventJudges.userId, name: users.name, email: users.email })
    .from(eventJudges)
    .leftJoin(users, eq(eventJudges.userId, users.id))
    .where(eq(eventJudges.eventId, eventId));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  await db.insert(eventJudges).values({ eventId, userId: body.userId }).onConflictDoNothing();
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { eventId } = await params;
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "Brak userId" }, { status: 400 });

  await db.delete(eventJudges).where(and(eq(eventJudges.eventId, eventId), eq(eventJudges.userId, userId)));
  return NextResponse.json({ ok: true });
}
