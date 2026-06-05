import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { competitions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET() {
  const all = await db.select().from(competitions).orderBy(competitions.name);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  const [comp] = await db.insert(competitions).values({
    name: body.name,
    description: body.description ?? null,
    scoreType: body.scoreType ?? "points",
    lowerIsBetter: body.lowerIsBetter ?? false,
    measureMode: body.measureMode ?? "per_athlete",
    videoUrl: body.videoUrl ?? null,
  }).returning();
  return NextResponse.json(comp, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  const [comp] = await db.update(competitions).set({
    name: body.name,
    description: body.description ?? null,
    scoreType: body.scoreType,
    lowerIsBetter: body.lowerIsBetter ?? false,
    measureMode: body.measureMode ?? "per_athlete",
    videoUrl: body.videoUrl ?? null,
  }).where(eq(competitions.id, body.id)).returning();
  return NextResponse.json(comp);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });

  await db.delete(competitions).where(eq(competitions.id, id));
  return NextResponse.json({ ok: true });
}
