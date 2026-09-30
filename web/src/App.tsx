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

import AppShell from "./pages/app-shell.tsx";
import HomePage from "./pages/home-page.tsx";
import OverviewPage from "./pages/overview-page.tsx";
import NotFound from "./pages/not-found.tsx";
import LoginPage from "./modules/auth/pages/login.tsx";
import StationsPage from "./pages/stations.tsx";
import VehiclesPage from "./pages/vehicles.tsx";
import RoutesPage from "./pages/routes.tsx";
import UsersPage from "./modules/user/pages/users.tsx";
import TicketsPage from "./modules/tickets/pages/tickets.tsx";
import TicketIssuePage from "./modules/tickets/pages/ticket-issue.tsx";
import TicketDetailPage from "./modules/tickets/pages/ticket-detail.tsx";
import BatchViewPage from "./pages/batch-view.tsx";
import RevenuePage from "./modules/finance/pages/revenue.tsx";
import SettingsPage from "./pages/settings-page.tsx";
import DisplayPage from "./modules/display/pages/display.tsx";
import PublicDisplayPage from "./modules/display/pages/display-public.tsx";
import DispatchPage from "./pages/dispatch.tsx";

// # components
import ProtectedRoute from "./components/protected-route.tsx";
import Toaster from "./components/ui/toaster.tsx";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import { ErrorBoundary } from "./components/error-boundary.tsx";

// # hooks
import { AuthProvider } from "./modules/auth/hooks/use-auth.tsx";

// # libs
import { getAccessToken, refreshAccessToken } from "./lib/auth.ts";
import { setBaseUrl, getBaseUrl, setAuthTokenGetter } from "./lib/api-config.ts";
import { initAutoSync } from "./lib/sync-engine.ts";

import React from "react";
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes caching
    },
  },
});

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

        <Route path="/overview">
          {() => (
            <ProtectedRoute>
              <AppShell>
                <OverviewPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>

        <Route path="/ticketing">
          {() => (
            <ProtectedRoute
              roles={["TICKETER", "SYSTEM_ADMIN", "STATION_CONTROLLER"]}
            >
              <AppShell>
                <TicketIssuePage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>

        <Route path="/ticketing/issue">
          {() => (
            <ProtectedRoute
              roles={["TICKETER", "SYSTEM_ADMIN", "STATION_CONTROLLER"]}
            >
              <AppShell>
                <TicketIssuePage />
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

        <Route path="/dispatch">
          {() => (
            <ProtectedRoute
              roles={["AGENT", "SYSTEM_ADMIN", "STATION_CONTROLLER"]}
            >
              <AppShell>
                <DispatchPage />
              </AppShell>
            </ProtectedRoute>
          )}
        </Route>

        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}


function App() {
  // Wire auth token getter into the generated API client
  useEffect(() => {
	let baseUrl = getBaseUrl(); // Ensure base URL is set
    setBaseUrl( "http://localhost:8000");
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
