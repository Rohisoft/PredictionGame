import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError, AUTH_EXPIRED_EVENT } from "@/lib/apiClient";

interface AuthUser {
  id: string;
  username: string;
  mustChangePassword: boolean;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (params: {
    username: string;
    password: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  changePassword: (params: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<{ error: string | null }>;
  sendPasswordReset: (username: string) => Promise<{ error: string | null }>;
  resetPassword: (token: string, password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function errorMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Something went wrong";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCurrentUser = useCallback(async () => {
    try {
      const profile = await api.get<{ id: string; username: string; must_change_password: boolean }>(
        "/profile",
      );
      setUser({ id: profile.id, username: profile.username, mustChangePassword: profile.must_change_password });
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser().finally(() => setLoading(false));

    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [loadCurrentUser]);

  const value: AuthContextValue = {
    user,
    loading,
    async signIn({ username, password }) {
      try {
        await api.post("/auth/login", { username, password });
        await loadCurrentUser();
        return { error: null };
      } catch (err) {
        return { error: errorMessage(err) };
      }
    },
    async signOut() {
      try {
        await api.post("/auth/logout");
      } finally {
        setUser(null);
      }
    },
    async changePassword({ currentPassword, newPassword }) {
      try {
        await api.post("/auth/change-password", { currentPassword, newPassword });
        setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
        return { error: null };
      } catch (err) {
        return { error: errorMessage(err) };
      }
    },
    async sendPasswordReset(username) {
      try {
        await api.post("/auth/forgot-password", { username });
        return { error: null };
      } catch (err) {
        return { error: errorMessage(err) };
      }
    },
    async resetPassword(token, password) {
      try {
        await api.post("/auth/reset-password", { token, password });
        return { error: null };
      } catch (err) {
        return { error: errorMessage(err) };
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
