import Link from "next/link";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

type Props = { params: Promise<{ eventId: string }> };

export default async function EventDetailPage({ params }: Props) {
  const { eventId } = await params;
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event) notFound();

  const sections = [
    { href: `${eventId}/competitions`, icon: "🎯", label: "Konkurencje", desc: "Przypisz i posortuj konkurencje dla tych zawodów" },
    { href: `${eventId}/teams`, icon: "👥", label: "Drużyny", desc: "Wybierz drużyny uczestniczące w zawodach" },
    { href: `${eventId}/judges`, icon: "👤", label: "Sędziowie", desc: "Przypisz sędziów do tych zawodów" },
    { href: `${eventId}/results`, icon: "📊", label: "Wyniki", desc: "Wprowadź i edytuj wyniki zawodników" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/admin/events" className="text-sm text-muted-foreground hover:text-foreground">← Wszystkie zawody</Link>
        <h1 className="text-2xl font-bold mt-2">{event.name}</h1>
        {event.date && <p className="text-muted-foreground text-sm">📅 {event.date} {event.location ? `· 📍 ${event.location}` : ""}</p>}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sections.map((s) => (
          <Link key={s.href} href={`/admin/events/${s.href}`}>
            <Card className="hover:border-primary transition-colors cursor-pointer h-full">
              <CardContent className="p-6 flex gap-4 items-start">
                <span className="text-3xl">{s.icon}</span>
                <div>
                  <div className="font-semibold text-lg">{s.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">{s.desc}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
