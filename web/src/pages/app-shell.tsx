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
  
 export function readQueue(): TicketInput[] {
	try {
	  const raw = window.localStorage.getItem(QUEUE_KEY);
	  return raw ? (JSON.parse(raw) as TicketInput[]) : [];
	} catch {
	  return [];
	}
  }
  
 export function writeQueue(queue: TicketInput[]) {
	window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
	window.dispatchEvent(new Event("transit-queue-changed"));
  }
  
 export function queueTicket(ticket: TicketInput) {
	const queue = readQueue();
	if (!queue.some((item) => item.id === ticket.id)) {
	  writeQueue([...queue, ticket]);
	}
  }
  
 export function isAutoSyncEnabled() {
	return (
	  typeof window === "undefined" ||
	  window.localStorage.getItem(AUTO_SYNC_KEY) !== "false"
	);
  }
  
 export function currency(value: number | undefined | null) {
	return `ETB ${(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  
 export function shortDate(date: string | Date) {
	return new Intl.DateTimeFormat("en-GB", {
	  day: "2-digit",
	  month: "short",
	  hour: "2-digit",
	  minute: "2-digit",
	}).format(new Date(date));
  }
  
 export function errorMessage(error: unknown) {
	return error instanceof Error
	  ? error.message
	  : "The station service could not be reached.";
  }
  
 export function useOnlineStatus() {
	const [online, setOnline] = useState(() =>
	  typeof navigator === "undefined" ? true : navigator.onLine,
	);
	useEffect(() => {
	  const on = () => setOnline(true);
	  const off = () => setOnline(false);
	  window.addEventListener("online", on);
	  window.addEventListener("offline", off);
	  return () => {
		window.removeEventListener("online", on);
		window.removeEventListener("offline", off);
	  };
	}, []);
	return online;
  }
  
 export function useQueueCount() {
	const [count, setCount] = useState(() =>
	  typeof window === "undefined" ? 0 : readQueue().length,
	);
	useEffect(() => {
	  const update = () => setCount(readQueue().length);
	  window.addEventListener("transit-queue-changed", update);
	  window.addEventListener("online", update);
	  return () => {
		window.removeEventListener("transit-queue-changed", update);
		window.removeEventListener("online", update);
	  };
	}, []);
	return count;
  }
  
 export function useLocalQueue() {
	const [queue, setQueue] = useState<TicketInput[]>(() =>
	  typeof window === "undefined" ? [] : readQueue(),
	);
	useEffect(() => {
	  const update = () => setQueue(readQueue());
	  window.addEventListener("transit-queue-changed", update);
	  window.addEventListener("storage", update);
	  return () => {
		window.removeEventListener("transit-queue-changed", update);
		window.removeEventListener("storage", update);
	  };
	}, []);
	return queue;
  }
  
 export function useOfflineSync(online: boolean, queueCount: number) {
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
	  window.addEventListener("transit-settings-changed", update);
	  return () => window.removeEventListener("transit-settings-changed", update);
	}, []);
	const sync = useCallback(
	  async (manual = false) => {
		if (
		  !online ||
		  (!enabled && !manual) ||
		  syncingRef.current ||
		  queueCount === 0
		)
		  return;
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
		await queryClient.invalidateQueries({
		  queryKey: getGetTicketsQueryKey(),
		});
		await queryClient.invalidateQueries({
		  queryKey: getGetTicketSummaryQueryKey(),
		});
		syncingRef.current = false;
		setSyncing(false);
		setSyncError(failed);
	  },
	  [enabled, online, queryClient, queueCount],
	);
	useEffect(() => {
	  void sync();
	}, [sync]);
	return { syncing, syncError, syncNow: () => sync(true) };
  }
  
  
export function AppShell({ children }: { children: ReactNode }) {
	const { hasRole } = useAuth();
	const online = useOnlineStatus();
	const queueCount = useQueueCount();
	useOfflineSync(online, queueCount);
	const [mobileNav, setMobileNav] = useState(false);
	const [location] = useLocation();
	const navItems = [
	  { href: "/", label: "Station overview", icon: LayoutDashboard },
	  { href: "/ticketing", label: "Issue ticket", icon: Ticket },
	  { href: "/tickets", label: "Ticket register", icon: ClipboardList },
	  { href: "/revenue", label: "Revenue & settlement", icon: BarChart3 },
	  { href: "/stations", label: "Stations", icon: Building2 },
	  { href: "/vehicles", label: "Vehicles", icon: Bus },
	  { href: "/routes", label: "Routes", icon: Route },
	  { href: "/display", label: "Display Board", icon: Monitor },
	  { href: "/users", label: "Users", icon: Users, adminOnly: true },
	  { href: "/settings", label: "Station settings", icon: Settings },
	];
	return (
	  <div className="min-h-[100dvh] bg-background">
		{mobileNav && (
		  <button
			aria-label="Close navigation"
			data-testid="button-close-navigation"
			className="fixed inset-0 z-30 bg-foreground/30 lg:hidden"
			onClick={() => setMobileNav(false)}
		  />
		)}
		<aside
		  className={`fixed inset-y-0 left-0 z-40 flex w-[276px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${mobileNav ? "translate-x-0" : "-translate-x-full"}`}
		>
		  <div className="flex h-[86px] items-center gap-3 border-b border-sidebar-border px-6">
			<div className="flex h-10 w-10 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
			  <TrainFront size={21} strokeWidth={2.3} />
			</div>
			<div>
			  <div className="font-semibold tracking-tight">Transit Desk</div>
			  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/55">
				E-ticketing / v1.0
			  </div>
			</div>
		  </div>
		  <div className="px-4 pt-7">
			<div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-foreground/45">
			  Station console
			</div>
  
			<nav className="space-y-1">
			  {navItems
				.filter((item) => !item.adminOnly || hasRole("SYSTEM_ADMIN"))
				.map(({ href, label, icon: Icon }) => {
				  const active =
					href === "/" ? location === "/" : location.startsWith(href);
				  return (
					<Link
					  key={href}
					  href={href}
					  data-testid={`link-nav-${label.toLowerCase().replaceAll(" ", "-")}`}
					  onClick={() => setMobileNav(false)}
					  className={`group flex items-center justify-between rounded-sm px-3 py-3 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/68 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground"}`}
					>
					  <span className="flex items-center gap-3">
						<Icon size={17} strokeWidth={active ? 2.2 : 1.8} />
						<span>{label}</span>
					  </span>
					  {href === "/tickets" && queueCount > 0 && (
						<span
						  data-testid="badge-queued-navigation"
						  className="rounded-full bg-accent px-2 py-0.5 font-mono text-[10px] font-semibold text-accent-foreground"
						>
						  {queueCount}
						</span>
					  )}
					  {active && href !== "/tickets" && (
						<span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
					  )}
					</Link>
				  );
				})}
			</nav>
		  </div>
  
		  <div className="mt-auto border-t border-sidebar-border p-5">
			<div className="mb-4 flex items-center gap-2 text-xs text-sidebar-foreground/60">
			  <span
				className={`h-2 w-2 rounded-full ${online ? "bg-sidebar-primary signal-live" : "bg-accent"}`}
			  />
			  {online ? "Station online" : "Offline mode active"}
			</div>
			<div className="rounded-sm border border-sidebar-border bg-sidebar-accent/45 p-3">
			  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-sidebar-foreground/45">
				Signed in as
			  </div>
			  <div className="mt-1 text-sm font-medium">
				Counter 04 · Selamawit T.
			  </div>
			  <div className="mt-1 text-xs text-sidebar-foreground/55">
				{STATION_CODE} / Addis Ababa
			  </div>
			</div>
		  </div>
		</aside>
		<div className="lg:pl-[276px]">
		  <header className="sticky top-0 z-20 flex h-[68px] items-center justify-between border-b border-border/80 bg-background/90 px-4 backdrop-blur-md sm:px-7">
			<div className="flex items-center gap-3">
			  <button
				className="rounded-sm p-2 hover:bg-muted lg:hidden"
				data-testid="button-open-navigation"
				aria-label="Open navigation"
				onClick={() => setMobileNav(true)}
			  >
				<Menu size={21} />
			  </button>
			  <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
				<Landmark size={15} />
				<span>{STATION_NAME}</span>
				<span className="text-border">/</span>
				<span className="font-mono text-[11px]">{STATION_CODE}</span>
			  </div>
			  <div className="flex items-center gap-2 text-xs text-muted-foreground sm:hidden">
				<TrainFront size={15} />
				{STATION_CODE}
			  </div>
			</div>
			<div className="flex items-center gap-3">
			  <div
				data-testid="status-connection"
				className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${online ? "border-primary/25 bg-primary/8 text-primary" : "border-accent/40 bg-accent/10 text-accent-foreground"}`}
			  >
				{online ? <Wifi size={14} /> : <CloudOff size={14} />}
				<span className="hidden sm:inline">
				  {online ? "Connected" : "Offline · queueing locally"}
				</span>
			  </div>
			  <div className="hidden h-8 w-px bg-border sm:block" />
			  <div className="flex items-center gap-2">
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-secondary-foreground">
				  ST
				</div>
				<span className="hidden text-sm font-medium md:inline">
				  Selamawit T.
				</span>
				<ChevronDown size={15} className="text-muted-foreground" />
			  </div>
  
			  <SyncStatus />
			  <UserMenu />
			</div>
		  </header>
		  {!online && (
			<div
			  data-testid="banner-offline"
			  className="flex items-center justify-center gap-2 border-b border-accent/30 bg-accent/10 px-4 py-2 text-xs text-accent-foreground"
			>
			  <CloudOff size={14} />
			  <span>
				Network unavailable. New tickets are safe on this device and will
				sync automatically.
			  </span>
			  {queueCount > 0 && (
				<strong className="font-mono">{queueCount} queued</strong>
			  )}
			</div>
		  )}
		  <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-9">
			{children}
		  </main>
		</div>
	  </div>
	);
  }
  