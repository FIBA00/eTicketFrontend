import { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/use-auth";

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  withAuth?: boolean;
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {},
) {
  const { withAuth = true, ...renderOptions } = options;
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    let content = (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    if (withAuth) {
      content = <AuthProvider>{content}</AuthProvider>;
    }

    return content;
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}

// Mock auth context
export function mockAuthContext(overrides = {}) {
  return {
    user: {
      id: "test-user-id",
      username: "testuser",
      fullName: "Test User",
      role: "TICKETER",
      stationId: "test-station-id",
    },
    isLoading: false,
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
    hasRole: vi.fn((...roles: string[]) => roles.includes("TICKETER")),
    ...overrides,
  };
}
