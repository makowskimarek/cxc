"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

type Props = { params: Promise<{ eventId: string }> };

export default function EventJudgesPage({ params }: Props) {
  const { eventId } = use(params);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());

  async function load() {
    const [all, assigned] = await Promise.all([
      fetch("/api/users").then((r) => r.json()),
      fetch(`/api/events/${eventId}/judges`).then((r) => r.json()),
    ]);
    setAllUsers(all.filter((u: User) => u.role === "judge"));
    setAssignedIds(new Set(assigned.map((j: { userId: string }) => j.userId)));
  }

  useEffect(() => { load(); }, [eventId]);

  async function toggle(userId: string) {
    if (assignedIds.has(userId)) {
      await fetch(`/api/events/${eventId}/judges?userId=${userId}`, { method: "DELETE" });
      toast.success("Usunięto sędziego z zawodów");
    } else {
      await fetch(`/api/events/${eventId}/judges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      toast.success("Przypisano sędziego do zawodów");
    }
    load();
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6">
        <Link href={`/admin/events/${eventId}`} className="text-sm text-muted-foreground hover:text-foreground">← Zawody</Link>
        <h1 className="text-2xl font-bold mt-2">Sędziowie zawodów</h1>
        <p className="text-muted-foreground text-sm mt-1">Przypisz sędziów do tych zawodów. Sędziowie zobaczą je w swoim panelu.</p>
      </div>

      <div className="space-y-2 max-w-xl">
        {allUsers.map((user) => {
          const assigned = assignedIds.has(user.id);
          return (
            <div key={user.id} className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${assigned ? "border-primary bg-primary/5" : "border-border"}`}>
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
              <Button variant={assigned ? "destructive" : "default"} size="sm" onClick={() => toggle(user.id)}>
                {assigned ? "Usuń" : "Przypisz"}
              </Button>
            </div>
          );
        })}
        {allUsers.length === 0 && (
          <p className="text-muted-foreground py-8 text-center">
            Brak sędziów. <Link href="/admin/users" className="text-primary underline">Utwórz konta sędziów</Link>
          </p>
        )}
      </div>
    </div>
  );
}
