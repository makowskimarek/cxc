"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Team | null>(null);
  const [form, setForm] = useState({ name: "", logoUrl: "" });

  async function load() {
    setTeams(await fetch("/api/teams").then((r) => r.json()));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", logoUrl: "" });
    setOpen(true);
  }

  function openEdit(t: Team) {
    setEditing(t);
    setForm({ name: t.name, logoUrl: t.logoUrl ?? "" });
    setOpen(true);
  }

  async function save() {
    const body = editing ? { ...form, id: editing.id } : form;
    const r = await fetch("/api/teams", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { toast.success("Zapisano"); setOpen(false); load(); }
    else toast.error("Błąd zapisu");
  }

  async function remove(id: string) {
    if (!confirm("Usunąć drużynę? Spowoduje to usunięcie zawodników z tej drużyny.")) return;
    await fetch(`/api/teams?id=${id}`, { method: "DELETE" });
    toast.success("Usunięto"); load();
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Drużyny</h1>
          <p className="text-muted-foreground text-sm mt-1">{teams.length} drużyn</p>
        </div>
        <Button onClick={openCreate}>+ Nowa drużyna</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Logo URL</TableHead>
              <TableHead className="w-32 text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {teams.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm truncate max-w-xs">{t.logoUrl ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(t)}>Edytuj</Button>
                    <Button variant="destructive" size="sm" onClick={() => remove(t.id)}>Usuń</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {teams.length === 0 && <p className="text-center text-muted-foreground py-12">Brak drużyn.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edytuj drużynę" : "Nowa drużyna"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nazwa drużyny</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>URL logo (opcjonalnie)</Label>
              <Input value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://..." />
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
