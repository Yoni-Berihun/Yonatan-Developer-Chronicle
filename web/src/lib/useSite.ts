import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import type { SitePayload } from "./types";

export function useSite() {
  return useQuery({
    queryKey: ["site"],
    queryFn: () => api.get<SitePayload>("/public/site"),
    staleTime: 5 * 60_000,
  });
}
