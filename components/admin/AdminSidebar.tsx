"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Menu, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const links = [
  { href: "/admin/measure", label: "Pomiar", icon: "⏱", highlight: true },
  { href: "/admin/events", label: "Zawody", icon: "🏆" },
  { href: "/admin/competitions", label: "Konkurencje", icon: "🎯" },
  { href: "/admin/teams", label: "Drużyny", icon: "👥" },
  { href: "/admin/athletes", label: "Zawodnicy", icon: "🏃" },
  { href: "/admin/users", label: "Użytkownicy", icon: "👤", adminOnly: true },
];

interface Props {
  userName: string;
  userRole: string;
  isAdmin: boolean;
}

export function AdminSidebar({ userName, userRole, isAdmin }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  function NavLinks({ onClick }: { onClick?: () => void }) {
    return (
      <>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((link) => {
            if (link.adminOnly && !isAdmin) return null;
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClick}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  link.highlight
                    ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20"
                    : active
                    ? "bg-muted font-medium"
                    : "hover:bg-muted"
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <Separator />

        <div className="p-3 space-y-1">
          <Link
            href="/dashboard"
            target="_blank"
            onClick={onClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-muted text-muted-foreground transition-colors"
          >
            <span>📊</span>
            <span>Dashboard ↗</span>
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/admin/login" })}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-muted text-muted-foreground transition-colors w-full text-left"
          >
            <span>🚪</span>
            <span>Wyloguj</span>
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card border-b flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
          aria-label="Otwórz menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-black text-lg">CXC Admin</span>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="relative w-64 bg-card flex flex-col h-full shadow-xl">
            <div className="p-5 border-b flex items-start justify-between">
              <div>
                <div className="font-black text-xl">CXC Admin</div>
                <div className="text-xs text-muted-foreground mt-1 truncate max-w-[160px]">{userName}</div>
                <div className="text-xs text-muted-foreground capitalize">{userRole}</div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-md hover:bg-muted transition-colors mt-0.5"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks onClick={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-card border-r flex-col shrink-0">
        <div className="p-6 border-b">
          <div className="font-black text-xl">CXC Admin</div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{userName}</div>
          <div className="text-xs text-muted-foreground capitalize">{userRole}</div>
        </div>
        <NavLinks />
      </aside>
    </>
  );
}
