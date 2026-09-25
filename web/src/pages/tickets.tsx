import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, Plus, Search, Ticket as TicketIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table";
import { useTickets, type Ticket } from "@/hooks/use-tickets";
import { useRoutes, useVehicles } from "@/hooks/use-api";
import { formatCents } from "@/lib/money-utils";
import { useAuth } from "@/hooks/use-auth";

export default function TicketsPage() {
  const [, setLocation] = useLocation();
  const { hasRole } = useAuth();

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: tickets, isLoading } = useTickets({
    status: statusFilter === "all" ? undefined : statusFilter,
  });
  const { data: routes } = useRoutes();
  const { data: vehicles } = useVehicles();

  // Filter by search query
  const filteredTickets = tickets?.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.ticketNumber.toLowerCase().includes(q) ||
      t.passengerName.toLowerCase().includes(q) ||
      t.seatNumber.toString().includes(q)
    );
  });

  const columns = [
    {
      key: "ticketNumber",
      header: "Ticket #",
      render: (t: Ticket) => (
        <span className="font-mono text-sm font-medium">{t.ticketNumber}</span>
      ),
    },
    {
      key: "passenger",
      header: "Passenger",
      render: (t: Ticket) => (
        <span className="font-medium">{t.passengerName}</span>
      ),
    },
    {
      key: "route",
      header: "Route",
      render: (t: Ticket) => {
        const route = routes?.find((r) => r.id === t.routeId);
        return route
          ? `${route.originStation?.name ?? "?"} → ${route.destinationStation?.name ?? "?"}`
          : "—";
      },
    },
    {
      key: "vehicle",
      header: "Vehicle",
      render: (t: Ticket) => {
        const vehicle = vehicles?.find((v) => v.id === t.vehicleId);
        return vehicle?.plateNumber ?? "—";
      },
    },
    {
      key: "seat",
      header: "Seat",
      render: (t: Ticket) => (
        <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium">
          {t.seatNumber}
        </span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (t: Ticket) => new Date(t.departureDate).toLocaleDateString(),
    },
    {
      key: "amount",
      header: "Amount",
      render: (t: Ticket) => (
        <span className="font-mono">{formatCents(t.totalCents)} ETB</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (t: Ticket) => (
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            t.status === "ISSUED"
              ? "bg-green-100 text-green-700"
              : t.status === "VOID"
                ? "bg-red-100 text-red-700"
                : "bg-gray-100 text-gray-500"
          }`}
        >
          {t.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (t: Ticket) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setLocation(`/tickets/${t.id}`);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground">
            View and manage issued tickets
          </p>
        </div>
        {hasRole("TICKETER", "SYSTEM_ADMIN", "STATION_CONTROLLER") && (
          <Button onClick={() => setLocation("/ticketing/issue")}>
            <Plus className="mr-2 h-4 w-4" />
            Issue Ticket
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticket #, passenger, seat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ISSUED">Issued</SelectItem>
            <SelectItem value="VOID">Void</SelectItem>
            <SelectItem value="REFUNDED">Refunded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={filteredTickets ?? []}
        isLoading={isLoading}
        emptyMessage="No tickets found"
        onRowClick={(t) => setLocation(`/tickets/${t.id}`)}
      />
    </div>
  );
}
