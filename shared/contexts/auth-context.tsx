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
  /** Resolved permissions from user's roleIds (raw domain format, e.g. ats.jobs:view,create). */
  permissions: string[];
  roleNames: string[];
  isAdministrator: boolean;
  permissionsLoaded: boolean;
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

const EMPTY_PERMISSIONS = { permissions: [] as string[], roleNames: [] as string[], isAdministrator: false };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [impersonation, setImpersonation] = useState<ImpersonationInfo | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);
  const [isAdministrator, setIsAdministrator] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const router = useRouter();

  const fetchAndSetPermissions = useCallback(async () => {
    try {
      const perm = await authApi.getMyPermissions();
      if (perm) {
        setPermissions(perm.permissions ?? []);
        setRoleNames(perm.roleNames ?? []);
        setIsAdministrator(perm.isAdministrator ?? false);
      } else {
        setPermissions(EMPTY_PERMISSIONS.permissions);
        setRoleNames(EMPTY_PERMISSIONS.roleNames);
        setIsAdministrator(false);
      }
    } catch {
      setPermissions(EMPTY_PERMISSIONS.permissions);
      setRoleNames(EMPTY_PERMISSIONS.roleNames);
      setIsAdministrator(false);
    } finally {
      setPermissionsLoaded(true);
    }
  }, []);

  useEffect(() => {
    clearAuthFromLocalStorage();
  }, []);

  const handleSessionExpired = useCallback(() => {
    setUser(null);
    setPermissions(EMPTY_PERMISSIONS.permissions);
    setRoleNames(EMPTY_PERMISSIONS.roleNames);
    setIsAdministrator(false);
    setPermissionsLoaded(true);

    // Don't force-redirect away from public auth pages (sign-in, register,
    // reset-password), public candidate onboarding, public job portal, or public meeting join (no login).
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      const normalized = path.replace(/\/$/, "") || "/";
      const publicPaths = [
        ROUTES.signIn.replace(/\/$/, ""),
        ROUTES.register.replace(/\/$/, ""),
        ROUTES.resetPassword.replace(/\/$/, ""),
        "/reset-password",
        "/candidate-onboard",
      ];
      if (publicPaths.includes(normalized)) {
        return;
      }
      // Public meeting join: /join/room/[roomId] — no login required
      if (normalized.startsWith("/join/room")) {
        return;
      }
      // Public job portal: /public-job and /public-job/[jobId] — no login required
      if (normalized.startsWith("/public-job")) {
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
        setPermissionsLoaded(false);
        await fetchAndSetPermissions();
      } else {
        setUser(null);
        setImpersonation(null);
        setSessions([]);
        setPermissions(EMPTY_PERMISSIONS.permissions);
        setRoleNames(EMPTY_PERMISSIONS.roleNames);
        setIsAdministrator(false);
        setPermissionsLoaded(true);
      }
    } catch {
      setUser(null);
      setImpersonation(null);
      setSessions([]);
      setPermissions(EMPTY_PERMISSIONS.permissions);
      setRoleNames(EMPTY_PERMISSIONS.roleNames);
      setIsAdministrator(false);
      setPermissionsLoaded(true);
    }
  }, [fetchAndSetPermissions]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.getMe();
        if (!cancelled && me) {
          setUser(me.user ?? null);
          setImpersonation(me.impersonation ?? null);
          setSessions(me.sessions ?? []);
          setPermissionsLoaded(false);
          const perm = await authApi.getMyPermissions();
          if (!cancelled && perm) {
            setPermissions(perm.permissions ?? []);
            setRoleNames(perm.roleNames ?? []);
            setIsAdministrator(perm.isAdministrator ?? false);
          } else if (!cancelled) {
            setPermissions(EMPTY_PERMISSIONS.permissions);
            setRoleNames(EMPTY_PERMISSIONS.roleNames);
            setIsAdministrator(false);
          }
        } else if (!cancelled) {
          setUser(null);
          setImpersonation(null);
          setSessions([]);
          setPermissions(EMPTY_PERMISSIONS.permissions);
          setRoleNames(EMPTY_PERMISSIONS.roleNames);
          setIsAdministrator(false);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
          setImpersonation(null);
          setSessions([]);
          setPermissions(EMPTY_PERMISSIONS.permissions);
          setRoleNames(EMPTY_PERMISSIONS.roleNames);
          setIsAdministrator(false);
        }
      } finally {
        if (!cancelled) {
          setPermissionsLoaded(true);
          setIsChecked(true);
        }
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
        setPermissionsLoaded(false);
        const perm = await authApi.getMyPermissions();
        if (perm) {
          setPermissions(perm.permissions ?? []);
          setRoleNames(perm.roleNames ?? []);
          setIsAdministrator(perm.isAdministrator ?? false);
        } else {
          setPermissions(EMPTY_PERMISSIONS.permissions);
          setRoleNames(EMPTY_PERMISSIONS.roleNames);
          setIsAdministrator(false);
        }
        setPermissionsLoaded(true);
        // Candidates (role 'user' from share-candidate-form) go to their profile on first login
        const isCandidate = res.user?.role === "user";
        router.push(isCandidate ? ROUTES.candidateProfile : ROUTES.defaultAfterLogin);
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
      setPermissions(EMPTY_PERMISSIONS.permissions);
      setRoleNames(EMPTY_PERMISSIONS.roleNames);
      setIsAdministrator(false);
      setPermissionsLoaded(true);
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
        setPermissionsLoaded(false);
        const perm = await authApi.getMyPermissions();
        if (perm) {
          setPermissions(perm.permissions ?? []);
          setRoleNames(perm.roleNames ?? []);
          setIsAdministrator(perm.isAdministrator ?? false);
        } else {
          setPermissions(EMPTY_PERMISSIONS.permissions);
          setRoleNames(EMPTY_PERMISSIONS.roleNames);
          setIsAdministrator(false);
        }
        setPermissionsLoaded(true);
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
      setPermissionsLoaded(false);
      const perm = await authApi.getMyPermissions();
      if (perm) {
        setPermissions(perm.permissions ?? []);
        setRoleNames(perm.roleNames ?? []);
        setIsAdministrator(perm.isAdministrator ?? false);
      } else {
        setPermissions(EMPTY_PERMISSIONS.permissions);
        setRoleNames(EMPTY_PERMISSIONS.roleNames);
        setIsAdministrator(false);
      }
      setPermissionsLoaded(true);
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
      permissions,
      roleNames,
      isAdministrator,
      permissionsLoaded,
      isLoading,
      isChecked,
      login,
      logout,
      checkAuth,
      startImpersonation,
      stopImpersonation: stopImpersonationAction,
    }),
    [
      user,
      impersonation,
      sessions,
      permissions,
      roleNames,
      isAdministrator,
      permissionsLoaded,
      isLoading,
      isChecked,
      login,
      logout,
      checkAuth,
      startImpersonation,
      stopImpersonationAction,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
