import { useMemo } from "react";
import { Link } from "wouter";
import { Sparkle, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageTile({
  assetId,
  title,
  prompt,
  createdAt,
  dataBase64,
  compact,
  "data-testid": dataTestId,
}: {
  assetId: number;
  title?: string | null;
  prompt?: string | null;
  createdAt?: string | Date | null;
  dataBase64?: string | null;
  compact?: boolean;
  "data-testid"?: string;
}) {
  const created = useMemo(() => {
    if (!createdAt) return "";
    const d = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
    return isNaN(d.getTime()) ? "" : d.toLocaleString();
  }, [createdAt]);

  return (
    <Link
      href={`/assets/${assetId}`}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur",
        "transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:border-border",
        "focus:outline-none focus:ring-4 focus:ring-ring/15",
        compact ? "p-2" : "p-3"
      )}
      data-testid={dataTestId ?? `asset-tile-${assetId}`}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl bg-muted/60">
        {dataBase64 ? (
          <img
            src={`data:image/png;base64,${dataBase64}`}
            alt={title ?? prompt ?? `Asset ${assetId}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageIcon className="h-6 w-6" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/65 via-background/0 to-background/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-card/70 backdrop-blur px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm border border-border/60">
          <Sparkle className="h-3.5 w-3.5 text-primary" />
          Image
        </div>
      </div>

      <div className={cn("mt-3", compact && "mt-2")}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              {title?.trim() ? title : "Untitled"}
            </div>
            <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
              {prompt?.trim() ? prompt : "No prompt captured."}
            </div>
          </div>
        </div>

        {created ? (
          <div className="mt-2 text-[11px] text-muted-foreground" data-testid={`asset-created-${assetId}`}>
            {created}
          </div>
        ) : null}
      </div>
    </Link>
  );
}
