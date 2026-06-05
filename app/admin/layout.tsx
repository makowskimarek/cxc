import { auth } from "@/lib/auth";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const adminLinks = [
  { href: "/admin/measure", label: "Pomiar", icon: "⏱", highlight: true },
  { href: "/admin/events", label: "Zawody", icon: "🏆" },
  { href: "/admin/competitions", label: "Konkurencje", icon: "🎯" },
  { href: "/admin/teams", label: "Drużyny", icon: "👥" },
  { href: "/admin/athletes", label: "Zawodnicy", icon: "🏃" },
  { href: "/admin/users", label: "Użytkownicy", icon: "👤", adminOnly: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Proxy handles unauthenticated redirects. For the login page, just render without sidebar.
  if (!session) {
    return <>{children}</>;
  }

  const isAdmin = session.user?.role === "admin";

  return (
    <div className="flex h-screen bg-muted/30">
      {/* Sidebar */}
      <aside className="w-60 bg-card border-r flex flex-col shrink-0">
        <div className="p-6 border-b">
          <div className="font-black text-xl">CXC Admin</div>
          <div className="text-xs text-muted-foreground mt-1 truncate">{session.user?.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{session.user?.role}</div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {adminLinks.map((link) => {
            if (link.adminOnly && !isAdmin) return null;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-muted transition-colors ${
                  link.highlight ? "bg-primary/10 text-primary font-semibold hover:bg-primary/20" : ""
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
          <Link href="/dashboard" target="_blank" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-muted text-muted-foreground transition-colors">
            <span>📊</span>
            <span>Dashboard ↗</span>
          </Link>
          <form action={async () => { "use server"; await signOut({ redirectTo: "/admin/login" }); }}>
            <button type="submit" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm hover:bg-muted text-muted-foreground transition-colors w-full text-left">
              <span>🚪</span>
              <span>Wyloguj</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
