import { useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Download, Copy, Sparkles, TriangleAlert } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { GlowCard } from "@/components/GlowCard";
import { useAsset, useLatestRendition } from "@/hooks/use-assets";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const asset = useAsset(id);
  const rendition = useLatestRendition(id);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const created = useMemo(() => {
    const v = asset.data?.createdAt;
    if (!v) return "";
    const d = typeof v === "string" ? new Date(v) : (v as any as Date);
    return isNaN(d.getTime()) ? "" : d.toLocaleString();
  }, [asset.data?.createdAt]);

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(asset.data?.prompt ?? "");
      toast({ title: "Copied", description: "Prompt copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard permission denied.", variant: "destructive" });
    }
  }

  function downloadPng() {
    const b64 = rendition.data?.dataBase64;
    if (!b64) {
      toast({ title: "No image data", description: "This asset has no rendition yet.", variant: "destructive" });
      return;
    }
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${b64}`;
    link.download = `asset-${id}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-in-up">
        <SectionHeader
          eyebrow="Asset"
          title={asset.data?.title?.trim() ? asset.data.title : `Asset #${id}`}
          description="Inspect the latest rendition, copy the prompt, or download as PNG."
          data-testid="asset-detail-header"
          right={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => setLocation("/assets")}
                data-testid="asset-detail-back"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={copyPrompt}
                data-testid="asset-detail-copy-prompt"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy prompt
              </Button>

              <Button
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all"
                onClick={downloadPng}
                data-testid="asset-detail-download"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PNG
              </Button>
            </div>
          }
        />

        <GlowCard className="p-4 sm:p-6" data-testid="asset-detail-card">
          {asset.isLoading ? (
            <div className="space-y-4" data-testid="asset-detail-loading">
              <Skeleton className="h-72 w-full rounded-2xl" />
              <Skeleton className="h-5 w-1/2 rounded-xl" />
              <Skeleton className="h-4 w-full rounded-xl" />
            </div>
          ) : asset.isError ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm" data-testid="asset-detail-error">
              <div className="font-semibold">Couldn’t load asset</div>
              <div className="mt-1 text-muted-foreground">
                {asset.error instanceof Error ? asset.error.message : "Unknown error"}
              </div>
              <div className="mt-3">
                <Link
                  href="/assets"
                  className="inline-flex items-center rounded-xl px-3 py-2 text-sm font-semibold bg-card/70 border border-border/70 hover:bg-card transition"
                  data-testid="asset-detail-error-backlink"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Return to Assets
                </Link>
              </div>
            </div>
          ) : !asset.data ? (
            <div className="rounded-2xl border border-border/70 bg-card/60 p-8 text-center" data-testid="asset-detail-notfound">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent/12 text-accent">
                <TriangleAlert className="h-5 w-5" />
              </div>
              <div className="mt-3 text-base font-semibold">Asset not found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                It may have been deleted or never existed.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-6">
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/50">
                {rendition.isLoading ? (
                  <Skeleton className="h-[420px] w-full" data-testid="asset-detail-rendition-loading" />
                ) : rendition.data?.dataBase64 ? (
                  <img
                    src={`data:image/png;base64,${rendition.data.dataBase64}`}
                    alt={asset.data.title ?? asset.data.prompt ?? `Asset ${id}`}
                    className="h-auto w-full object-cover"
                    data-testid="asset-detail-image"
                  />
                ) : (
                  <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground" data-testid="asset-detail-noimage">
                    No rendition available.
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Details
                  </div>

                  <dl className="mt-3 space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Created
                      </dt>
                      <dd className="mt-1 font-medium" data-testid="asset-detail-created">
                        {created || "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Prompt
                      </dt>
                      <dd className="mt-1 text-muted-foreground leading-relaxed" data-testid="asset-detail-prompt">
                        {asset.data.prompt ?? "—"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Job ID
                      </dt>
                      <dd className="mt-1 font-medium" data-testid="asset-detail-jobid">
                        {asset.data.jobId ?? "—"}
                      </dd>
                    </div>
                  </dl>
                </div>

                {asset.data.jobId ? (
                  <Link
                    href={`/jobs/${asset.data.jobId}`}
                    className="inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold bg-card/70 border border-border/70 hover:bg-card hover:-translate-y-[1px] transition-all"
                    data-testid="asset-detail-view-job"
                  >
                    View generation job
                  </Link>
                ) : null}
              </div>
            </div>
          )}
        </GlowCard>
      </div>
    </AppShell>
  );
}
