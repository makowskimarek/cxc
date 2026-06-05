import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const all = await db.select({ id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt }).from(users).orderBy(users.name);
  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  const hashed = await bcrypt.hash(body.password, 12);
  const [user] = await db.insert(users).values({ email: body.email, password: hashed, name: body.name, role: body.role ?? "judge" }).returning({ id: users.id, email: users.email, name: users.name, role: users.role });
  return NextResponse.json(user, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const body = await req.json();
  const update: Record<string, unknown> = { name: body.name, role: body.role };
  if (body.password) update.password = await bcrypt.hash(body.password, 12);

  const [user] = await db.update(users).set(update).where(eq(users.id, body.id)).returning({ id: users.id, email: users.email, name: users.name, role: users.role });
  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session || session.user?.role !== "admin") return NextResponse.json({ error: "Brak dostępu" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Brak id" }, { status: 400 });
  if (id === session.user?.id) return NextResponse.json({ error: "Nie możesz usunąć własnego konta" }, { status: 400 });

  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
