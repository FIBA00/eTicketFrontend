import { ReactNode } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Ticket,
  ClipboardList,
  BarChart3,
  Building2,
  Bus,
  Route,
  Users,
  Settings,
  Monitor,
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import UserMenu from "@/components/user-menu";
import { useAuth } from "@/hooks/use-auth";
import SyncStatus from "@/components/sync-status";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/ticketing", label: "Issue Ticket", icon: Ticket },
  { href: "/tickets", label: "Tickets", icon: ClipboardList },
  { href: "/revenue", label: "Revenue", icon: BarChart3 },
  { href: "/stations", label: "Stations", icon: Building2 },
  { href: "/vehicles", label: "Vehicles", icon: Bus },
  { href: "/routes", label: "Routes", icon: Route },
  { href: "/display", label: "Display Board", icon: Monitor },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { hasRole } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-card">
        <div className="flex h-16 items-center border-b px-6">
          <h1 className="text-xl font-bold">E-Ticket</h1>
        </div>
        <nav className="space-y-1 p-4">
          {navItems
            .filter((item) => !item.adminOnly || hasRole("SYSTEM_ADMIN"))
            .map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
        </nav>
      </aside>
      <div className="pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background px-6">
          <div />
          <div className="flex items-center gap-4">
            <SyncStatus />
            <UserMenu />
          </div>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
