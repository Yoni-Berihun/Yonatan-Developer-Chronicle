import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../../../lib/api";

/**
 * Every child-item editor does the same four things against a different path,
 * so the wiring lives here rather than being repeated per section type.
 */
export function useCrud(basePath: string, sectionId: string) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["admin", "section", sectionId] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "sections"] });
  };

  return {
    create: useMutation({
      mutationFn: (body: unknown) => api.post(basePath, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: unknown }) =>
        api.put(`${basePath}/${id}`, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.del(`${basePath}/${id}`),
      onSuccess: invalidate,
    }),
    reorder: useMutation({
      mutationFn: (ids: string[]) => api.post(`${basePath}/reorder`, { ids }),
      onSuccess: invalidate,
    }),
  };
}

export function moveInList<T extends { id: string }>(
  items: T[],
  index: number,
  delta: number,
): string[] | null {
  const target = index + delta;
  if (target < 0 || target >= items.length) return null;
  const ids = items.map((item) => item.id);
  const next = [...ids];
  const [moved] = next.splice(index, 1);
  next.splice(target, 0, moved!);
  return next;
}
