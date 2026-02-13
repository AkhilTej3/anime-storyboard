import { useMemo, useState } from "react";
import { Search, Aperture, SlidersHorizontal, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { GlowCard } from "@/components/GlowCard";
import { useAssets, useLatestRendition } from "@/hooks/use-assets";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageTile } from "@/components/ImageTile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Sort = "newest" | "oldest" | "prompt";

export default function AssetsPage() {
  const assets = useAssets();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");

  const filtered = useMemo(() => {
    const list = assets.data ?? [];
    const query = q.trim().toLowerCase();

    const items = query
      ? list.filter((a) => {
          const t = (a.title ?? "").toLowerCase();
          const p = (a.prompt ?? "").toLowerCase();
          return t.includes(query) || p.includes(query);
        })
      : list;

    const sorted = [...items].sort((a, b) => {
      const da = new Date(a.createdAt as any).getTime();
      const db = new Date(b.createdAt as any).getTime();
      if (sort === "newest") return (db || 0) - (da || 0);
      if (sort === "oldest") return (da || 0) - (db || 0);
      return String(a.prompt ?? "").localeCompare(String(b.prompt ?? ""));
    });

    return sorted;
  }, [assets.data, q, sort]);

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-in-up">
        <SectionHeader
          eyebrow="Library"
          title="Assets"
          description="A curated shelf of everything you’ve generated. Search by prompt or title, then open for details."
          data-testid="assets-header"
          right={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={() => assets.refetch()}
                data-testid="assets-refresh"
              >
                Refresh
              </Button>
            </div>
          }
        />

        <GlowCard className="p-4 sm:p-6" data-testid="assets-controls">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px_auto] gap-3 items-end">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Search</div>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search titles + prompts…"
                  className="pl-9 rounded-2xl bg-background/60 border-border/70 focus-ring"
                  data-testid="assets-search"
                />
                {q.trim() ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1.5 h-8 w-8 rounded-xl"
                    onClick={() => setQ("")}
                    data-testid="assets-search-clear"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4 text-accent" />
                Sort
              </div>
              <Select value={sort} onValueChange={(v) => setSort(v as Sort)}>
                <SelectTrigger
                  className="rounded-2xl bg-background/60 border-border/70 focus:ring-4 focus:ring-ring/15"
                  data-testid="assets-sort"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="prompt">Prompt (A→Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-muted-foreground" data-testid="assets-count">
                {assets.isLoading ? "Loading…" : `${filtered.length} assets`}
              </div>
              <div className="hidden lg:flex items-center gap-2 rounded-2xl border border-border/60 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
                <Aperture className="h-4 w-4 text-primary" />
                Click any tile to open details
              </div>
            </div>
          </div>
        </GlowCard>

        <GlowCard className="p-4 sm:p-6" data-testid="assets-grid-card">
          {assets.isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="assets-loading">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-56 rounded-2xl" />
              ))}
            </div>
          ) : assets.isError ? (
            <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm" data-testid="assets-error">
              <div className="font-semibold">Couldn’t load assets</div>
              <div className="mt-1 text-muted-foreground">
                {assets.error instanceof Error ? assets.error.message : "Unknown error"}
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border/70 bg-card/60 p-8 text-center" data-testid="assets-empty">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
                <Aperture className="h-5 w-5" />
              </div>
              <div className="mt-3 text-base font-semibold">No matching assets</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Try a different query, or generate something new in Studio.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" data-testid="assets-grid">
              {filtered.map((a) => (
                <AssetTile key={a.id} asset={a} />
              ))}
            </div>
          )}
        </GlowCard>
      </div>
    </AppShell>
  );
}

function AssetTile({ asset }: { asset: any }) {
  const rendition = useLatestRendition(asset.id);
  return (
    <ImageTile
      assetId={asset.id}
      title={asset.title}
      prompt={asset.prompt}
      createdAt={asset.createdAt}
      dataBase64={rendition.data?.dataBase64 ?? null}
      data-testid={`assets-tile-${asset.id}`}
    />
  );
}
