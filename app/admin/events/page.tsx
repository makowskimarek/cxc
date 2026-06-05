"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/ui/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Event {
  id: string;
  name: string;
  date: string | null;
  location: string | null;
  description: string | null;
  isActive: boolean;
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState({ name: "", date: "", location: "", description: "", isActive: false });

  async function load() {
    const r = await fetch("/api/events");
    setEvents(await r.json());
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", date: "", location: "", description: "", isActive: false });
    setOpen(true);
  }

  function openEdit(ev: Event) {
    setEditing(ev);
    setForm({ name: ev.name, date: ev.date ?? "", location: ev.location ?? "", description: ev.description ?? "", isActive: ev.isActive });
    setOpen(true);
  }

  async function save() {
    const method = editing ? "PUT" : "POST";
    const body = editing ? { ...form, id: editing.id } : form;
    const r = await fetch("/api/events", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { toast.success(editing ? "Zaktualizowano zawody" : "Utworzono zawody"); setOpen(false); load(); }
    else toast.error("Błąd zapisu");
  }

  async function remove(id: string) {
    if (!confirm("Usunąć zawody? Spowoduje to usunięcie wszystkich powiązanych wyników.")) return;
    await fetch(`/api/events?id=${id}`, { method: "DELETE" });
    toast.success("Usunięto"); load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Zawody</h1>
          <p className="text-muted-foreground text-sm mt-1">Zarządzaj edycjami zawodów CXC</p>
        </div>
        <Button onClick={openCreate}>+ Nowe zawody</Button>
      </div>

      <div className="space-y-4">
        {events.map((ev) => (
          <Card key={ev.id}>
            <CardContent className="p-5 flex items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-semibold text-lg">{ev.name}</span>
                  {ev.isActive && <Badge className="bg-green-600 text-white text-xs">Aktywne</Badge>}
                </div>
                <div className="text-sm text-muted-foreground flex gap-4">
                  {ev.date && <span>📅 {ev.date}</span>}
                  {ev.location && <span>📍 {ev.location}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <LinkButton variant="outline" size="sm" href={`/admin/events/${ev.id}`}>Konfiguruj</LinkButton>
                <Button variant="outline" size="sm" onClick={() => openEdit(ev)}>Edytuj</Button>
                <Button variant="destructive" size="sm" onClick={() => remove(ev.id)}>Usuń</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {events.length === 0 && (
          <p className="text-center text-muted-foreground py-16">Brak zawodów. Utwórz pierwszą edycję.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edytuj zawody" : "Nowe zawody"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nazwa</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="CXC 2024 Edycja 1" />
            </div>
            <div className="space-y-1">
              <Label>Data</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Lokalizacja</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Warszawa, Hala sportowa" />
            </div>
            <div className="space-y-1">
              <Label>Opis</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <input type="checkbox" id="isActive" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="h-4 w-4" />
              <Label htmlFor="isActive">Aktywne (pokazuj na dashboardzie)</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
              <Button onClick={save}>Zapisz</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
