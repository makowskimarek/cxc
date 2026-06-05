"use client";

import { useState, useEffect, use, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  displayOrder: number;
}

function SortableTeamItem({ team, onRemove }: { team: Team; onRemove: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: team.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-3 p-4 rounded-lg border-2 border-primary bg-primary/5"
      {...attributes}
    >
      <button
        ref={setActivatorNodeRef}
        {...listeners}
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1 -ml-1 shrink-0"
        tabIndex={-1}
      >
        <GripVertical size={18} />
      </button>
      <span className="flex-1 font-medium">{team.name}</span>
      <Button variant="destructive" size="sm" onClick={onRemove}>Usuń</Button>
    </div>
  );
}

type Props = { params: Promise<{ eventId: string }> };

export default function EventTeamsPage({ params }: Props) {
  const { eventId } = use(params);
  const [assignedTeams, setAssignedTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Omit<Team, "displayOrder">[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function load() {
    const [all, assigned] = await Promise.all([
      fetch("/api/teams").then((r) => r.json()),
      fetch(`/api/events/${eventId}/teams`).then((r) => r.json()),
    ]);
    setAllTeams(all);
    setAssignedTeams([...assigned].sort((a: Team, b: Team) => a.displayOrder - b.displayOrder));
    setSelectedIds(new Set());
  }

  useEffect(() => { load(); }, [eventId]);

  const assignedIds = new Set(assignedTeams.map((t) => t.id));

  const availableTeams = useMemo(() => {
    const query = filter.trim().toLowerCase();
    return allTeams.filter(
      (t) => !assignedIds.has(t.id) && (query === "" || t.name.toLowerCase().includes(query))
    );
  }, [allTeams, assignedTeams, filter]);

  const allFilteredSelected =
    availableTeams.length > 0 && availableTeams.every((t) => selectedIds.has(t.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        availableTeams.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        availableTeams.forEach((t) => next.add(t.id));
        return next;
      });
    }
  }

  async function addSelected() {
    if (selectedIds.size === 0) return;
    setAdding(true);
    await Promise.all(
      [...selectedIds].map((teamId) =>
        fetch(`/api/events/${eventId}/teams`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teamId }),
        })
      )
    );
    setAdding(false);
    toast.success(`Dodano ${selectedIds.size} ${selectedIds.size === 1 ? "drużynę" : "drużyny"}`);
    load();
  }

  async function remove(teamId: string) {
    await fetch(`/api/events/${eventId}/teams?teamId=${teamId}`, { method: "DELETE" });
    toast.success("Usunięto drużynę z zawodów");
    load();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = assignedTeams.findIndex((t) => t.id === active.id);
    const newIndex = assignedTeams.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(assignedTeams, oldIndex, newIndex);

    setAssignedTeams(reordered);

    await fetch(`/api/events/${eventId}/teams`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: reordered.map((t) => t.id) }),
    });
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href={`/admin/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground">← Zawody</Link>
        <h1 className="text-2xl font-bold mt-2">Drużyny w zawodach</h1>
        <p className="text-muted-foreground text-sm mt-1">Przeciągnij drużyny aby zmienić kolejność.</p>
      </div>

      <div className="max-w-xl space-y-8">
        {/* Assigned teams with drag-and-drop */}
        {assignedTeams.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Przypisane ({assignedTeams.length})
            </h2>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={assignedTeams.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {assignedTeams.map((team) => (
                    <SortableTeamItem key={team.id} team={team} onRemove={() => remove(team.id)} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </section>
        )}

        {/* Available teams with filter + bulk add */}
        {allTeams.filter((t) => !assignedIds.has(t.id)).length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
              Dostępne ({allTeams.filter((t) => !assignedIds.has(t.id)).length})
            </h2>

            <div className="space-y-3">
              <Input
                placeholder="Szukaj drużyny…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-10"
              />

              {availableTeams.length > 0 ? (
                <>
                  {/* Select all + bulk add bar */}
                  <div className="flex items-center justify-between gap-3 px-1">
                    <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground select-none">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded accent-primary"
                      />
                      Zaznacz wszystkie ({availableTeams.length})
                    </label>
                    {selectedIds.size > 0 && (
                      <Button size="sm" onClick={addSelected} disabled={adding}>
                        {adding ? "Dodawanie…" : `Dodaj zaznaczone (${selectedIds.size})`}
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {availableTeams.map((team) => (
                      <label
                        key={team.id}
                        className="flex items-center gap-3 p-4 rounded-lg border-2 border-border hover:border-primary/40 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(team.id)}
                          onChange={() => toggleSelect(team.id)}
                          className="h-4 w-4 rounded accent-primary shrink-0"
                        />
                        <span className="flex-1 font-medium">{team.name}</span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Brak drużyn pasujących do &quot;{filter}&quot;
                </p>
              )}
            </div>
          </section>
        )}

        {allTeams.length === 0 && (
          <p className="text-muted-foreground py-8 text-center">
            Brak drużyn. <Link href="/admin/teams" className="text-primary underline">Utwórz drużyny</Link>
          </p>
        )}
      </div>
    </div>
  );
}
