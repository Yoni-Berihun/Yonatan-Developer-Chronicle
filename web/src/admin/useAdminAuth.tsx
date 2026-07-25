import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "../lib/api";
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

  useEffect(() => {
    const onExpired = () => {
      queryClient.setQueryData(["admin", "me"], null);
      queryClient.removeQueries({ queryKey: ["admin"] });
    };
    window.addEventListener("yt:session-expired", onExpired);
    return () => window.removeEventListener("yt:session-expired", onExpired);
  }, [queryClient]);

  const loginMutation = useMutation({
    mutationFn: async (variables: { email: string; password: string }) => {
      const result = await api.post<{ admin: AdminProfile }>("/auth/login", variables);

      // Login JSON can succeed while the cookie fails to stick (wrong domain,
      // blocked storage). Confirm the session before treating the user as in.
      try {
        await api.get<{ admin: AdminProfile }>("/auth/me");
      } catch {
        throw new ApiError(
          401,
          "Signed in on the server, but the browser did not keep the session cookie. Use the site URL (not the API URL) and try again.",
        );
      }

      return result;
    },
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
        try {
          await logoutMutation.mutateAsync();
        } catch {
          // Even if the network call fails, clear local state so the UI exits.
          queryClient.setQueryData(["admin", "me"], null);
          queryClient.clear();
        }
      },
    }),
    [data, isLoading, loginMutation, logoutMutation, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAdminAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return context;
}
