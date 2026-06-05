import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const all = await db.select().from(events).orderBy(events.date);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  const [event] = await db.insert(events).values({
    name: body.name,
    date: body.date ?? null,
    location: body.location ?? null,
    description: body.description ?? null,
    isActive: body.isActive ?? false,
  }).returning();
  return NextResponse.json(event, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  const [event] = await db.update(events).set({
    name: body.name,
    date: body.date ?? null,
    location: body.location ?? null,
    description: body.description ?? null,
    isActive: body.isActive ?? false,
  }).where(eq(events.id, body.id)).returning();
  return NextResponse.json(event);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

  await db.delete(events).where(eq(events.id, id));
  return NextResponse.json({ ok: true });
}
