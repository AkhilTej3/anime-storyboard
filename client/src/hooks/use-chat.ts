import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: { safeParse: (data: unknown) => any }, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data as T;
}

export function useConversations() {
  return useQuery({
    queryKey: [api.chat.conversations.list.path],
    queryFn: async () => {
      const res = await fetch(api.chat.conversations.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return parseWithLogging<typeof api.chat.conversations.list.responses[200]>(
        api.chat.conversations.list.responses[200],
        await res.json(),
        "chat.conversations.list"
      );
    },
  });
}

export function useConversation(id: number) {
  return useQuery({
    queryKey: [api.chat.conversations.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.chat.conversations.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation");
      return parseWithLogging<typeof api.chat.conversations.get.responses[200]>(
        api.chat.conversations.get.responses[200],
        await res.json(),
        "chat.conversations.get"
      );
    },
    enabled: Number.isFinite(id),
  });
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: z.infer<typeof api.chat.conversations.create.input>) => {
      const validated = api.chat.conversations.create.input.parse(input);
      const res = await fetch(api.chat.conversations.create.path, {
        method: api.chat.conversations.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });
      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(
            api.chat.conversations.create.responses[400],
            await res.json(),
            "chat.conversations.create.400"
          );
          throw new Error(err.message);
        }
        throw new Error("Failed to create conversation");
      }
      return parseWithLogging<typeof api.chat.conversations.create.responses[201]>(
        api.chat.conversations.create.responses[201],
        await res.json(),
        "chat.conversations.create.201"
      );
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.chat.conversations.list.path] });
    },
  });
}

export function useDeleteConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.chat.conversations.delete.path, { id });
      const res = await fetch(url, { method: api.chat.conversations.delete.method, credentials: "include" });
      if (res.status === 404) throw new Error("Conversation not found");
      if (!res.ok) throw new Error("Failed to delete conversation");
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: [api.chat.conversations.list.path] });
    },
  });
}

/**
 * POST /api/conversations/:id/messages returns SSE stream (text/event-stream).
 * We stream assistant message content progressively.
 */
const sseEventSchema = z
  .object({
    content: z.string().optional(),
    done: z.boolean().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export function useSendMessageStream() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      content,
      onDelta,
      onDone,
    }: {
      conversationId: number;
      content: string;
      onDelta: (delta: string) => void;
      onDone: () => void;
    }) => {
      const url = buildUrl(api.chat.conversations.messages.create.path, { id: conversationId });
      const validated = api.chat.conversations.messages.create.input.parse({ content });

      const res = await fetch(url, {
        method: api.chat.conversations.messages.create.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(
            api.chat.conversations.messages.create.responses[400],
            await res.json(),
            "chat.messages.create.400"
          );
          throw new Error(err.message);
        }
        throw new Error("Failed to send message");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE events separated by blank line; lines may be partial.
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const raw = line.slice(6);
            try {
              const parsed = sseEventSchema.parse(JSON.parse(raw));
              if (parsed.error) throw new Error(parsed.error);
              if (parsed.content) onDelta(parsed.content);
              if (parsed.done) onDone();
            } catch (e) {
              // tolerate partial JSON if server splits mid-object; keep going
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      return true;
    },
    onSuccess: async (_data, vars) => {
      // When stream finishes, refetch canonical messages from server.
      await qc.invalidateQueries({ queryKey: [api.chat.conversations.get.path, vars.conversationId] });
    },
  });
}
