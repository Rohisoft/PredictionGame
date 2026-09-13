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
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signIn: (params: {
    email: string;
    password: string;
  }) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>;
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
      const profile = await api.get<{ id: string; email: string }>("/profile");
      setUser({ id: profile.id, email: profile.email });
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
    async signIn({ email, password }) {
      try {
        await api.post("/auth/login", { email, password });
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
    async sendPasswordReset(email) {
      try {
        await api.post("/auth/forgot-password", { email });
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
