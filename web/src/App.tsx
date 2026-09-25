import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type FormEvent,
	type ReactNode,
} from "react";

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

// ! internal imports

import AppShell from "@/pages/app-shell.tsx";
import HomePage from "@/pages/home-page.tsx";
import NotFound from "@/pages/not-found";



// import TicketingPage from "@/pages/ticketing-page.tsx";
// import TicketsPage from "@/pages/tickets-page.tsx";
// import RevenuePage from "@/pages/revenue-page.tsx";
// import SettingsPage from "@/pages/settings-page.tsx";
import LoginPage from "@/pages/login";
// import StationsPage from "@/pages/stations";
// import VehiclesPage from "@/pages/vehicles";
// import RoutesPage from "@/pages/routes";
// import UsersPage from "@/pages/users";
// // import TicketsPage from "@/pages/tickets";
// import TicketIssuePage from "@/pages/ticket-issue";
// import TicketDetailPage from "@/pages/ticket-detail";
// import BatchViewPage from "@/pages/batch-view";
// import DisplayPage from "@/pages/display";
// import PublicDisplayPage from "@/pages/display-public";

// // # components
import ProtectedRoute from "@/components/protected-route";
// import PageHeader from "@/components/page-header.tsx";
// import LoadingBlock from "@/components/loading-block.tsx";
// import QueryError from "@/components/query-error.tsx";
// import EmptyState from "@/components/empty-state.tsx";
// import MetricCard from "@/components/metric-card.tsx";
// import SectionLabel from "@/components/section-label.tsx";
// import TicketRow from "@/components/ticket-row.tsx";
// import BreakdownRow from "@/components/breakdown-row.tsx";
// import QueuedRegister from "@/components/queued-register.tsx";
// import SettingValue from "@/components/settings-value.tsx";
// import UserMenu from "@/components/user-menu";
// import SyncStatus from "@/components/sync-status";
import Toaster from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import {ErrorBoundary} from "@/components/error-boundary.tsx";

// // #  hooks
// import { useAuth } from "@/hooks/use-auth";
import { AuthProvider } from "@/hooks/use-auth";

// // # libs
import { getAccessToken, refreshAccessToken } from "@/lib/auth";
import { setBaseUrl, setAuthTokenGetter } from "@/lib/api-config";
import { initAutoSync } from "@/lib/sync-engine";

// # utils

import {
	QUEUE_KEY,
	AUTO_SYNC_KEY,
	STATION_NAME,
	STATION_CODE,
	VEHICLES,
	ROUTES,
} from "@/lib/utils.ts";

import {
	readQueue,
	writeQueue,
	queueTicket,
	isAutoSyncEnabled,
	currency,
	shortDate,
	errorMessage,
	useOnlineStatus,
	useQueueCount,
	useLocalQueue,
	useOfflineSync,
	makeTicket,
} from "@/lib/utils.ts";
const queryClient = new QueryClient();

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
				
				{/*
				
				<Route path="/ticketing">
					{() => (
						<ProtectedRoute
							roles={[
								"TICKETER",
								"SYSTEM_ADMIN",
								"STATION_CONTROLLER",
							]}>
							<AppShell>
								<TicketingPage />
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
						<ProtectedRoute
							roles={["SYSTEM_ADMIN", "STATION_CONTROLLER"]}>
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
						<ProtectedRoute
							roles={[
								"TICKETER",
								"SYSTEM_ADMIN",
								"STATION_CONTROLLER",
							]}>
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
				</Route> */}

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
