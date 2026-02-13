import { PropsWithChildren } from "react";
import { cn } from "@/lib/utils";

export function GlowCard({
  children,
  className,
  "data-testid": dataTestId,
}: PropsWithChildren<{ className?: string; "data-testid"?: string }>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/60 bg-card/70 backdrop-blur soft-shadow",
        "transition-all duration-300 hover:shadow-xl hover:-translate-y-[1px]",
        className
      )}
      data-testid={dataTestId}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -top-24 left-[-15%] h-56 w-56 rounded-full bg-primary/12 blur-3xl" />
        <div className="absolute -bottom-20 right-[-10%] h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
