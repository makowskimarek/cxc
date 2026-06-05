"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

interface Competition {
  id: string;
  name: string;
  description: string | null;
  scoreType: "points" | "time";
  lowerIsBetter: boolean;
  measureMode: "per_athlete" | "per_team";
  videoUrl: string | null;
}

export default function CompetitionsAdminPage() {
  const [comps, setComps] = useState<Competition[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [form, setForm] = useState({ name: "", description: "", scoreType: "points", lowerIsBetter: false, measureMode: "per_athlete", videoUrl: "" });

  async function load() {
    setComps(await fetch("/api/competitions").then((r) => r.json()));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", description: "", scoreType: "points", lowerIsBetter: false, measureMode: "per_athlete", videoUrl: "" });
    setOpen(true);
  }

  function openEdit(c: Competition) {
    setEditing(c);
    setForm({ name: c.name, description: c.description ?? "", scoreType: c.scoreType, lowerIsBetter: c.lowerIsBetter, measureMode: c.measureMode, videoUrl: c.videoUrl ?? "" });
    setOpen(true);
  }

  async function save() {
    const body = editing ? { ...form, id: editing.id } : form;
    const r = await fetch("/api/competitions", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { toast.success("Zapisano"); setOpen(false); load(); }
    else toast.error("Błąd zapisu");
  }

  async function remove(id: string) {
    if (!confirm("Usunąć konkurencję? Spowoduje to usunięcie wszystkich wyników tej konkurencji.")) return;
    await fetch(`/api/competitions?id=${id}`, { method: "DELETE" });
    toast.success("Usunięto"); load();
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Konkurencje</h1>
          <p className="text-muted-foreground text-sm mt-1">Globalne szablony konkurencji używane w zawodach</p>
        </div>
        <Button onClick={openCreate}>+ Nowa konkurencja</Button>
      </div>

      <div className="rounded-lg border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nazwa</TableHead>
              <TableHead>Typ wyniku</TableHead>
              <TableHead>Pomiar</TableHead>
              <TableHead>Film</TableHead>
              <TableHead className="w-32 text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comps.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant={c.scoreType === "time" ? "secondary" : "default"}>
                    {c.scoreType === "time" ? (c.lowerIsBetter ? "⏱ Czas (min)" : "⏱ Czas (max)") : "🏆 Punkty"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.measureMode === "per_team" ? "drużyna" : "zawodnik"}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{c.videoUrl ? "✓" : "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Edytuj</Button>
                    <Button variant="destructive" size="sm" onClick={() => remove(c.id)}>Usuń</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {comps.length === 0 && <p className="text-center text-muted-foreground py-12">Brak konkurencji.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edytuj konkurencję" : "Nowa konkurencja"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nazwa</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Opis</Label>
              <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Typ wyniku</Label>
              <Select value={form.scoreType} onValueChange={(v) => setForm({ ...form, scoreType: v ?? "points" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Punkty (liczba całkowita)</SelectItem>
                  <SelectItem value="time">Czas (MM:SS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.scoreType === "time" && (
              <div className="flex items-center gap-3">
                <input type="checkbox" id="lowerIsBetter" checked={form.lowerIsBetter} onChange={(e) => setForm({ ...form, lowerIsBetter: e.target.checked })} className="h-4 w-4" />
                <Label htmlFor="lowerIsBetter">Krótszy czas = lepszy wynik</Label>
              </div>
            )}
            <div className="space-y-1">
              <Label>Tryb pomiaru</Label>
              <Select value={form.measureMode} onValueChange={(v) => setForm({ ...form, measureMode: v ?? "per_athlete" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="per_athlete">Per zawodnik (każdy ma swój wynik)</SelectItem>
                  <SelectItem value="per_team">Per drużyna (jeden wynik dla całej drużyny)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>URL wideo (YouTube/Vimeo, opcjonalnie)</Label>
              <Input value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
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
