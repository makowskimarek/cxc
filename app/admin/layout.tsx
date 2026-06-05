import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session) {
    return <>{children}</>;
  }

  const isAdmin = session.user?.role === "admin";

  return (
    <div className="flex h-dvh bg-muted/30">
      <AdminSidebar
        userName={session.user?.name ?? ""}
        userRole={session.user?.role ?? ""}
        isAdmin={isAdmin}
      />
      <main className="flex-1 overflow-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
