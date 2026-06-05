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

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "judge" });

  async function load() {
    setUsers(await fetch("/api/users").then((r) => r.json()));
  }

  useEffect(() => { load(); }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: "judge" });
    setOpen(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: "", role: u.role });
    setOpen(true);
  }

  async function save() {
    const body: Record<string, unknown> = editing
      ? { id: editing.id, name: form.name, role: form.role, ...(form.password ? { password: form.password } : {}) }
      : { name: form.name, email: form.email, password: form.password, role: form.role };

    const r = await fetch("/api/users", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) { toast.success("Zapisano"); setOpen(false); load(); }
    else { const err = await r.json(); toast.error(err.error ?? "Błąd"); }
  }

  async function remove(id: string) {
    if (!confirm("Usunąć użytkownika?")) return;
    const r = await fetch(`/api/users?id=${id}`, { method: "DELETE" });
    if (r.ok) { toast.success("Usunięto"); load(); }
    else { const err = await r.json(); toast.error(err.error); }
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Użytkownicy</h1>
          <p className="text-muted-foreground text-sm mt-1">Konta administratorów i sędziów</p>
        </div>
        <Button onClick={openCreate}>+ Nowy użytkownik</Button>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Imię i nazwisko</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead className="w-32 text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(u)}>Edytuj</Button>
                    <Button variant="destructive" size="sm" onClick={() => remove(u.id)}>Usuń</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {users.length === 0 && <p className="text-center text-muted-foreground py-12">Brak użytkowników.</p>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edytuj użytkownika" : "Nowy użytkownik"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Imię i nazwisko</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            {!editing && (
              <div className="space-y-1">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            )}
            <div className="space-y-1">
              <Label>{editing ? "Nowe hasło (zostaw puste bez zmian)" : "Hasło"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Rola</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v ?? "judge" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="judge">Sędzia</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
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
