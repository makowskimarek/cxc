"use client";

import { useState } from "react";
import useSWR from "swr";
import { TeamRankingTable } from "@/components/dashboard/TeamRankingTable";
import { TeamRawResultsTable } from "@/components/dashboard/TeamRawResultsTable";
import { TeamScore } from "@/lib/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type ViewMode = "ranking" | "raw";

export default function DashboardPage() {
  const [view, setView] = useState<ViewMode>("ranking");

  const { data, isLoading, error } = useSWR<TeamScore[]>("/api/dashboard", fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: false,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">CXC Dashboard</h1>
            <p className="text-sm text-muted-foreground">Carbon Extreme Challenge — Wyniki na żywo</p>
          </div>
          <Badge variant="outline" className="text-xs animate-pulse">
            Odświeżanie co 10 s
          </Badge>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="text-muted-foreground">Ładowanie wyników…</div>
          </div>
        )}
        {error && (
          <div className="text-center py-24 text-destructive">Błąd ładowania wyników.</div>
        )}
        {data && (
          <>
            <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Ranking drużynowy</h2>
                <Badge variant="secondary">{data.length} drużyn</Badge>
              </div>
              <div className="flex rounded-lg border overflow-hidden">
                <Button
                  variant={view === "ranking" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setView("ranking")}
                >
                  Punkty rankingowe
                </Button>
                <Button
                  variant={view === "raw" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none"
                  onClick={() => setView("raw")}
                >
                  Wyniki pomiarów
                </Button>
              </div>
            </div>
            <div className="rounded-xl border bg-card shadow-sm p-2">
              {view === "ranking" ? (
                <TeamRankingTable scores={data} />
              ) : (
                <TeamRawResultsTable scores={data} />
              )}
            </div>
            <p className="text-xs text-muted-foreground text-right mt-3">
              {view === "ranking"
                ? "Punkty rankingowe: najlepsza drużyna w dyscyplinie zdobywa maksymalną liczbę punktów."
                : "Wyniki pomiarów: surowe wartości punktów lub czasów uzyskanych przez drużynę."}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
