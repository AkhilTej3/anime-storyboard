import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { MessageCircle, Plus, Trash2, ArrowRight, Search, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { GlowCard } from "@/components/GlowCard";
import { useConversations, useCreateConversation, useDeleteConversation } from "@/hooks/use-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ConversationsPage() {
  const { toast } = useToast();
  const conversations = useConversations();
  const createConv = useCreateConversation();
  const delConv = useDeleteConversation();
  const [, setLocation] = useLocation();

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = conversations.data ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((c) => (c.title ?? "").toLowerCase().includes(query));
  }, [conversations.data, q]);

  async function onCreate() {
    try {
      const created = await createConv.mutateAsync({ title: "New conversation" });
      toast({ title: "Created", description: "Conversation ready." });
      setLocation(`/conversations/${created.id}`);
    } catch (e) {
      toast({
        title: "Create failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function onDelete(id: number) {
    try {
      await delConv.mutateAsync(id);
      toast({ title: "Deleted", description: "Conversation removed." });
    } catch (e) {
      toast({
        title: "Delete failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-in-up">
        <SectionHeader
          eyebrow="Chat"
          title="Conversations"
          description="A lightweight, streaming chat to refine prompts, styles, and concepts. Keep it simple: ask for alternatives, variations, or critique."
          data-testid="conversations-header"
          right={
            <Button
              className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
              onClick={onCreate}
              disabled={createConv.isPending}
              data-testid="conversations-create"
            >
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
          }
        />

        <GlowCard className="p-4 sm:p-6" data-testid="conversations-controls">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Search</div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search titles…"
                  className="pl-9 rounded-2xl bg-background/60 border-border/70 focus-ring"
                  data-testid="conversations-search"
                />
              </div>
            </div>
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={() => conversations.refetch()}
              data-testid="conversations-refresh"
            >
              Refresh
            </Button>
          </div>
        </GlowCard>

        <GlowCard className="p-0 overflow-hidden" data-testid="conversations-list-card">
          {conversations.isLoading ? (
            <div className="p-6 space-y-3" data-testid="conversations-loading">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </div>
          ) : conversations.isError ? (
            <div className="p-6" data-testid="conversations-error">
              <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm">
                <div className="font-semibold">Couldn’t load conversations</div>
                <div className="mt-1 text-muted-foreground">
                  {conversations.error instanceof Error ? conversations.error.message : "Unknown error"}
                </div>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center" data-testid="conversations-empty">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div className="mt-3 text-base font-semibold">No conversations yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create one to brainstorm prompts or request variations.
              </div>
              <Button
                className="mt-5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 transition-all"
                onClick={onCreate}
                data-testid="conversations-empty-create"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Start a conversation
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/60" data-testid="conversations-list">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  className={cn("group flex items-center gap-3 px-4 sm:px-6 py-4 hover:bg-card/50 transition")}
                  data-testid={`conversations-row-${c.id}`}
                >
                  <Link
                    href={`/conversations/${c.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3"
                    data-testid={`conversations-open-${c.id}`}
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent/12 text-accent border border-accent/20">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{c.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {formatDate(c.createdAt)}
                      </div>
                    </div>
                    <div className="ml-auto hidden sm:flex items-center text-muted-foreground group-hover:text-foreground transition-colors">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </Link>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-xl hover:bg-destructive/10 hover:text-destructive"
                        data-testid={`conversations-delete-${c.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the conversation and its messages. This action can’t be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="conversations-delete-cancel">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => onDelete(c.id)}
                          data-testid="conversations-delete-confirm"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </GlowCard>
      </div>
    </AppShell>
  );
}

function formatDate(v: any) {
  try {
    const d = typeof v === "string" ? new Date(v) : (v as Date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleString();
  } catch {
    return "—";
  }
}
