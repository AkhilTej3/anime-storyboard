import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  eyebrow,
  description,
  right,
  className,
  "data-testid": dataTestId,
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  right?: ReactNode;
  className?: string;
  "data-testid"?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6",
        className
      )}
      data-testid={dataTestId}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="mt-1 text-2xl sm:text-3xl md:text-4xl font-bold leading-[1.05]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm md:text-base text-muted-foreground leading-relaxed">
            {description}
          </p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
