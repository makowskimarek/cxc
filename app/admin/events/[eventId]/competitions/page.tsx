"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";

interface Competition {
  id: string;
  name: string;
  scoreType: "points" | "time";
}

interface Assigned {
  id: string;
  competitionId: string;
  displayOrder: number;
  name: string | null;
  scoreType: string | null;
}

type Props = { params: Promise<{ eventId: string }> };

export default function EventCompetitionsPage({ params }: Props) {
  const { eventId } = use(params);
  const [allComps, setAllComps] = useState<Competition[]>([]);
  const [assigned, setAssigned] = useState<Assigned[]>([]);
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  async function load() {
    const [all, asgn] = await Promise.all([
      fetch("/api/competitions").then((r) => r.json()),
      fetch(`/api/events/${eventId}/competitions`).then((r) => r.json()),
    ]);
    setAllComps(all);
    setAssigned(asgn.sort((a: Assigned, b: Assigned) => a.displayOrder - b.displayOrder));
  }

  useEffect(() => { load(); }, [eventId]);

  async function saveOrder(updated: Assigned[]) {
    setSaving(true);
    await fetch(`/api/events/${eventId}/competitions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated.map((a, i) => ({ competitionId: a.competitionId, displayOrder: i + 1 }))),
    });
    setSaving(false);
  }

  function onDragStart(index: number) {
    dragIndex.current = index;
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function onDrop(index: number) {
    const from = dragIndex.current;
    if (from === null || from === index) {
      dragIndex.current = null;
      setDragOverIndex(null);
      return;
    }
    const next = [...assigned];
    const [item] = next.splice(from, 1);
    next.splice(index, 0, item);
    const reindexed = next.map((a, i) => ({ ...a, displayOrder: i + 1 }));
    setAssigned(reindexed);
    saveOrder(reindexed);
    dragIndex.current = null;
    setDragOverIndex(null);
  }

  async function add(compId: string) {
    const nextOrder = assigned.length + 1;
    await fetch(`/api/events/${eventId}/competitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ competitionId: compId, displayOrder: nextOrder }),
    });
    toast.success("Dodano konkurencję do zawodów");
    load();
  }

  async function remove(compId: string) {
    await fetch(`/api/events/${eventId}/competitions?competitionId=${compId}`, { method: "DELETE" });
    const updated = assigned
      .filter((a) => a.competitionId !== compId)
      .map((a, i) => ({ ...a, displayOrder: i + 1 }));
    await saveOrder(updated);
    toast.success("Usunięto konkurencję z zawodów");
    load();
  }

  const assignedIds = new Set(assigned.map((a) => a.competitionId));
  const available = allComps.filter((c) => !assignedIds.has(c.id));

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href={`/admin/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground">
          ← Zawody
        </Link>
        <h1 className="text-2xl font-bold mt-2">Konkurencje w zawodach</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Przeciągnij elementy, żeby zmienić kolejność. Zmiany są zapisywane automatycznie.
        </p>
      </div>

      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Przypisane ({assigned.length}){saving && <span className="ml-2 font-normal normal-case text-xs">Zapisywanie...</span>}
        </h2>
        {assigned.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            Brak przypisanych konkurencji
          </p>
        )}
        <div className="space-y-2">
          {assigned.map((item, idx) => (
            <div
              key={item.competitionId}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={() => onDrop(idx)}
              onDragEnd={() => setDragOverIndex(null)}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-colors select-none ${
                dragOverIndex === idx && dragIndex.current !== idx
                  ? "border-primary/50 bg-primary/10 scale-[1.01]"
                  : "border-primary bg-primary/5"
              }`}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
              <span className="text-sm font-bold w-5 text-center text-muted-foreground">{idx + 1}</span>
              <div className="flex-1">
                <span className="font-medium">{item.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {item.scoreType === "time" ? "⏱ Czas" : "🏆 Punkty"}
                </span>
              </div>
              <Button variant="destructive" size="sm" onClick={() => remove(item.competitionId)}>
                Usuń
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Dostępne ({available.length})
        </h2>
        {available.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center border rounded-lg">
            Wszystkie konkurencje są już przypisane
          </p>
        )}
        <div className="space-y-2">
          {available.map((comp) => (
            <div
              key={comp.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div>
                <span className="font-medium">{comp.name}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {comp.scoreType === "time" ? "⏱ Czas" : "🏆 Punkty"}
                </span>
              </div>
              <Button size="sm" onClick={() => add(comp.id)}>
                Dodaj
              </Button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
