import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, Loader2, Sparkles, Bot, UserRound } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { GlowCard } from "@/components/GlowCard";
import { useConversation, useSendMessageStream } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type UiMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
  streaming?: boolean;
};

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { toast } = useToast();

  const convo = useConversation(id);
  const send = useSendMessageStream();

  const [draft, setDraft] = useState("");
  const [uiMessages, setUiMessages] = useState<UiMsg[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const title = useMemo(() => {
    const c = convo.data?.conversation;
    return c?.title?.trim() ? c.title : `Conversation #${id}`;
  }, [convo.data?.conversation, id]);

  useEffect(() => {
    if (!convo.data) return;
    const serverMsgs = convo.data.messages ?? [];
    const mapped: UiMsg[] = serverMsgs.map((m: any) => ({
      id: String(m.id),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    }));
    setUiMessages(mapped);
  }, [convo.data]);

  useEffect(() => {
    // Auto-scroll on new messages
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [uiMessages.length]);

  async function onSend() {
    const content = draft.trim();
    if (!content || send.isPending) return;

    setDraft("");

    // Add user message immediately + create a placeholder assistant message that streams
    const userId = `u-${Date.now()}`;
    const assistantId = `a-${Date.now()}`;

    setUiMessages((prev) => [
      ...prev,
      { id: userId, role: "user", content },
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      await send.mutateAsync({
        conversationId: id,
        content,
        onDelta: (delta) => {
          setUiMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: (m.content ?? "") + delta } : m
            )
          );
        },
        onDone: () => {
          setUiMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
          );
        },
      });
    } catch (e) {
      setUiMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m))
      );
      toast({
        title: "Send failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-in-up">
        <SectionHeader
          eyebrow="Conversation"
          title={title}
          description="Ask for prompt variants, critique, or style direction. Responses stream in real time."
          data-testid="conversation-detail-header"
          right={
            <div className="flex items-center gap-2">
              <Link
                href="/conversations"
                className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold bg-card/70 border border-border/70 hover:bg-card hover:-translate-y-[1px] transition-all"
                data-testid="conversation-detail-backlink"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => convo.refetch()}
                data-testid="conversation-detail-refresh"
              >
                Refresh
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 lg:gap-8">
          <GlowCard className="p-0 overflow-hidden" data-testid="conversation-chat-card">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Streaming chat
              </div>
              <div className="text-xs text-muted-foreground" data-testid="conversation-chat-status">
                {send.isPending ? "Generating…" : "Ready"}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="h-[56vh] xl:h-[62vh] overflow-auto px-4 sm:px-6 py-5 space-y-4"
              data-testid="conversation-messages"
            >
              {convo.isLoading ? (
                <div className="space-y-3" data-testid="conversation-loading">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 rounded-2xl" />
                  ))}
                </div>
              ) : convo.isError ? (
                <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm" data-testid="conversation-error">
                  <div className="font-semibold">Couldn’t load conversation</div>
                  <div className="mt-1 text-muted-foreground">
                    {convo.error instanceof Error ? convo.error.message : "Unknown error"}
                  </div>
                </div>
              ) : !convo.data ? (
                <div className="rounded-2xl border border-border/70 bg-card/60 p-8 text-center" data-testid="conversation-notfound">
                  Conversation not found.
                </div>
              ) : uiMessages.length === 0 ? (
                <div className="rounded-2xl border border-border/70 bg-card/60 p-8 text-center" data-testid="conversation-empty">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-base font-semibold">Start with a prompt idea</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Example: “Give me 10 variations of a minimal product photo prompt.”
                  </div>
                </div>
              ) : (
                uiMessages.map((m) => (
                  <MessageBubble key={m.id} msg={m} />
                ))
              )}
            </div>

            <div className="border-t border-border/60 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  placeholder="Ask for prompt variations, critique, or style direction…"
                  className="rounded-2xl bg-background/60 border-border/70 focus-ring"
                  data-testid="conversation-input"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void onSend();
                    }
                  }}
                />
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground" data-testid="conversation-input-hint">
                    Press <span className="font-semibold text-foreground/80">Ctrl/⌘ + Enter</span> to send.
                  </div>
                  <Button
                    className="rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    onClick={() => void onSend()}
                    disabled={!draft.trim() || send.isPending}
                    data-testid="conversation-send"
                  >
                    {send.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </GlowCard>

          <GlowCard className="p-4 sm:p-6" data-testid="conversation-sidecard">
            <div className="text-sm font-semibold">Prompt coaching</div>
            <div className="mt-2 text-sm text-muted-foreground leading-relaxed">
              Use chat to refine outputs. Try prompts like:
              <ul className="mt-3 space-y-2 list-disc pl-5">
                <li>“Turn this into a photoreal studio product shot.”</li>
                <li>“Give 5 negative prompt suggestions.”</li>
                <li>“Rewrite for a pixel art style, 256×256.”</li>
                <li>“Suggest 3 different art directions.”</li>
              </ul>
            </div>

            <Button
              variant="secondary"
              className="mt-5 w-full rounded-2xl"
              data-testid="conversation-open-studio"
              onClick={() => {
                window.history.pushState(null, "", "/");
                window.dispatchEvent(new PopStateEvent("popstate"));
              }}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Back to Studio
            </Button>
          </GlowCard>
        </div>
      </div>
    </AppShell>
  );
}

function MessageBubble({ msg }: { msg: UiMsg }) {
  const isUser = msg.role === "user";
  return (
    <div
      className={cn("flex items-end gap-3", isUser ? "justify-end" : "justify-start")}
      data-testid={`message-${msg.id}`}
    >
      {!isUser ? (
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/12 text-primary border border-primary/20">
          <Bot className="h-4.5 w-4.5" />
        </div>
      ) : null}

      <div
        className={cn(
          "max-w-[86%] rounded-2xl border px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-gradient-to-br from-primary/18 to-primary/6 border-primary/20"
            : "bg-card/70 border-border/70"
        )}
        data-testid={`message-bubble-${msg.id}`}
      >
        <div className="whitespace-pre-wrap break-words">
          {msg.content || (msg.streaming ? "…" : "")}
        </div>
        {msg.streaming ? (
          <div className="mt-2 text-[11px] text-muted-foreground" data-testid={`message-streaming-${msg.id}`}>
            streaming…
          </div>
        ) : null}
      </div>

      {isUser ? (
        <div className="grid h-9 w-9 place-items-center rounded-2xl bg-accent/12 text-accent border border-accent/20">
          <UserRound className="h-4.5 w-4.5" />
        </div>
      ) : null}
    </div>
  );
}
