import { useLocation } from "wouter";
import { Ticket, TrendingUp, Users, Bus } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card.tsx";
import React from "react";
import { useAuth } from "../modules/auth/hooks/use-auth";
import { useTickets } from "../modules/tickets/hooks/use-tickets";
import { useRoutes, useVehicles } from "../hooks/use-api";
import { formatCents } from "../lib/money-utils";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data: tickets, isLoading } = useTickets({ limit: 5 });
  const { data: vehicles } = useVehicles();
  const { data: routes } = useRoutes();

  const today = new Date().toISOString().split("T")[0];
  const todayTickets =
    tickets?.filter((t) => t.issuedAt?.startsWith(today)) || [];
  const todayRevenue = todayTickets.reduce(
    (sum, t) => sum + (t.totalCents || 0),
    0,
  );

  const stats = [
    {
      title: "Today's Tickets",
      value: todayTickets.length.toString(),
      icon: Ticket,
    },
    {
      title: "Today's Revenue",
      value: `${formatCents(todayRevenue)} ETB`,
      icon: TrendingUp,
    },
    {
      title: "Active Vehicles",
      value: vehicles?.length?.toString() || "0",
      icon: Bus,
    },
    { title: "Routes", value: routes?.length?.toString() || "0", icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.fullName}</h1>
        <p className="text-muted-foreground">
          Here's what's happening at your station today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Tickets</CardTitle>
          <CardDescription>Latest tickets issued</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 animate-pulse rounded bg-muted" />
              ))}
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="space-y-2">
              {tickets.slice(0, 5).map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50"
                  onClick={() => setLocation(`/tickets/${ticket.id}`)}
                >
                  <div>
                    <p className="font-medium">{ticket.ticketNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {ticket.passengerName}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono">
                      {formatCents(ticket.totalCents)} ETB
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(ticket.issuedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No tickets issued yet today.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
