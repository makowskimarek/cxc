import Link from "next/link";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/link-button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const activeEvents = await db.select().from(events).where(eq(events.isActive, true)).limit(1);
  const activeEvent = activeEvents[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative bg-black text-white overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-800" />
        <div className="relative max-w-5xl mx-auto px-6 py-24 md:py-36 text-center">
          <p className="text-white/50 tracking-widest text-sm mb-6 uppercase">
            Fitness · Drużyny · Rywalizacja
          </p>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6">
            Carbon Extreme<br />
            <span className="text-white/60">Challenge</span>
          </h1>
          <p className="text-xl text-white/60 max-w-2xl mx-auto mb-10">
            Drużynowe zawody fitness — 10 dyscyplin, jedna drużyna, jeden cel. Sprawdź, kto jest najsilniejszy.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <LinkButton href="/dashboard" size="lg" className="bg-white text-black hover:bg-white/90 font-bold">Wyniki na żywo</LinkButton>
            <LinkButton href="/competitions" size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">Konkurencje</LinkButton>
          </div>
        </div>
      </section>

      {/* Active event info */}
      {activeEvent && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Aktualne zawody</h2>
          <Card className="border-2">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge className="bg-green-600 text-white">Na żywo</Badge>
                    {activeEvent.date && <span className="text-muted-foreground text-sm">{activeEvent.date}</span>}
                  </div>
                  <h3 className="text-2xl font-bold">{activeEvent.name}</h3>
                  {activeEvent.location && (
                    <p className="text-muted-foreground mt-1">📍 {activeEvent.location}</p>
                  )}
                  {activeEvent.description && (
                    <p className="mt-4 text-muted-foreground max-w-xl">{activeEvent.description}</p>
                  )}
                </div>
                <div className="flex flex-col gap-3 min-w-[160px]">
                  <LinkButton href="/dashboard">Zobacz wyniki</LinkButton>
                  <LinkButton href="/tv" target="_blank" variant="outline">Widok TV ↗</LinkButton>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Info cards */}
      <section className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
        {[
          { icon: "🏋️", title: "10 Dyscyplin", desc: "Od siły do wytrzymałości — rywalizacja w 10 różnych konkurencjach fitness." },
          { icon: "🤝", title: "Drużynowo", desc: "Punkty zbiera cała drużyna. Razem jesteście silniejsi." },
          { icon: "📊", title: "Wyniki na żywo", desc: "Rankingi aktualizują się co 10 sekund — śledź wyniki w czasie rzeczywistym." },
        ].map((card) => (
          <Card key={card.title}>
            <CardContent className="p-6 text-center">
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="font-bold text-lg mb-2">{card.title}</h3>
              <p className="text-muted-foreground text-sm">{card.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-muted-foreground text-sm">
        <p>Carbon Extreme Challenge © 2024</p>
        <div className="mt-2">
          <Link href="/admin/login" className="hover:text-foreground transition-colors">Panel administracyjny</Link>
        </div>
      </footer>
    </div>
  );
}
