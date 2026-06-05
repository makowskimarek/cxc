import { NextResponse } from "next/server";
import { getDashboardScores } from "@/lib/db/queries";

export async function GET() {
  try {
    const scores = await getDashboardScores();
    return NextResponse.json(scores, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Dashboard query failed:", error);
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 });
  }
}
