import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  login as apiLogin,
  logout as apiLogout,
  refreshAccessToken,
  getCurrentUser,
  setUser,
  type LoginRequest,
  type LoginResponse,
} from "@/lib/auth";

interface AuthContextValue {
  user: LoginResponse["user"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<LoginResponse["user"] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Try to restore session on mount
  useEffect(() => {
    async function restore() {
      const ok = await refreshAccessToken();
      if (ok) {
        setUserState(getCurrentUser());
      }
      setIsLoading(false);
    }
    restore();
  }, []);

  const login = useCallback(async (credentials: LoginRequest) => {
    const data = await apiLogin(credentials);
    setUserState(data.user);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUserState(null);
  }, []);

  const hasRole = useCallback(
    (...roles: string[]) => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
