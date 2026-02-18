"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { setSessionExpiredHandler } from "@/shared/lib/api/client";
import * as authApi from "@/shared/lib/api/auth";
import { ROUTES } from "@/shared/lib/constants";
import type { ImpersonationInfo, Session, User } from "@/shared/lib/types";

interface AuthContextValue {
  user: User | null;
  impersonation: ImpersonationInfo | null;
  sessions: Session[];
  isLoading: boolean;
  isChecked: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_STORAGE_KEYS = ["refreshToken", "token", "user"] as const;

/** Remove any auth data from localStorage. We use HttpOnly cookies for tokens and React state for user. */
function clearAuthFromLocalStorage() {
  if (typeof window === "undefined") return;
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationInfo | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    clearAuthFromLocalStorage();
  }, []);

  const handleSessionExpired = useCallback(() => {
    setUser(null);

    // Don't force-redirect away from public auth pages (sign-in, register,
    // reset-password) or the public candidate onboarding link from preboarding emails.
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const publicPaths = [
        ROUTES.signIn.replace(/\/$/, ""),
        ROUTES.register.replace(/\/$/, ""),
        ROUTES.resetPassword.replace(/\/$/, ""),
        "/reset-password",
        "/candidate-onboard",
      ];
      const normalized = path.replace(/\/$/, "") || "/";
      if (publicPaths.includes(normalized)) {
        return;
      }
    }

    router.push(ROUTES.signIn);
  }, [router]);

  useEffect(() => {
    setSessionExpiredHandler(handleSessionExpired);
    return () => setSessionExpiredHandler(() => {});
  }, [handleSessionExpired]);

  const checkAuth = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      if (me) {
        setUser(me.user ?? null);
        setImpersonation(me.impersonation ?? null);
        setSessions(me.sessions ?? []);
      } else {
        setUser(null);
        setImpersonation(null);
        setSessions([]);
      }
    } catch {
      setUser(null);
      setImpersonation(null);
      setSessions([]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.getMe();
        if (!cancelled && me) {
          setUser(me.user ?? null);
          setImpersonation(me.impersonation ?? null);
          setSessions(me.sessions ?? []);
        } else if (!cancelled) {
          setUser(null);
          setImpersonation(null);
          setSessions([]);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setImpersonation(null);
          setSessions([]);
        }
      } finally {
        if (!cancelled) setIsChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const res = await authApi.login({ email, password });
        setUser(res.user);
        router.push(ROUTES.defaultAfterLogin);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setImpersonation(null);
      setSessions([]);
      clearAuthFromLocalStorage();
      setIsLoading(false);
      router.push(ROUTES.signIn);
    }
  }, [router]);

  const startImpersonation = useCallback(
    async (userId: string) => {
      setIsLoading(true);
      try {
        const res = await authApi.impersonate(userId);
        setUser(res.user);
        setImpersonation(res.impersonation);
        router.push(ROUTES.defaultAfterLogin);
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  const stopImpersonationAction = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await authApi.stopImpersonation();
      setUser(res.user);
      setImpersonation(null);
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      impersonation,
      sessions,
      isLoading,
      isChecked,
      login,
      logout,
      checkAuth,
      startImpersonation,
      stopImpersonation: stopImpersonationAction,
    }),
    [user, impersonation, sessions, isLoading, isChecked, login, logout, checkAuth, startImpersonation, stopImpersonationAction]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
