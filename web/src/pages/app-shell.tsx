import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Ticket,
  ClipboardList,
  BarChart3,
  Building2,
  Bus,
  Route as RouteIcon,
  Users,
  Settings,
  Monitor,
  Menu,
  X,
  Home,
  Send,
} from "lucide-react";
import { Link } from "wouter";

// ! internal imports
import { cn } from "../lib/utils.ts";
import { useAuth } from "../modules/auth/hooks/use-auth.tsx";
import UserMenu from "../components/user-menu.tsx";
import SyncStatus from "../components/sync-status.tsx";
import React from "react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/ticketing", label: "Issue Ticket", icon: Ticket },
  { href: "/tickets", label: "Tickets", icon: ClipboardList },
  { href: "/dispatch", label: "Dispatch & Permits", icon: Send },
  { href: "/revenue", label: "Revenue", icon: BarChart3 },
  { href: "/stations", label: "Stations", icon: Building2 },
  { href: "/vehicles", label: "Vehicles", icon: Bus },
  { href: "/routes", label: "Routes", icon: RouteIcon },
  { href: "/display", label: "Display Board", icon: Monitor },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { hasRole } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 border-r bg-card transition-transform duration-200 ease-in-out lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b px-6">
          <h1 className="text-xl font-bold">E-Ticket</h1>
          <button 
            className="lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-1 p-4 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {navItems
            .filter((item) => !item.adminOnly || hasRole("SYSTEM_ADMIN"))
            .map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    onClick={() => setIsSidebarOpen(false)}
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
      
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-4 lg:px-6">
          <div className="flex items-center">
            <button
              className="mr-4 lg:hidden p-2 rounded-md hover:bg-muted"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <SyncStatus />
            <UserMenu />
          </div>
        </header>
        <main className="p-4 lg:p-6 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
