import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import { UserMenu } from "@/components/user-menu";
import { SyncStatus } from "@/components/sync-status";
import { initAutoSync } from "@/lib/sync-engine";
import { useAuth } from "@/hooks/use-auth";
import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { getAccessToken, refreshAccessToken } from "@/lib/auth";

import LoginPage from "@/pages/login";
import StationsPage from "@/pages/stations";
import VehiclesPage from "@/pages/vehicles";
import RoutesPage from "@/pages/routes";
import UsersPage from "@/pages/users";
import TicketsPage from "@/pages/tickets";
import TicketIssuePage from "@/pages/ticket-issue";
import TicketDetailPage from "@/pages/ticket-detail";
import BatchViewPage from "@/pages/batch-view";
import DisplayPage from "@/pages/display";
import PublicDisplayPage from "@/pages/display-public";

import {
  QueryClient,
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, Route, Switch, useLocation } from "wouter";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  Banknote,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Cloud,
  CloudOff,
  Landmark,
  LayoutDashboard,
  Menu,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Ticket,
  TrainFront,
  Wifi,
  Building2,
  Bus,
  Users,
} from "lucide-react";
import type {
  Ticket as ApiTicket,
  TicketInput,
  TicketSummary,
} from "@workspace/api-client-react";
import {
  getGetTicketSummaryQueryKey,
  getGetTicketsQueryKey,
  useCreateTicket,
  useGetTicketSummary,
  useGetTickets,
} from "@workspace/api-client-react";
import { ErrorBoundary } from "@/components/error-boundary";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

// ! internal imports

const queryClient = new QueryClient();

type RouteOption = {
  id: string;
  name: string;
  origin: string;
  destination: string;
  distanceKm: number;
  fareETB: number;
};

const ROUTES: RouteOption[] = [
  {
    id: "RT-014",
    name: "Addis Ababa → Adama",
    origin: "Addis Ababa",
    destination: "Adama",
    distanceKm: 99,
    fareETB: 125,
  },
  {
    id: "RT-021",
    name: "Addis Ababa → Debre Zeit",
    origin: "Addis Ababa",
    destination: "Debre Zeit",
    distanceKm: 45,
    fareETB: 72,
  },
  {
    id: "RT-033",
    name: "Adama → Dire Dawa",
    origin: "Adama",
    destination: "Dire Dawa",
    distanceKm: 453,
    fareETB: 480,
  },
  {
    id: "RT-041",
    name: "Bahir Dar → Gondar",
    origin: "Bahir Dar",
    destination: "Gondar",
    distanceKm: 180,
    fareETB: 220,
  },
  {
    id: "RT-008",
    name: "Hawassa → Shashemene",
    origin: "Hawassa",
    destination: "Shashemene",
    distanceKm: 27,
    fareETB: 48,
  },
];

const VEHICLES = [
  { plate: "3-AB-4901", operator: "Yonas M." },
  { plate: "4-AA-2107", operator: "Hanna K." },
  { plate: "3-OR-7714", operator: "Abel T." },
  { plate: "2-BA-3088", operator: "Mulugeta G." },
];

const QUEUE_KEY = "transit-eticket-queue";
const AUTO_SYNC_KEY = "transit-eticket-auto-sync";
const STATION_NAME = "Addis Ababa Central";
const STATION_CODE = "ST-AA";

import { readQueue } from "@/pages/app-shell.tsx";
import { writeQueue } from "@/pages/app-shell.tsx";
import { queueTicket } from "@/pages/app-shell.tsx";
import { isAutoSyncEnabled } from "@/pages/app-shell.tsx";
import { currency } from "@/pages/app-shell.tsx";
import { shortDate } from "@/pages/app-shell.tsx";
import { errorMessage } from "@/pages/app-shell.tsx";
import { useOnlineStatus } from "@/pages/app-shell.tsx";
import { useQueueCount } from "@/pages/app-shell.tsx";
import { useLocalQueue } from "@/pages/app-shell.tsx";
import { useOfflineSync } from "@/pages/app-shell.tsx";
import { AppShell } from "@/pages/app-shell.tsx";

// ! default components
import PageHeader from "@/components/page-header.tsx";
import LoadingBlock from "@/components/loading-block.tsx";
import QueryError from "@/components/query-error.tsx";
import EmptyState from "@/components/empty-state.tsx";
import MetricCard from "@/components/metric-card.tsx";
import SectionLabel from "@/components/section-label.tsx";

export default function HomePage() {
  const ticketsQuery = useGetTickets();
  const summaryQuery = useGetTicketSummary();
  const tickets = ticketsQuery.data ?? [];
  const summary = summaryQuery.data;
  const queueCount = useQueueCount();
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return (
    <div className="app-enter">
      <PageHeader
        eyebrow="Daily operations · Counter 04"
        title="Station overview"
        description={`${today}. Keep the line moving with a clear view of collections, tickets, and settlement.`}
        action={
          <Link
            href="/ticketing"
            data-testid="link-start-ticketing"
            className="flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"
          >
            Issue a ticket <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryQuery.isLoading ? (
          <LoadingBlock />
        ) : summaryQuery.isError ? (
          <QueryError
            message={errorMessage(summaryQuery.error)}
            retry={() => void summaryQuery.refetch()}
          />
        ) : (
          <>
            <MetricCard
              label="Gross collection"
              value={currency(summary?.grossCollectionETB)}
              caption={`${summary?.ticketCount ?? 0} issued today`}
              icon={Banknote}
              tone="accent"
            />
            <MetricCard
              label="Base fares"
              value={currency(summary?.baseFaresETB)}
              caption="Passenger fare value"
              icon={Ticket}
            />
            <MetricCard
              label="Net settlement"
              value={currency(summary?.netSettlementETB)}
              caption="After station commission"
              icon={Landmark}
              tone="orange"
            />
            <MetricCard
              label="Tickets issued"
              value={(summary?.ticketCount ?? 0).toLocaleString()}
              caption={
                queueCount
                  ? `${queueCount} waiting to sync`
                  : "All tickets synced"
              }
              icon={ClipboardList}
            />
          </>
        )}
      </div>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_350px]">
        <section className="app-enter app-enter-delay-1">
          <SectionLabel
            right={
              <Link
                href="/tickets"
                data-testid="link-view-all-tickets"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                View register <ArrowRight size={13} />
              </Link>
            }
          >
            Recent activity
          </SectionLabel>
          {ticketsQuery.isLoading ? (
            <LoadingBlock label="Loading recent tickets" />
          ) : ticketsQuery.isError ? (
            <QueryError
              message={errorMessage(ticketsQuery.error)}
              retry={() => void ticketsQuery.refetch()}
            />
          ) : tickets.length === 0 ? (
            <EmptyState
              title="No tickets issued today"
              description="Issued tickets will appear here with their settlement trail."
              action={
                <Link
                  href="/ticketing"
                  data-testid="link-empty-issue-ticket"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Issue the first ticket
                </Link>
              }
            />
          ) : (
            <div className="overflow-hidden rounded-sm border border-border bg-card">
              <div className="hidden grid-cols-[1.2fr_1fr_0.7fr_0.8fr] border-b border-border bg-muted/45 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:grid">
                <span>Passenger route</span>
                <span>Vehicle</span>
                <span>Issued</span>
                <span className="text-right">Collection</span>
              </div>
              {tickets.slice(0, 8).map((ticket, index) => (
                <TicketRow key={ticket.id} ticket={ticket} index={index} />
              ))}
            </div>
          )}
        </section>
        <section className="app-enter app-enter-delay-2">
          <SectionLabel>Settlement snapshot</SectionLabel>
          <div className="rounded-sm border border-border bg-card p-5">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
              <div>
                <div className="text-sm font-semibold">Today's ledger</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Auto-calculated from issued fares
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShieldCheck size={17} />
              </div>
            </div>
            <div className="space-y-4">
              {[
                ["Service charges", summary?.serviceChargesETB],
                ["VAT on service", summary?.vatETB],
                ["Station fees", summary?.stationFeesETB],
                ["Ticketer commission", summary?.commissionsETB],
              ].map(([label, value], index) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between text-sm"
                >
                  <span
                    className={
                      index === 3
                        ? "text-muted-foreground"
                        : "text-foreground/75"
                    }
                  >
                    {label}
                  </span>
                  <span
                    className={`font-mono text-xs tabular-nums ${index === 3 ? "text-accent-foreground" : ""}`}
                  >
                    {currency(value as number)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-end justify-between border-t border-border pt-4">
              <span className="text-sm font-semibold">Net payable</span>
              <span
                data-testid="text-net-settlement"
                className="font-mono text-lg font-semibold tabular-nums text-primary"
              >
                {currency(summary?.netSettlementETB)}
              </span>
            </div>
          </div>
          <div
            data-testid="card-queue-status"
            className={`mt-3 flex items-start gap-3 rounded-sm border p-4 ${queueCount ? "border-accent/30 bg-accent/8" : "border-primary/20 bg-primary/5"}`}
          >
            {queueCount ? (
              <CloudOff size={17} className="mt-0.5 text-accent" />
            ) : (
              <Cloud size={17} className="mt-0.5 text-primary" />
            )}
            <div>
              <div className="text-xs font-semibold">
                {queueCount
                  ? `${queueCount} ticket${queueCount > 1 ? "s" : ""} pending sync`
                  : "Paper trail is up to date"}
              </div>
              <div className="mt-1 text-xs leading-5 text-muted-foreground">
                {queueCount
                  ? "They remain stored on this device until the station connection returns."
                  : "Every ticket is recorded with a receipt ID and settlement breakdown."}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
