"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Athlete {
  id: string;
  name: string;
  number: number | null;
  teamId: string;
  teamName: string | null;
}

interface Team {
  id: string;
  name: string;
}

export default function AthletesPage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Athlete | null>(null);
  const [form, setForm] = useState({ name: "", number: "", teamId: "" });

  async function load() {
    const [a, t] = await Promise.all([
      fetch("/api/athletes").then((r) => r.json()),
      fetch("/api/teams").then((r) => r.json()),
    ]);
    setAthletes(a);
    setTeams(t);
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", number: "", teamId: teams[0]?.id ?? "" });
    setOpen(true);
  }

  function openEdit(a: Athlete) {
    setEditing(a);
    setForm({ name: a.name, number: a.number != null ? String(a.number) : "", teamId: a.teamId });
    setOpen(true);
  }

  async function save() {
    const body = {
      ...(editing ? { id: editing.id } : {}),
      name: form.name,
      number: form.number ? parseInt(form.number) : null,
      teamId: form.teamId,
    };
    const r = await fetch("/api/athletes", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { toast.success("Zapisano"); setOpen(false); load(); }
    else toast.error("Błąd zapisu");
  }

  async function remove(id: string) {
    if (!confirm("Usunąć zawodnika?")) return;
    await fetch(`/api/athletes?id=${id}`, { method: "DELETE" });
    toast.success("Usunięto"); load();
  }

  const byTeam = athletes.reduce<Record<string, Athlete[]>>((acc, a) => {
    const key = a.teamName ?? "Brak drużyny";
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Zawodnicy</h1>
          <p className="text-muted-foreground text-sm mt-1">{athletes.length} zawodników</p>
        </div>
        <Button onClick={openCreate}>+ Nowy zawodnik</Button>
      </div>

      <div className="space-y-6">
        {Object.entries(byTeam).map(([teamName, teamAthletes]) => (
          <div key={teamName}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">{teamName}</h2>
            <div className="rounded-lg border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Imię i nazwisko</TableHead>
                    <TableHead className="w-32 text-right">Akcje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamAthletes.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-muted-foreground">{a.number ?? "—"}</TableCell>
                      <TableCell className="font-medium">{a.name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(a)}>Edytuj</Button>
                          <Button variant="destructive" size="sm" onClick={() => remove(a.id)}>Usuń</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ))}
        {athletes.length === 0 && <p className="text-center text-muted-foreground py-12">Brak zawodników.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edytuj zawodnika" : "Nowy zawodnik"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Imię i nazwisko</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Numer startowy</Label>
              <Input type="number" value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Drużyna</Label>
              <Select value={form.teamId} onValueChange={(v) => setForm({ ...form, teamId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Wybierz drużynę" /></SelectTrigger>
                <SelectContent>
                  {teams.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
              <Button onClick={save}>Zapisz</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
