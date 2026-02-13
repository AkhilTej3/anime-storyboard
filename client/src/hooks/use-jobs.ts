import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

function parseWithLogging<T>(schema: { safeParse: (data: unknown) => any }, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data as T;
}

export function useJobs() {
  return useQuery({
    queryKey: [api.jobs.list.path],
    queryFn: async () => {
      const res = await fetch(api.jobs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return parseWithLogging<typeof api.jobs.list.responses[200]>(
        api.jobs.list.responses[200],
        await res.json(),
        "jobs.list"
      );
    },
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: [api.jobs.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.jobs.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch job");
      return parseWithLogging<typeof api.jobs.get.responses[200]>(
        api.jobs.get.responses[200],
        await res.json(),
        "jobs.get"
      );
    },
    enabled: Number.isFinite(id),
  });
}
