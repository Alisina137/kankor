import type { SupportedLocale } from "@kankor/config";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import { apiRequest } from "../lib/api";
import { clearStoredSession, getStoredSession, setStoredSession } from "../lib/session-storage";
import { useLocale } from "./locale-provider";

export interface StudentUser {
  id: string;
  email: string;
  preferredLanguage: SupportedLocale;
  targetExamYear: number | null;
  preparationLevel: string | null;
  onboardingCompleted: boolean;
}

interface AuthPayload {
  token: string;
  user: StudentUser;
}

interface AuthContextValue {
  user: StudentUser | null;
  token: string | null;
  loading: boolean;
  register: (email: string, password: string) => Promise<StudentUser>;
  login: (email: string, password: string) => Promise<StudentUser>;
  logout: () => Promise<void>;
  completeOnboarding: (input: {
    preferredLanguage: SupportedLocale;
    targetExamYear: number;
    preparationLevel?: string | null;
  }) => Promise<StudentUser>;
  requestRecovery: (email: string) => Promise<{ accepted: boolean; developmentToken?: string }>;
  resetPassword: (token: string, password: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<StudentUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { setLocale } = useLocale();

  const applyPayload = useCallback(async (payload: AuthPayload) => {
    setToken(payload.token);
    setUser(payload.user);
    setLocale(payload.user.preferredLanguage);
    await setStoredSession(payload.token);
    return payload.user;
  }, [setLocale]);

  useEffect(() => {
    let active = true;

    void (async () => {
      const stored = await getStoredSession();
      if (!stored) {
        if (active) setLoading(false);
        return;
      }

      try {
        const result = await apiRequest<{ user: StudentUser }>("/auth/me", {}, stored);
        if (active) {
          setToken(stored);
          setUser(result.user);
          setLocale(result.user.preferredLanguage);
        }
      } catch {
        await clearStoredSession();
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, [setLocale]);

  const register = useCallback(async (email: string, password: string) => {
    const payload = await apiRequest<AuthPayload>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    return applyPayload(payload);
  }, [applyPayload]);

  const login = useCallback(async (email: string, password: string) => {
    const payload = await apiRequest<AuthPayload>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    return applyPayload(payload);
  }, [applyPayload]);

  const logout = useCallback(async () => {
    try {
      if (token) await apiRequest<void>("/auth/logout", { method: "POST" }, token);
    } finally {
      setToken(null);
      setUser(null);
      await clearStoredSession();
    }
  }, [token]);

  const completeOnboarding = useCallback(async (input: {
    preferredLanguage: SupportedLocale;
    targetExamYear: number;
    preparationLevel?: string | null;
  }) => {
    if (!token) throw new Error("unauthorized");
    const result = await apiRequest<{ user: StudentUser }>("/auth/onboarding", {
      method: "PATCH",
      body: JSON.stringify(input)
    }, token);
    setUser(result.user);
    setLocale(result.user.preferredLanguage);
    return result.user;
  }, [token, setLocale]);

  const requestRecovery = useCallback((email: string) =>
    apiRequest<{ accepted: boolean; developmentToken?: string }>("/auth/recovery", {
      method: "POST",
      body: JSON.stringify({ email })
    }), []);

  const resetPassword = useCallback(async (resetToken: string, password: string) => {
    await apiRequest("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token: resetToken, password })
    });
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!token) return;
    await apiRequest<void>("/auth/account", { method: "DELETE" }, token);
    setToken(null);
    setUser(null);
    await clearStoredSession();
  }, [token]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    loading,
    register,
    login,
    logout,
    completeOnboarding,
    requestRecovery,
    resetPassword,
    deleteAccount
  }), [
    user,
    token,
    loading,
    register,
    login,
    logout,
    completeOnboarding,
    requestRecovery,
    resetPassword,
    deleteAccount
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
