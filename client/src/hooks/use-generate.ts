import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type GenerateImageInput } from "@shared/routes";

function parseWithLogging<T>(schema: { safeParse: (data: unknown) => any }, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data as T;
}

export function useGenerateImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GenerateImageInput) => {
      const validated = api.generate.image.input.parse(input);
      const res = await fetch(api.generate.image.path, {
        method: api.generate.image.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(
            api.generate.image.responses[400],
            await res.json(),
            "generate.image.400"
          );
          throw new Error(err.message);
        }
        throw new Error("Failed to generate image");
      }

      return parseWithLogging<typeof api.generate.image.responses[201]>(
        api.generate.image.responses[201],
        await res.json(),
        "generate.image.201"
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.assets.list.path] });
      await qc.invalidateQueries({ queryKey: [api.jobs.list.path] });
    },
  });
}
