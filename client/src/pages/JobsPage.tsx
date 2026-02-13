import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Gauge, Search, CircleDashed, CircleCheck, CircleX, Flame, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { GlowCard } from "@/components/GlowCard";
import { useJobs } from "@/hooks/use-jobs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function JobsPage() {
  const jobs = useJobs();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = jobs.data ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((j) => (j.prompt ?? "").toLowerCase().includes(query));
  }, [jobs.data, q]);

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-in-up">
        <SectionHeader
          eyebrow="Pipeline"
          title="Jobs"
          description="Track generation status, progress, and errors. Jobs are the audit trail of your creative runs."
          data-testid="jobs-header"
          right={
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={() => jobs.refetch()}
              data-testid="jobs-refresh"
            >
              Refresh
            </Button>
          }
        />

        <GlowCard className="p-4 sm:p-6" data-testid="jobs-controls">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Search prompts</div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by prompt…"
                  className="pl-9 rounded-2xl bg-background/60 border-border/70 focus-ring"
                  data-testid="jobs-search"
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground" data-testid="jobs-count">
              {jobs.isLoading ? "Loading…" : `${filtered.length} jobs`}
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-0 overflow-hidden" data-testid="jobs-table-card">
          {jobs.isLoading ? (
            <div className="p-6 space-y-3" data-testid="jobs-loading">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-xl" />
              ))}
            </div>
          ) : jobs.isError ? (
            <div className="p-6" data-testid="jobs-error">
              <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm">
                <div className="font-semibold">Couldn’t load jobs</div>
                <div className="mt-1 text-muted-foreground">
                  {jobs.error instanceof Error ? jobs.error.message : "Unknown error"}
                </div>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center" data-testid="jobs-empty">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
                <Gauge className="h-5 w-5" />
              </div>
              <div className="mt-3 text-base font-semibold">No jobs found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Generate an image in Studio to create a job record.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-border/60" data-testid="jobs-list">
              {filtered.map((j) => (
                <Link
                  key={j.id}
                  href={`/jobs/${j.id}`}
                  className={cn(
                    "group grid grid-cols-1 md:grid-cols-[240px_1fr_140px_28px] gap-3",
                    "px-4 sm:px-6 py-4 transition-all duration-200",
                    "hover:bg-card/50"
                  )}
                  data-testid={`jobs-row-${j.id}`}
                >
                  <div className="flex items-center gap-2">
                    <StatusPill status={j.status} progress={j.progress} />
                    <div className="text-sm font-semibold">#{j.id}</div>
                  </div>

                  <div className="min-w-0">
                    <div className="line-clamp-2 text-sm text-foreground/90">
                      {j.prompt}
                    </div>
                    {j.error ? (
                      <div className="mt-1 text-xs text-destructive">
                        {j.error}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-xs text-muted-foreground md:text-right">
                    {formatDate(j.createdAt)}
                  </div>

                  <div className="hidden md:flex items-center justify-end text-muted-foreground group-hover:text-foreground transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </Link>
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

function StatusPill({ status, progress }: { status: string; progress: number }) {
  const cfg =
    status === "queued"
      ? { icon: CircleDashed, label: "Queued", cls: "bg-muted text-muted-foreground border-border/70" }
      : status === "running"
      ? { icon: Flame, label: `${progress ?? 0}%`, cls: "bg-primary/12 text-primary border-primary/20" }
      : status === "succeeded"
      ? { icon: CircleCheck, label: "Done", cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
      : { icon: CircleX, label: "Failed", cls: "bg-destructive/12 text-destructive border-destructive/20" };

  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
        cfg.cls
      )}
      data-testid={`job-status-${status}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}
