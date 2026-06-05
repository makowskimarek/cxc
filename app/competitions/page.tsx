import { db } from "@/lib/db";
import { competitions, competitionImages } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const id = u.searchParams.get("v") ?? u.pathname.split("/").pop();
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").pop();
      return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
}

export default async function CompetitionsPage() {
  const comps = await db.select().from(competitions).orderBy(competitions.name);
  const images = await db.select().from(competitionImages).orderBy(competitionImages.displayOrder);

  const imagesByComp = images.reduce<Record<string, typeof images>>((acc, img) => {
    if (!acc[img.competitionId]) acc[img.competitionId] = [];
    acc[img.competitionId].push(img);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <Link href="/" className="text-2xl font-black tracking-tight">CXC</Link>
            <span className="text-muted-foreground ml-3 text-sm">Konkurencje</span>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground">Wyniki</Link>
            <Link href="/tv" target="_blank" className="text-muted-foreground hover:text-foreground">TV ↗</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl font-black mb-2">Konkurencje</h1>
        <p className="text-muted-foreground mb-12">Poznaj zasady i opisy wszystkich dyscyplin Carbon Extreme Challenge.</p>

        <div className="space-y-12">
          {comps.map((comp, idx) => {
            const imgs = imagesByComp[comp.id] ?? [];
            const embedUrl = comp.videoUrl ? getEmbedUrl(comp.videoUrl) : null;

            return (
              <Card key={comp.id} id={`comp-${idx + 1}`} className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <div className="flex items-center gap-4">
                    <span className="text-3xl font-black text-muted-foreground/50 w-12">{String(idx + 1).padStart(2, "0")}</span>
                    <div className="flex-1">
                      <CardTitle className="text-2xl">{comp.name}</CardTitle>
                    </div>
                    <Badge variant={comp.scoreType === "time" ? "secondary" : "default"}>
                      {comp.scoreType === "time" ? (comp.lowerIsBetter ? "Czas (min)" : "Czas (max)") : "Punkty"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                  {comp.description && (
                    <p className="text-muted-foreground leading-relaxed">{comp.description}</p>
                  )}

                  {/* Video */}
                  {comp.videoUrl && (
                    <div className="rounded-xl overflow-hidden aspect-video bg-black">
                      {embedUrl ? (
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allowFullScreen
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          title={comp.name}
                        />
                      ) : (
                        <video src={comp.videoUrl} controls className="w-full h-full object-contain" />
                      )}
                    </div>
                  )}

                  {/* Images */}
                  {imgs.length > 0 && (
                    <div className={`grid gap-3 ${imgs.length === 1 ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3"}`}>
                      {imgs.map((img) => (
                        <div key={img.id} className="rounded-lg overflow-hidden aspect-video bg-muted">
                          <img
                            src={img.url}
                            alt={comp.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
