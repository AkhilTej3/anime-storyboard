import { Link, useLocation } from "wouter";
import { ArrowLeft, Gauge, TriangleAlert, CircleCheck, CircleX, Flame, CircleDashed } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { GlowCard } from "@/components/GlowCard";
import { useJob } from "@/hooks/use-jobs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const job = useJob(id);
  const [, setLocation] = useLocation();

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-in-up">
        <SectionHeader
          eyebrow="Job"
          title={`Generation job #${id}`}
          description="Status, progress, and prompt metadata — the full trace for this generation."
          data-testid="job-detail-header"
          right={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => setLocation("/jobs")}
                data-testid="job-detail-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => job.refetch()}
                data-testid="job-detail-refresh"
              >
                Refresh
              </Button>
            </div>
          }
        />

        <GlowCard className="p-4 sm:p-6" data-testid="job-detail-card">
          {job.isLoading ? (
            <div className="space-y-3" data-testid="job-detail-loading">
              <Skeleton className="h-8 w-48 rounded-xl" />
              <Skeleton className="h-24 w-full rounded-2xl" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            </div>
          ) : job.isError ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm" data-testid="job-detail-error">
              <div className="font-semibold">Couldn’t load job</div>
              <div className="mt-1 text-muted-foreground">
                {job.error instanceof Error ? job.error.message : "Unknown error"}
              </div>
              <div className="mt-3">
                <Link
                  href="/jobs"
                  className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold bg-card/70 border border-border/70 hover:bg-card transition"
                  data-testid="job-detail-error-backlink"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Jobs
                </Link>
              </div>
            </div>
          ) : !job.data ? (
            <div className="rounded-2xl border border-border/70 bg-card/60 p-8 text-center" data-testid="job-detail-notfound">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/12 text-accent">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div className="mt-3 text-base font-semibold">Job not found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                It may have been deleted or never existed.
              </div>
            </div>
          ) : (
            <div className="space-y-6" data-testid="job-detail-content">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <Gauge className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <div className="mt-0.5">
                      <StatusPill status={job.data.status} progress={job.data.progress} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    data-testid="job-detail-open-studio"
                    onClick={() => setLocation("/")}
                  >
                    Generate again
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Prompt
                </div>
                <div className="mt-2 text-sm leading-relaxed" data-testid="job-detail-prompt">
                  {job.data.prompt}
                </div>

                {job.data.negativePrompt ? (
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Negative prompt
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground leading-relaxed" data-testid="job-detail-negative">
                      {job.data.negativePrompt}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Meta label="Style preset" value={job.data.stylePreset ?? "—"} testId="job-detail-style" />
                <Meta label="Size" value={job.data.size ?? "—"} testId="job-detail-size" />
                <Meta label="Seed" value={job.data.seed ?? "—"} testId="job-detail-seed" />
                <Meta label="Created" value={formatDate(job.data.createdAt)} testId="job-detail-created" />
              </div>

              {job.data.error ? (
                <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm" data-testid="job-detail-errorbox">
                  <div className="font-semibold text-destructive">Error</div>
                  <div className="mt-1 text-muted-foreground">{job.data.error}</div>
                </div>
              ) : null}
            </div>
          )}
        </GlowCard>
      </div>
    </AppShell>
  );
}

function Meta({ label, value, testId }: { label: string; value: any; testId: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold" data-testid={testId}>
        {String(value)}
      </div>
    </div>
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
      ? { icon: CircleCheck, label: "Succeeded", cls: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
      : { icon: CircleX, label: "Failed", cls: "bg-destructive/12 text-destructive border-destructive/20" };

  const Icon = cfg.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border",
        cfg.cls
      )}
      data-testid={`job-detail-status-${status}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {cfg.label}
    </span>
  );
}
