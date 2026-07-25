import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { AdminProfile } from "../lib/types";

interface AuthValue {
  admin: AdminProfile | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: async () => {
      try {
        const result = await api.get<{ admin: AdminProfile }>("/auth/me");
        return result.admin;
      } catch {
        // A 401 here just means "not signed in", which is a normal state.
        return null;
      }
    },
    staleTime: 5 * 60_000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: (variables: { email: string; password: string }) =>
      api.post<{ admin: AdminProfile }>("/auth/login", variables),
    onSuccess: (result) => queryClient.setQueryData(["admin", "me"], result.admin),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post("/auth/logout"),
    onSuccess: () => {
      queryClient.setQueryData(["admin", "me"], null);
      queryClient.clear();
    },
  });

  const value = useMemo<AuthValue>(
    () => ({
      admin: data ?? null,
      isLoading,
      login: async (email, password) => {
        await loginMutation.mutateAsync({ email, password });
      },
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
    }),
    [data, isLoading, loginMutation, logoutMutation],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return context;
}
