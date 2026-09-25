import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
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



import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation } from 'wouter';
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
  Route,
  Users,
} from 'lucide-react';
import type { Ticket as ApiTicket, TicketInput, TicketSummary } from '@workspace/api-client-react';
import {
  getGetTicketSummaryQueryKey,
  getGetTicketsQueryKey,
  useCreateTicket,
  useGetTicketSummary,
  useGetTickets,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';

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
  { id: 'RT-014', name: 'Addis Ababa → Adama', origin: 'Addis Ababa', destination: 'Adama', distanceKm: 99, fareETB: 125 },
  { id: 'RT-021', name: 'Addis Ababa → Debre Zeit', origin: 'Addis Ababa', destination: 'Debre Zeit', distanceKm: 45, fareETB: 72 },
  { id: 'RT-033', name: 'Adama → Dire Dawa', origin: 'Adama', destination: 'Dire Dawa', distanceKm: 453, fareETB: 480 },
  { id: 'RT-041', name: 'Bahir Dar → Gondar', origin: 'Bahir Dar', destination: 'Gondar', distanceKm: 180, fareETB: 220 },
  { id: 'RT-008', name: 'Hawassa → Shashemene', origin: 'Hawassa', destination: 'Shashemene', distanceKm: 27, fareETB: 48 },
];

const VEHICLES = [
  { plate: '3-AB-4901', operator: 'Yonas M.' },
  { plate: '4-AA-2107', operator: 'Hanna K.' },
  { plate: '3-OR-7714', operator: 'Abel T.' },
  { plate: '2-BA-3088', operator: 'Mulugeta G.' },
];

const QUEUE_KEY = 'transit-eticket-queue';
const AUTO_SYNC_KEY = 'transit-eticket-auto-sync';
const STATION_NAME = 'Addis Ababa Central';
const STATION_CODE = 'ST-AA';

function readQueue(): TicketInput[] {
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as TicketInput[]) : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: TicketInput[]) {
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event('transit-queue-changed'));
}

function queueTicket(ticket: TicketInput) {
  const queue = readQueue();
  if (!queue.some((item) => item.id === ticket.id)) {
    writeQueue([...queue, ticket]);
  }
}

function isAutoSyncEnabled() {
  return typeof window === 'undefined' || window.localStorage.getItem(AUTO_SYNC_KEY) !== 'false';
}

function currency(value: number | undefined | null) {
  return `ETB ${(value ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function shortDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'The station service could not be reached.';
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

function useQueueCount() {
  const [count, setCount] = useState(() => typeof window === 'undefined' ? 0 : readQueue().length);
  useEffect(() => {
    const update = () => setCount(readQueue().length);
    window.addEventListener('transit-queue-changed', update);
    window.addEventListener('online', update);
    return () => {
      window.removeEventListener('transit-queue-changed', update);
      window.removeEventListener('online', update);
    };
  }, []);
  return count;
}

function useLocalQueue() {
  const [queue, setQueue] = useState<TicketInput[]>(() => typeof window === 'undefined' ? [] : readQueue());
  useEffect(() => {
    const update = () => setQueue(readQueue());
    window.addEventListener('transit-queue-changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('transit-queue-changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);
  return queue;
}

function useOfflineSync(online: boolean, queueCount: number) {
  const queryClient = useQueryClient();
  const createTicket = useCreateTicket();
  const mutateAsyncRef = useRef(createTicket.mutateAsync);
  const syncingRef = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState(false);
  const [enabled, setEnabled] = useState(isAutoSyncEnabled);
  mutateAsyncRef.current = createTicket.mutateAsync;
  useEffect(() => {
    const update = () => setEnabled(isAutoSyncEnabled());
    window.addEventListener('transit-settings-changed', update);
    return () => window.removeEventListener('transit-settings-changed', update);
  }, []);
  const sync = useCallback(async (manual = false) => {
    if (!online || (!enabled && !manual) || syncingRef.current || queueCount === 0) return;
    const queue = readQueue();
    if (!queue.length) return;
    syncingRef.current = true;
    setSyncing(true);
    setSyncError(false);
    let failed = false;
    for (const ticket of queue) {
      try {
        await mutateAsyncRef.current({ data: ticket });
        const remaining = readQueue().filter((item) => item.id !== ticket.id);
        writeQueue(remaining);
      } catch {
        failed = true;
        break;
      }
    }
    await queryClient.invalidateQueries({ queryKey: getGetTicketsQueryKey() });
    await queryClient.invalidateQueries({ queryKey: getGetTicketSummaryQueryKey() });
    syncingRef.current = false;
    setSyncing(false);
    setSyncError(failed);
  }, [enabled, online, queryClient, queueCount]);
  useEffect(() => { void sync(); }, [sync]);
  return { syncing, syncError, syncNow: () => sync(true) };
}

function AppShell({ children }: { children: ReactNode }) {
  const { hasRole } = useAuth();
  const online = useOnlineStatus();
  const queueCount = useQueueCount();
  useOfflineSync(online, queueCount);
  const [mobileNav, setMobileNav] = useState(false);
  const [location] = useLocation();
  const navItems = [
    { href: '/', label: 'Station overview', icon: LayoutDashboard },
    { href: '/ticketing', label: 'Issue ticket', icon: Ticket },
    { href: '/tickets', label: 'Ticket register', icon: ClipboardList },
    { href: '/revenue', label: 'Revenue & settlement', icon: BarChart3 },
    { href: '/stations', label: 'Stations', icon: Building2 },
    { href: '/vehicles', label: 'Vehicles', icon: Bus },
    { href: '/routes', label: 'Routes', icon: Route },
    { href: '/display', label: 'Display Board', icon: Monitor },
    { href: '/users', label: 'Users', icon: Users, adminOnly: true },
    { href: '/settings', label: 'Station settings', icon: Settings },
  ];
  return (
    <div className="min-h-[100dvh] bg-background">
      {mobileNav && <button aria-label="Close navigation" data-testid="button-close-navigation" className="fixed inset-0 z-30 bg-foreground/30 lg:hidden" onClick={() => setMobileNav(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-[86px] items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground"><TrainFront size={21} strokeWidth={2.3} /></div>
          <div>
            <div className="font-semibold tracking-tight">Transit Desk</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">E-ticketing / v1.0</div>
          </div>
        </div>
        <div className="px-4 pt-7">
          <div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45">Station console</div>
          <nav className="space-y-1">
            {navItems
            .filter((item) => !item.adminOnly || hasRole("SYSTEM_ADMIN"))
            .map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? location === '/' : location.startsWith(href);
              return (
                <Link key={href} href={href} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}``} onClick={() => setMobileNav(false)} className={`group flex items-center justify-between rounded-sm px-3 py-3 text-sm transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/68 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'}`}>
                  <span className="flex items-center gap-3"><Icon size={17} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span></span>
                  {href === '/tickets' && queueCount > 0 && <span data-testid="badge-queued-navigation" className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] font-semibold text-accent-foreground">{queueCount}</span>}
                  {active && href !== '/tickets' && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto border-t border-sidebar-border p-5">
          <div className="mb-4 flex items-center gap-2 text-xs text-sidebar-foreground/60"><span className={`h-2 w-2 rounded-full ${online ? 'bg-sidebar-primary signal-live' : 'bg-accent'}`} />{online ? 'Station online' : 'Offline mode active'}</div>
          <div className="rounded-sm border border-sidebar-border bg-sidebar-accent/45 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">Signed in as</div>
            <div className="mt-1 text-sm font-medium">Counter 04 · Selamawit T.</div>
            <div className="mt-1 text-xs text-sidebar-foreground/55">{STATION_CODE} / Addis Ababa</div>
          </div>
        </div>
      </aside>
      <div className="lg:pl-[276px]">
        <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-md sm:px-7">
          <div className="flex items-center gap-3">
            <button className="rounded-sm p-2 hover:bg-muted lg:hidden" data-testid="button-open-navigation" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={21} /></button>
            <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><Landmark size={15} /><span>{STATION_NAME}</span><span className="text-border">/</span><span className="font-mono text-[11px]">{STATION_CODE}</span></div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground sm:hidden"><TrainFront size={15} />{STATION_CODE}</div>
          </div>
          <div className="flex items-center gap-3">
            <div data-testid="status-connection" className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${online ? 'border-primary/25 bg-primary/8 text-primary' : 'border-accent/40 bg-accent/10 text-accent-foreground'}`}>
              {online ? <Wifi size={14} /> : <CloudOff size={14} />}<span className="hidden sm:inline">{online ? 'Connected' : 'Offline · queueing locally'}</span>
            </div>
            <div className="hidden h-8 w-px bg-border sm:block" />
            <div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-secondary-foreground">ST</div><span className="hidden text-sm font-medium md:inline">Selamawit T.</span><ChevronDown size={15} className="text-muted-foreground" /></div>
          
            <SyncStatus />
            <UserMenu />
          </div>
        </header>
        {!online && <div data-testid="banner-offline" className="flex items-center justify-center gap-2 border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs text-accent-foreground"><CloudOff size={14} /><span>Network unavailable. New tickets are safe on this device and will sync automatically.</span>{queueCount > 0 && <strong className="font-mono">{queueCount} queued</strong>}</div>}
        <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  );
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-primary"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{eyebrow}</div><h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-[38px]">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function LoadingBlock({ label = 'Loading station data' }: { label?: string }) {
  return <div data-testid="state-loading" className="space-y-3"><div className="h-24 animate-pulse rounded-sm bg-muted" /><div className="h-4 w-1/2 animate-pulse rounded-sm bg-muted" /><p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p></div>;
}

function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return <div data-testid="state-error" className="flex flex-col items-start gap-3 rounded-sm border border-destructive/25 bg-destructive/5 p-5"><div className="flex items-center gap-2 text-sm font-medium text-destructive"><AlertCircle size={17} />Could not load station data</div><p className="text-xs text-muted-foreground">{message}</p><button data-testid="button-retry" onClick={retry} className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"><RefreshCw size={14} />Try again</button></div>;
}

function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div data-testid="state-empty" className="flex min-h-[220px] flex-col items-center justify-center rounded-sm border border-dashed border-border bg-card/50 px-5 text-center"><div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground"><ReceiptText size={20} /></div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">{description}</p>{action && <div className="mt-4">{action}</div>}</div>;
}

function MetricCard({ label, value, caption, icon: Icon, tone = 'default' }: { label: string; value: string; caption?: string; icon: typeof Banknote; tone?: 'default' | 'accent' | 'orange' }) {
  return <div className={`rounded-sm border border-border bg-card p-5 ${tone === 'accent' ? 'border-primary/25 bg-primary/[0.045]' : tone === 'orange' ? 'border-accent/25 bg-accent/[0.045]' : ''}`}><div className="flex items-start justify-between"><div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</div><Icon size={16} className={tone === 'orange' ? 'text-accent' : tone === 'accent' ? 'text-primary' : 'text-muted-foreground'} /></div><div className="mt-4 text-2xl font-semibold tracking-[-0.04em] tabular-nums">{value}</div>{caption && <div className="mt-1 text-xs text-muted-foreground">{caption}</div>}</div>;
}

function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <div className="mb-3 flex items-center justify-between"><h2 className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{children}</h2>{right}</div>;
}

function HomePage() {
  const ticketsQuery = useGetTickets();
  const summaryQuery = useGetTicketSummary();
  const tickets = ticketsQuery.data ?? [];
  const summary = summaryQuery.data;
  const queueCount = useQueueCount();
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
  return <div className="app-enter">
    <PageHeader eyebrow="Daily operations · Counter 04" title="Station overview" description={`${today}. Keep the line moving with a clear view of collections, tickets, and settlement.`} action={<Link href="/ticketing" data-testid="link-start-ticketing" className="flex items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5">Issue a ticket <ArrowRight size={16} /></Link>} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {summaryQuery.isLoading ? <LoadingBlock /> : summaryQuery.isError ? <QueryError message={errorMessage(summaryQuery.error)} retry={() => void summaryQuery.refetch()} /> : <>
        <MetricCard label="Gross collection" value={currency(summary?.grossCollectionETB)} caption={`${summary?.ticketCount ?? 0} issued today`} icon={Banknote} tone="accent" />
        <MetricCard label="Base fares" value={currency(summary?.baseFaresETB)} caption="Passenger fare value" icon={Ticket} />
        <MetricCard label="Net settlement" value={currency(summary?.netSettlementETB)} caption="After station commission" icon={Landmark} tone="orange" />
        <MetricCard label="Tickets issued" value={(summary?.ticketCount ?? 0).toLocaleString()} caption={queueCount ? `${queueCount} waiting to sync` : 'All tickets synced'} icon={ClipboardList} />
      </>}
    </div>
    <div className="mt-8 grid gap-8 xl:grid-cols-[1fr_350px]">
      <section className="app-enter app-enter-delay-1">
        <SectionLabel right={<Link href="/tickets" data-testid="link-view-all-tickets" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">View register <ArrowRight size={13} /></Link>}>Recent activity</SectionLabel>
        {ticketsQuery.isLoading ? <LoadingBlock label="Loading recent tickets" /> : ticketsQuery.isError ? <QueryError message={errorMessage(ticketsQuery.error)} retry={() => void ticketsQuery.refetch()} /> : tickets.length === 0 ? <EmptyState title="No tickets issued today" description="Issued tickets will appear here with their settlement trail." action={<Link href="/ticketing" data-testid="link-empty-issue-ticket" className="text-xs font-semibold text-primary hover:underline">Issue the first ticket</Link>} /> :
          <div className="overflow-hidden rounded-sm border border-border bg-card"><div className="hidden grid-cols-[1.2fr_1fr_0.7fr_0.8fr] border-b border-border bg-muted/45 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground sm:grid"><span>Passenger route</span><span>Vehicle</span><span>Issued</span><span className="text-right">Collection</span></div>{tickets.slice(0, 8).map((ticket, index) => <TicketRow key={ticket.id} ticket={ticket} index={index} />)}</div>}
      </section>
      <section className="app-enter app-enter-delay-2">
        <SectionLabel>Settlement snapshot</SectionLabel>
        <div className="rounded-sm border border-border bg-card p-5">
          <div className="mb-5 flex items-center justify-between border-b border-border pb-4"><div><div className="text-sm font-semibold">Today's ledger</div><div className="mt-1 text-xs text-muted-foreground">Auto-calculated from issued fares</div></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary"><ShieldCheck size={17} /></div></div>
          <div className="space-y-4">{[['Service charges', summary?.serviceChargesETB], ['VAT on service', summary?.vatETB], ['Station fees', summary?.stationFeesETB], ['Ticketer commission', summary?.commissionsETB]].map(([label, value], index) => <div key={String(label)} className="flex items-center justify-between text-sm"><span className={index === 3 ? 'text-muted-foreground' : 'text-foreground/75'}>{label}</span><span className={`font-mono text-xs tabular-nums ${index === 3 ? 'text-accent-foreground' : ''}`}>{currency(value as number)}</span></div>)}</div>
          <div className="mt-6 flex items-end justify-between border-t border-border pt-4"><span className="text-sm font-semibold">Net payable</span><span data-testid="text-net-settlement" className="font-mono text-lg font-semibold tabular-nums text-primary">{currency(summary?.netSettlementETB)}</span></div>
        </div>
        <div data-testid="card-queue-status" className={`mt-3 flex items-start gap-3 rounded-sm border p-4 ${queueCount ? 'border-accent/30 bg-accent/8' : 'border-primary/20 bg-primary/5'}`}>{queueCount ? <CloudOff size={17} className="mt-0.5 text-accent" /> : <Cloud size={17} className="mt-0.5 text-primary" />}<div><div className="text-xs font-semibold">{queueCount ? `${queueCount} ticket${queueCount > 1 ? 's' : ''} pending sync` : 'Paper trail is up to date'}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{queueCount ? 'They remain stored on this device until the station connection returns.' : 'Every ticket is recorded with a receipt ID and settlement breakdown.'}</div></div></div>
      </section>
    </div>
  </div>;
}

function TicketRow({ ticket, index }: { ticket: ApiTicket; index: number }) {
  return <div data-testid={`row-ticket-${ticket.id}`} className={`grid gap-2 border-b border-border px-5 py-4 last:border-0 sm:grid-cols-[1.2fr_1fr_0.7fr_0.8fr] sm:items-center ${index % 2 ? 'bg-muted/[0.16]' : ''}`}><div><div className="text-sm font-medium">{ticket.origin} <span className="text-muted-foreground">→</span> {ticket.destination}</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">{ticket.id} · {ticket.distanceKm} km</div></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><TrainFront size={14} />{ticket.vehiclePlate}</div><div className="text-xs text-muted-foreground">{shortDate(ticket.issuedAt)}</div><div className="text-right font-mono text-xs font-semibold tabular-nums">{currency(ticket.totalETB)}</div></div>;
}

function makeTicket(route: RouteOption, vehiclePlate: string): TicketInput {
  const serviceChargeRate = route.distanceKm < 50 ? 0.05 : 0.04;
  const serviceChargeETB = Number((route.fareETB * serviceChargeRate).toFixed(2));
  const vatETB = Number((serviceChargeETB * 0.15).toFixed(2));
  const stationFeeETB = Number((serviceChargeETB * 0.1).toFixed(2));
  const ticketerCommissionETB = Number((serviceChargeETB * 0.05).toFixed(2));
  const totalETB = Number((route.fareETB + serviceChargeETB + vatETB + stationFeeETB).toFixed(2));
  return { id: `TKT-${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, routeId: route.id, origin: route.origin, destination: route.destination, distanceKm: route.distanceKm, fareETB: route.fareETB, serviceChargeRate, serviceChargeETB, vatETB, stationFeeETB, totalETB, ticketerCommissionETB, vehiclePlate, issuedAt: new Date().toISOString() };
}

function TicketingPage() {
  const online = useOnlineStatus();
  const createTicket = useCreateTicket();
  const queryClient = useQueryClient();
  const [routeId, setRouteId] = useState(ROUTES[0].id);
  const [vehiclePlate, setVehiclePlate] = useState(VEHICLES[0].plate);
  const [lastIssued, setLastIssued] = useState<TicketInput | ApiTicket | null>(null);
  const [notice, setNotice] = useState<'success' | 'queued' | null>(null);
  const route = ROUTES.find((item) => item.id === routeId) ?? ROUTES[0];
  const preview = useMemo(() => makeTicket(route, vehiclePlate), [route, vehiclePlate]);
  const issue = (event: FormEvent) => {
    event.preventDefault();
    setNotice(null);
    const ticket = makeTicket(route, vehiclePlate);
    if (!online) {
      queueTicket(ticket);
      setLastIssued(ticket);
      setNotice('queued');
      return;
    }
    createTicket.mutate({ data: ticket }, {
      onSuccess: (created) => {
        setLastIssued(created);
        setNotice('success');
        void queryClient.invalidateQueries({ queryKey: getGetTicketsQueryKey() });
        void queryClient.invalidateQueries({ queryKey: getGetTicketSummaryQueryKey() });
      },
      onError: () => {
        queueTicket(ticket);
        setLastIssued(ticket);
        setNotice('queued');
      },
    });
  };
  return <div className="app-enter">
    <PageHeader eyebrow="Counter workflow · New issuance" title="Issue a passenger ticket" description="Select the route and vehicle, confirm the fare ledger, then print a receipt for the passenger." action={<div data-testid="status-ticket-mode" className="flex items-center gap-2 rounded-sm border border-border bg-card px-3 py-2 text-xs"><span className={`h-2 w-2 rounded-full ${online ? 'bg-primary' : 'bg-accent'}`} />{online ? 'Ready to record' : 'Local queue enabled'}</div>} />
    <div className="grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_390px]">
      <form onSubmit={issue} className="rounded-sm border border-border bg-card">
        <div className="border-b border-border px-5 py-4 sm:px-7"><div className="flex items-center gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-mono text-xs font-semibold">01</div><div><h2 className="text-sm font-semibold">Journey details</h2><p className="text-xs text-muted-foreground">Choose from example routes and fares in the supplied demo data.</p></div></div></div>
        <div className="space-y-6 p-5 sm:p-7">
          <label className="block"><span className="mb-2 block text-xs font-semibold">Route</span><select data-testid="select-route" value={routeId} onChange={(event) => setRouteId(event.target.value)} className="w-full rounded-sm border border-input bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/15">{ROUTES.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.distanceKm} km</option>)}</select></label>
          <div className="grid gap-4 sm:grid-cols-2"><div className="rounded-sm border border-border bg-muted/35 p-4"><div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Origin</div><div data-testid="text-route-origin" className="mt-2 text-sm font-semibold">{route.origin}</div></div><div className="rounded-sm border border-border bg-muted/35 p-4"><div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Destination</div><div data-testid="text-route-destination" className="mt-2 text-sm font-semibold">{route.destination}</div></div></div>
          <label className="block"><span className="mb-2 block text-xs font-semibold">Vehicle plate</span><select data-testid="select-vehicle" value={vehiclePlate} onChange={(event) => setVehiclePlate(event.target.value)} className="w-full rounded-sm border border-input bg-background px-3 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">{VEHICLES.map((vehicle) => <option key={vehicle.plate} value={vehicle.plate}>{vehicle.plate} · {vehicle.operator}</option>)}</select></label>
          <div className="flex items-start gap-3 border-t border-border pt-5 text-xs text-muted-foreground"><CircleHelp size={15} className="mt-0.5 shrink-0" /><p>Service charge is {route.distanceKm < 50 ? '5%' : '4%'} for this distance. VAT, station fee, and commission are calculated from the service charge.</p></div>
          <button data-testid="button-issue-ticket" type="submit" disabled={createTicket.isPending} className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-65"><Send size={16} />{createTicket.isPending ? 'Recording ticket…' : online ? 'Record and issue ticket' : 'Save ticket to device queue'}</button>
          {createTicket.isError && <div data-testid="status-ticket-error" className="flex items-center gap-2 text-xs text-destructive"><AlertCircle size={14} />{errorMessage(createTicket.error)}</div>}
          {notice && <div data-testid={`status-ticket-${notice}`} className={`flex items-center gap-2 rounded-sm border p-3 text-xs ${notice === 'queued' ? 'border-accent/30 bg-accent/8 text-accent-foreground' : 'border-primary/20 bg-primary/5 text-primary'}`}>{notice === 'queued' ? <CloudOff size={15} /> : <Check size={15} />}{notice === 'queued' ? 'Ticket saved locally. It will sync when the connection returns.' : 'Ticket recorded successfully. The receipt is ready to print.'}</div>}
        </div>
      </form>
      <div className="xl:sticky xl:top-[92px]">
        <SectionLabel right={<span className="font-mono text-[10px] text-muted-foreground">PREVIEW</span>}>Fare breakdown</SectionLabel>
        <div className="rounded-sm border border-border bg-card">
          <div className="border-b border-dashed border-border p-5"><div className="flex items-start justify-between"><div><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Passenger fare</div><div className="mt-2 text-3xl font-semibold tracking-[-0.05em] tabular-nums">{currency(preview.totalETB)}</div></div><div className="rounded-sm bg-primary/10 px-2 py-1 font-mono text-[10px] text-primary">ET / {route.id}</div></div><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><span>{route.origin}</span><ArrowRight size={13} /><span>{route.destination}</span><span className="ml-auto font-mono">{route.distanceKm} km</span></div></div>
          <div className="space-y-3 p-5"><BreakdownRow label="Base fare" value={preview.fareETB} /><BreakdownRow label={`Service charge (${preview.serviceChargeRate * 100}%)`} value={preview.serviceChargeETB} /><BreakdownRow label="VAT (15% of service)" value={preview.vatETB} /><BreakdownRow label="Station fee (10% of service)" value={preview.stationFeeETB} /><div className="border-t border-border pt-3"><BreakdownRow label="Passenger pays" value={preview.totalETB} strong /></div></div>
          <div className="border-t border-border bg-muted/35 px-5 py-4"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Ticketer commission</span><span className="font-mono font-semibold text-accent-foreground">{currency(preview.ticketerCommissionETB)}</span></div></div>
        </div>
        {lastIssued && <div className="receipt-print mt-4 rounded-sm border border-primary/20 bg-primary/5 p-4 no-print"><div className="flex items-center gap-2 text-xs font-semibold text-primary"><Check size={15} />Receipt ready · {lastIssued.id}</div><p className="mt-1 text-xs text-muted-foreground">Print a paper copy for the passenger.</p><button data-testid="button-print-new-receipt" onClick={() => window.print()} className="mt-3 flex items-center gap-2 rounded-sm border border-primary/25 bg-card px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5"><Printer size={14} />Print receipt</button></div>}
      </div>
    </div>
  </div>;
}

function BreakdownRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <div className={`flex items-center justify-between text-sm ${strong ? 'font-semibold' : ''}`}><span className={strong ? 'text-foreground' : 'text-muted-foreground'}>{label}</span><span className="font-mono text-xs tabular-nums">{currency(value)}</span></div>;
}

function TicketsPage() {
  const query = useGetTickets();
  const online = useOnlineStatus();
  const queueCount = useQueueCount();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'today' | 'queued'>('all');
  const [reprinting, setReprinting] = useState<ApiTicket | null>(null);
  const tickets = query.data ?? [];
  const filtered = tickets.filter((ticket) => {
    const haystack = `${ticket.id} ${ticket.origin} ${ticket.destination} ${ticket.vehiclePlate}`.toLowerCase();
    return haystack.includes(search.toLowerCase()) && (filter !== 'today' || new Date(ticket.issuedAt).toDateString() === new Date().toDateString());
  });
  const printTicket = (ticket: ApiTicket) => { setReprinting(ticket); window.setTimeout(() => window.print(), 50); };
  return <div className="app-enter">
    <PageHeader eyebrow="Audit trail · Issued fares" title="Ticket register" description="Search every recorded receipt, identify unsynced device tickets, and reprint a passenger copy when needed." action={<Link href="/ticketing" data-testid="link-register-new-ticket" className="flex items-center justify-center gap-2 rounded-sm border border-primary/30 bg-card px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/5"><Ticket size={16} />New ticket</Link>} />
    {queueCount > 0 && <div data-testid="banner-queued-tickets" className="mb-5 flex items-center justify-between gap-4 rounded-sm border border-accent/35 bg-accent/8 p-4"><div className="flex items-center gap-3"><CloudOff size={18} className="text-accent" /><div><div className="text-sm font-semibold">{queueCount} ticket{queueCount > 1 ? 's' : ''} waiting for sync</div><div className="mt-0.5 text-xs text-muted-foreground">{online ? 'Connection restored. Sync is in progress.' : 'Tickets are stored securely on this device.'}</div></div></div><Link href="/settings" data-testid="link-queued-settings" className="text-xs font-semibold text-accent-foreground hover:underline">Queue settings <ArrowRight size={12} className="ml-1 inline" /></Link></div>}
    <div className="mb-4 flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input data-testid="input-ticket-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search receipt, route, or vehicle…" className="w-full rounded-sm border border-input bg-card py-3 pl-10 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" /></div><div className="flex rounded-sm border border-border bg-card p-1">{(['all', 'today', 'queued'] as const).map((option) => <button key={option} data-testid={`button-filter-${option}`} onClick={() => setFilter(option)} className={`rounded-sm px-3 py-2 text-xs font-medium capitalize ${filter === option ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{option === 'queued' ? `Queued (${queueCount})` : option}</button>)}</div></div>
    {query.isLoading ? <LoadingBlock label="Loading ticket register" /> : query.isError ? <QueryError message={errorMessage(query.error)} retry={() => void query.refetch()} /> : filter === 'queued' ? <QueuedRegister /> : filtered.length === 0 ? <EmptyState title={search ? 'No matching tickets' : 'No tickets in this view'} description={search ? 'Try a receipt ID, route name, or vehicle plate.' : 'Issued tickets will build the station paper trail here.'} action={!search && <Link href="/ticketing" data-testid="link-register-empty-issue" className="text-xs font-semibold text-primary hover:underline">Issue a ticket</Link>} /> :
      <div data-testid="table-ticket-register" className="overflow-x-auto rounded-sm border border-border bg-card"><div className="min-w-[760px]"><div className="grid grid-cols-[1.35fr_1fr_0.8fr_0.8fr_44px] gap-4 border-b border-border bg-muted/45 px-5 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><span>Receipt / route</span><span>Vehicle</span><span>Issued</span><span className="text-right">Total</span><span /></div>{filtered.map((ticket, index) => <div key={ticket.id} data-testid={`row-register-${ticket.id}`} className={`grid grid-cols-[1.35fr_1fr_0.8fr_0.8fr_44px] items-center gap-4 border-b border-border px-5 py-4 last:border-0 ${index % 2 ? 'bg-muted/[0.14]' : ''}`}><div><div className="font-mono text-xs font-semibold">{ticket.id}</div><div className="mt-1 text-xs text-muted-foreground">{ticket.origin} <span className="mx-1">→</span> {ticket.destination}</div></div><div className="flex items-center gap-2 text-xs text-muted-foreground"><TrainFront size={14} />{ticket.vehiclePlate}</div><div className="text-xs text-muted-foreground">{shortDate(ticket.issuedAt)}</div><div className="text-right font-mono text-xs font-semibold tabular-nums">{currency(ticket.totalETB)}</div><button data-testid={`button-reprint-${ticket.id}`} onClick={() => printTicket(ticket)} title="Reprint receipt" className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"><Printer size={15} /></button></div>)}</div></div>}
    {reprinting && <div className="receipt-print hidden"><div className="mx-auto max-w-sm border border-border p-6 font-mono text-sm"><div className="text-center text-lg font-semibold">TRANSIT DESK</div><div className="mt-1 text-center text-xs">{STATION_NAME}</div><div className="my-5 border-y border-dashed py-3 text-center font-semibold">PASSENGER RECEIPT</div><div className="space-y-2 text-xs"><div className="flex justify-between"><span>Receipt</span><span>{reprinting.id}</span></div><div className="flex justify-between"><span>Route</span><span>{reprinting.routeId}</span></div><div className="flex justify-between"><span>Journey</span><span>{reprinting.origin} → {reprinting.destination}</span></div><div className="flex justify-between"><span>Vehicle</span><span>{reprinting.vehiclePlate}</span></div><div className="flex justify-between border-t border-dashed pt-2 font-semibold"><span>Total</span><span>{currency(reprinting.totalETB)}</span></div></div></div></div>}
  </div>;
}

function QueuedRegister() {
  const queue = readQueue();
  const [reprinting, setReprinting] = useState<TicketInput | null>(null);
  const printTicket = (ticket: TicketInput) => { setReprinting(ticket); window.setTimeout(() => window.print(), 50); };
  return queue.length === 0 ? <EmptyState title="Queue is clear" description="There are no local tickets waiting for the station service." /> : <><div data-testid="table-queued-register" className="overflow-hidden rounded-sm border border-accent/30 bg-card">{queue.map((ticket) => <div key={ticket.id} className="flex flex-col justify-between gap-3 border-b border-border p-5 last:border-0 sm:flex-row sm:items-center"><div><div className="flex items-center gap-2 font-mono text-xs font-semibold"><span className="h-2 w-2 rounded-full bg-accent" />{ticket.id}</div><div className="mt-1 text-xs text-muted-foreground">{ticket.origin} → {ticket.destination} · {ticket.vehiclePlate}</div></div><div className="flex items-center gap-5"><div className="text-right"><div className="font-mono text-xs font-semibold">{currency(ticket.totalETB)}</div><div className="mt-1 text-[10px] uppercase tracking-wider text-accent-foreground">Pending sync</div></div><button data-testid={`button-reprint-queued-${ticket.id}`} onClick={() => printTicket(ticket)} title="Print queued receipt" className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-secondary hover:text-foreground"><Printer size={15} /></button><CloudOff size={16} className="text-accent" /></div></div>)}</div>{reprinting && <div className="receipt-print hidden"><div className="mx-auto max-w-sm border border-border p-6 font-mono text-sm"><div className="text-center text-lg font-semibold">TRANSIT DESK</div><div className="mt-1 text-center text-xs">{STATION_NAME}</div><div className="my-5 border-y border-dashed py-3 text-center font-semibold">PASSENGER RECEIPT</div><div className="space-y-2 text-xs"><div className="flex justify-between"><span>Receipt</span><span>{reprinting.id}</span></div><div className="flex justify-between"><span>Journey</span><span>{reprinting.origin} → {reprinting.destination}</span></div><div className="flex justify-between"><span>Vehicle</span><span>{reprinting.vehiclePlate}</span></div><div className="flex justify-between border-t border-dashed pt-2 font-semibold"><span>Total</span><span>{currency(reprinting.totalETB)}</span></div></div></div></div>}</>;
}

function RevenuePage() {
  const query = useGetTicketSummary();
  const summary = query.data;
  const rows = [['Base fares', summary?.baseFaresETB, 'Passenger fare value'], ['Service charges', summary?.serviceChargesETB, '5% / 4% distance rule'], ['VAT', summary?.vatETB, '15% of service charge'], ['Station fees', summary?.stationFeesETB, '10% of service charge'], ['Ticketer commission', summary?.commissionsETB, '5% of service charge']];
  return <div className="app-enter"><PageHeader eyebrow="Finance · Daily close" title="Revenue & settlement" description="A transparent breakdown of today's issued fares, charges, and the amount ready for station settlement." action={<button data-testid="button-export-revenue" onClick={() => window.print()} className="flex items-center justify-center gap-2 rounded-sm border border-border bg-card px-4 py-3 text-sm font-semibold hover:bg-muted"><ArrowDownToLine size={16} />Export view</button>} />
    {query.isLoading ? <LoadingBlock label="Loading settlement figures" /> : query.isError ? <QueryError message={errorMessage(query.error)} retry={() => void query.refetch()} /> : <><div className="grid gap-3 sm:grid-cols-3"><MetricCard label="Gross collection" value={currency(summary?.grossCollectionETB)} caption="Total collected from passengers" icon={Banknote} tone="accent" /><MetricCard label="Deductions & shares" value={currency((summary?.vatETB ?? 0) + (summary?.stationFeesETB ?? 0) + (summary?.commissionsETB ?? 0))} caption="VAT, station fees, commission" icon={SlidersHorizontal} /><MetricCard label="Ready for settlement" value={currency(summary?.netSettlementETB)} caption={`${summary?.ticketCount ?? 0} ticket${summary?.ticketCount === 1 ? '' : 's'} in today's close`} icon={ShieldCheck} tone="orange" /></div>
      <div className="mt-8 grid items-start gap-8 xl:grid-cols-[1fr_380px]"><section><SectionLabel>Ledger lines</SectionLabel><div className="rounded-sm border border-border bg-card">{rows.map(([label, value, note], index) => <div key={String(label)} className="flex items-center justify-between border-b border-border px-5 py-5 last:border-0"><div><div className="text-sm font-medium">{label}</div><div className="mt-1 text-xs text-muted-foreground">{note}</div></div><div className={`font-mono text-sm font-semibold tabular-nums ${index > 1 ? 'text-accent-foreground' : ''}`}>{currency(value as number)}</div></div>)}</div></section>
        <section><SectionLabel>Settlement statement</SectionLabel><div className="rounded-sm border border-border bg-sidebar p-6 text-sidebar-foreground"><div className="flex items-center justify-between border-b border-sidebar-border pb-5"><div><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/55">Station close</div><div className="mt-2 text-sm font-semibold">{STATION_CODE} · {new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date())}</div></div><Landmark size={21} className="text-sidebar-primary" /></div><div className="py-5"><div className="font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/55">Net settlement</div><div data-testid="text-revenue-net-settlement" className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-sidebar-primary tabular-nums">{currency(summary?.netSettlementETB)}</div></div><div className="space-y-3 border-t border-sidebar-border pt-4 text-xs"><div className="flex justify-between"><span className="text-sidebar-foreground/60">Tickets</span><span className="font-mono">{summary?.ticketCount ?? 0}</span></div><div className="flex justify-between"><span className="text-sidebar-foreground/60">Gross collection</span><span className="font-mono">{currency(summary?.grossCollectionETB)}</span></div><div className="flex justify-between"><span className="text-sidebar-foreground/60">Commission retained</span><span className="font-mono">{currency(summary?.commissionsETB)}</span></div></div></div></section></div></>}
  </div>;
}

function SettingValue({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div><div data-testid={`text-setting-${label.toLowerCase().replaceAll(' ', '-')}`} className={`mt-2 text-sm font-medium ${mono ? 'font-mono text-xs' : ''}`}>{value}</div></div>;
}

function SettingsPage() {
  const online = useOnlineStatus();
  const queueCount = useQueueCount();
  const [language, setLanguage] = useState('English');
  const [autoSync, setAutoSync] = useState(isAutoSyncEnabled);
  const [saved, setSaved] = useState(false);
  const save = () => { setSaved(true); window.setTimeout(() => setSaved(false), 2400); };
  const toggleAutoSync = () => {
    const next = !autoSync;
    setAutoSync(next);
    window.localStorage.setItem(AUTO_SYNC_KEY, String(next));
    window.dispatchEvent(new Event('transit-settings-changed'));
  };
  return <div className="app-enter"><PageHeader eyebrow="Configuration · Station controls" title="Settings" description="Review the station identity and local reliability controls used by this counter." />
    <div className="grid max-w-5xl gap-8 lg:grid-cols-[1fr_310px]"><div className="space-y-6">
      <section className="rounded-sm border border-border bg-card"><div className="border-b border-border px-5 py-4"><div className="flex items-center gap-3"><Landmark size={17} className="text-primary" /><div><h2 className="text-sm font-semibold">Station identity</h2><p className="mt-1 text-xs text-muted-foreground">Printed on every passenger receipt and settlement view.</p></div></div></div><div className="grid gap-5 p-5 sm:grid-cols-2"><SettingValue label="Station name" value={STATION_NAME} /><SettingValue label="Station code" value={STATION_CODE} mono /><SettingValue label="Counter" value="04 · Main ticket desk" /><SettingValue label="Region" value="Addis Ababa" /></div></section>
      <section className="rounded-sm border border-border bg-card"><div className="border-b border-border px-5 py-4"><div className="flex items-center gap-3"><Languages size={17} className="text-primary" /><div><h2 className="text-sm font-semibold">Language & display</h2><p className="mt-1 text-xs text-muted-foreground">Choose the working language for counter labels.</p></div></div></div><div className="p-5"><label className="block max-w-xs"><span className="mb-2 block text-xs font-semibold">Interface language</span><select data-testid="select-language" value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full rounded-sm border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"><option>English</option><option>Amharic</option><option>Afaan Oromo</option></select></label></div></section>
      <section className="rounded-sm border border-border bg-card"><div className="border-b border-border px-5 py-4"><div className="flex items-center gap-3"><Cloud size={17} className="text-primary" /><div><h2 className="text-sm font-semibold">Connection & queued tickets</h2><p className="mt-1 text-xs text-muted-foreground">Local-first operation protects tickets during a network drop.</p></div></div></div><div className="divide-y divide-border"><div className="flex items-center justify-between gap-4 p-5"><div className="flex items-center gap-3"><span className={`flex h-9 w-9 items-center justify-center rounded-full ${online ? 'bg-primary/10 text-primary' : 'bg-accent/15 text-accent-foreground'}`}>{online ? <Wifi size={17} /> : <CloudOff size={17} />}</span><div><div className="text-sm font-medium">Station connection</div><div data-testid="text-settings-connection" className="mt-1 text-xs text-muted-foreground">{online ? 'Online · ready to synchronize' : 'Offline · local queue active'}</div></div></div><span className={`font-mono text-[10px] uppercase tracking-wider ${online ? 'text-primary' : 'text-accent-foreground'}`}>{online ? 'Connected' : 'Offline'}</span></div><div className="flex items-center justify-between gap-4 p-5"><div><div className="text-sm font-medium">Automatic synchronization</div><div className="mt-1 text-xs text-muted-foreground">Send queued tickets as soon as the network returns.</div></div><button data-testid="button-toggle-auto-sync" role="switch" aria-checked={autoSync} onClick={toggleAutoSync} className={`relative h-6 w-11 rounded-full transition-colors ${autoSync ? 'bg-primary' : 'bg-muted-foreground/35'}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-card transition-transform ${autoSync ? 'left-6' : 'left-1'}`} /></button></div><div className="flex items-center justify-between gap-4 p-5"><div><div className="text-sm font-medium">Tickets waiting to sync</div><div className="mt-1 text-xs text-muted-foreground">Stored only on this device until recorded.</div></div><span data-testid="text-settings-queue-count" className={`font-mono text-sm font-semibold ${queueCount ? 'text-accent-foreground' : 'text-primary'}`}>{queueCount}</span></div></div></section>
      <div className="flex items-center justify-between gap-4"><div>{saved && <span data-testid="status-settings-saved" className="flex items-center gap-2 text-xs text-primary"><Check size={14} />Settings saved on this counter</span>}</div><button data-testid="button-save-settings" onClick={save} className="flex items-center gap-2 rounded-sm bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:-translate-y-0.5"><Check size={16} />Save settings</button></div>
    </div><aside className="space-y-4"><div className="rounded-sm border border-border bg-muted/45 p-5"><div className="mb-4 flex items-center gap-2 text-xs font-semibold"><ShieldCheck size={16} className="text-primary" />Reliability notes</div><ul className="space-y-4 text-xs leading-5 text-muted-foreground"><li className="flex gap-2"><span className="font-mono text-primary">01</span>Each receipt has a unique idempotency key.</li><li className="flex gap-2"><span className="font-mono text-primary">02</span>Offline tickets remain available after closing the browser.</li><li className="flex gap-2"><span className="font-mono text-primary">03</span>Sync retries quietly when connectivity returns.</li></ul></div><div className="rounded-sm border border-border bg-card p-5"><div className="flex items-center gap-2 text-xs font-semibold"><CircleHelp size={15} className="text-muted-foreground" />Need help?</div><p className="mt-2 text-xs leading-5 text-muted-foreground">Contact the station supervisor before changing counter configuration.</p></div></aside></div>
  </div>;
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route path="/">
          {() => (
            <ProtectedRoute>
              <AppShell>
                <HomePage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/ticketing">
          {() => (
            <ProtectedRoute roles={["TICKETER", "SYSTEM_ADMIN", "STATION_CONTROLLER"]}>
              <AppShell>
                <TicketsPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/tickets">
          {() => (
            <ProtectedRoute>
              <AppShell>
                <TicketsPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/revenue">
          {() => (
            <ProtectedRoute roles={["SYSTEM_ADMIN", "STATION_CONTROLLER"]}>
              <AppShell>
                <RevenuePage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/settings">
          {() => (
            <ProtectedRoute roles={["SYSTEM_ADMIN"]}>
              <AppShell>
                <SettingsPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
                <Route path="/stations">
          {() => (
            <ProtectedRoute>
              <AppShell>
                <StationsPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/vehicles">
          {() => (
            <ProtectedRoute>
              <AppShell>
                <VehiclesPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/routes">
          {() => (
            <ProtectedRoute>
              <AppShell>
                <RoutesPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/users">
          {() => (
            <ProtectedRoute roles={["SYSTEM_ADMIN"]}>
              <AppShell>
                <UsersPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
                <Route path="/ticketing/issue">
          {() => (
            <ProtectedRoute roles={["TICKETER", "SYSTEM_ADMIN", "STATION_CONTROLLER"]}>
              <AppShell>
                <TicketIssuePage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/tickets/batch/:batchId">
          {() => (
            <ProtectedRoute>
              <AppShell>
                <BatchViewPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/tickets/:id">
          {() => (
            <ProtectedRoute>
              <AppShell>
                <TicketDetailPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
                <Route path="/display">
          {() => (
            <ProtectedRoute>
              <AppShell>
                <DisplayPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/display/public/:stationId">
          {() => <PublicDisplayPage />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  // Wire auth token getter into the generated API client
  useEffect(() => {
    setBaseUrl(import.meta.env.VITE_API_URL ?? "http://localhost:3000");
    setAuthTokenGetter(async () => {
      let token = getAccessToken();
      if (!token) {
        const ok = await refreshAccessToken();
        if (ok) token = getAccessToken();
      }
      return token;
    });

    // Initialize auto-sync for offline queue
    const cleanup = initAutoSync();
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;