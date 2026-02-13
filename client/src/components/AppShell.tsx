import { PropsWithChildren, useMemo } from "react";
import { Link, useLocation } from "wouter";
import {
  Aperture,
  Blocks,
  Briefcase,
  MessagesSquare,
  Sparkles,
  Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const nav = [
  { href: "/", label: "Studio", icon: Sparkles },
  { href: "/assets", label: "Assets", icon: Aperture },
  { href: "/jobs", label: "Jobs", icon: Gauge },
  { href: "/conversations", label: "Conversations", icon: MessagesSquare },
] as const;

export function AppShell({ children }: PropsWithChildren) {
  const [location] = useLocation();

  const activeHref = useMemo(() => {
    // treat studio as "/"
    if (location === "/") return "/";
    const match = nav.find((n) => location.startsWith(n.href) && n.href !== "/");
    return match?.href ?? "";
  }, [location]);

  return (
    <div className="min-h-screen bg-mesh">
      <div className="relative">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute -top-20 left-1/2 h-72 w-[44rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-24 right-[-10%] h-72 w-[44rem] rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
          <header className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-primary/90 to-primary/55 text-primary-foreground shadow-lg shadow-primary/20">
                <Blocks className="h-5 w-5" />
                <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-card text-foreground shadow-sm border border-border">
                  <Aperture className="h-3 w-3" />
                </span>
              </div>
              <div className="leading-tight">
                <div className="text-lg sm:text-xl font-bold tracking-tight">
                  Aura Studio
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  Minimal creative generation workspace
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button
                variant="secondary"
                className="hidden sm:inline-flex rounded-xl"
                data-testid="header-about"
                onClick={() => {
                  window.open("https://platform.openai.com/docs", "_blank", "noopener,noreferrer");
                }}
              >
                <Briefcase className="mr-2 h-4 w-4" />
                Docs
              </Button>
            </div>
          </header>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 lg:gap-8">
            <aside className="glass grain relative rounded-2xl p-3 soft-shadow">
              <div className="px-2 pb-2">
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Workspace
                </div>
              </div>

              <nav className="space-y-1">
                {nav.map((item) => {
                  const Icon = item.icon;
                  const active = activeHref === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200",
                        "hover:bg-sidebar-accent hover:shadow-sm hover:-translate-y-[1px]",
                        active
                          ? "bg-gradient-to-r from-primary/12 to-primary/0 text-foreground ring-1 ring-primary/15"
                          : "text-muted-foreground"
                      )}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                    >
                      <span
                        className={cn(
                          "grid h-9 w-9 place-items-center rounded-xl transition-all duration-200",
                          active
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                            : "bg-card/70 text-foreground/80 border border-border/70 group-hover:border-border"
                        )}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full transition-opacity",
                          active ? "bg-primary opacity-100" : "bg-muted-foreground/40 opacity-0 group-hover:opacity-100"
                        )}
                      />
                    </Link>
                  );
                })}
              </nav>

              <Separator className="my-3" />

              <div className="px-2 pb-1">
                <div className="rounded-xl border border-border/60 bg-card/60 p-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent/95 to-accent/60 text-accent-foreground shadow-md shadow-accent/15">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Pro tip</div>
                      <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                        Try a concrete subject + lighting + lens. Example:{" "}
                        <span className="font-medium text-foreground/80">
                          “ceramic koi fish, studio light, macro, bokeh”
                        </span>
                        .
                      </div>
                    </div>
                  </div>

                  <Button
                    className="mt-3 w-full rounded-xl bg-gradient-to-r from-primary to-primary/75 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    data-testid="sidebar-jump-studio"
                    onClick={() => {
                      // soft navigation: wouter Link is preferred, but button should work too.
                      window.history.pushState(null, "", "/");
                      window.dispatchEvent(new PopStateEvent("popstate"));
                    }}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate something
                  </Button>
                </div>
              </div>
            </aside>

            <main className="min-w-0">{children}</main>
          </div>

          <footer className="mt-10 pb-2 text-xs text-muted-foreground">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span data-testid="footer-copy">
                © {new Date().getFullYear()} Aura Studio — crafted UI for an MVP creative platform.
              </span>
              <span className="opacity-80">
                Built with React + TanStack Query + Tailwind.
              </span>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
