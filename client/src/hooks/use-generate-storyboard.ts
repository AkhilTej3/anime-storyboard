import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

function parseWithLogging<T>(schema: { safeParse: (data: unknown) => any }, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data as T;
}

export function useGenerateStoryboard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: { script: string; sceneCount: number; stylePreset?: string; size?: "1024x1024" | "512x512" | "256x256" }) => {
      const validated = api.generate.storyboard.input.parse(input);
      const res = await fetch(api.generate.storyboard.path, {
        method: api.generate.storyboard.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(
            api.generate.storyboard.responses[400],
            await res.json(),
            "generate.storyboard.400"
          );
          throw new Error(err.message);
        }

        throw new Error("Failed to generate storyboard");
      }

      return parseWithLogging<typeof api.generate.storyboard.responses[201]>(
        api.generate.storyboard.responses[201],
        await res.json(),
        "generate.storyboard.201"
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.assets.list.path] });
      await qc.invalidateQueries({ queryKey: [api.jobs.list.path] });
    },
  });
}
