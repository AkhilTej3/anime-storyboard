import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

function parseWithLogging<T>(schema: { safeParse: (data: unknown) => any }, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data as T;
}

export function useAssets() {
  return useQuery({
    queryKey: [api.assets.list.path],
    queryFn: async () => {
      const res = await fetch(api.assets.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch assets");
      return parseWithLogging<typeof api.assets.list.responses[200]>(
        api.assets.list.responses[200],
        await res.json(),
        "assets.list"
      );
    },
  });
}

export function useAsset(id: number) {
  return useQuery({
    queryKey: [api.assets.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.assets.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch asset");
      return parseWithLogging<typeof api.assets.get.responses[200]>(
        api.assets.get.responses[200],
        await res.json(),
        "assets.get"
      );
    },
    enabled: Number.isFinite(id),
  });
}

export function useLatestRendition(assetId: number) {
  return useQuery({
    queryKey: [api.assets.renditions.getLatest.path, assetId],
    queryFn: async () => {
      const url = buildUrl(api.assets.renditions.getLatest.path, { id: assetId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch rendition");
      return parseWithLogging<typeof api.assets.renditions.getLatest.responses[200]>(
        api.assets.renditions.getLatest.responses[200],
        await res.json(),
        "assets.renditions.getLatest"
      );
    },
    enabled: Number.isFinite(assetId),
  });
}

/**
 * Convenience mutation to invalidate assets + rendition queries
 * (useful after generation succeeds).
 */
export function useInvalidateAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => true,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.assets.list.path] });
    },
  });
}
