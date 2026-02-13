import { useEffect, useMemo, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, SunMedium } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const effective = useMemo(() => {
    if (!mounted) return "light";
    if (theme === "system") return systemTheme ?? "light";
    return theme ?? "light";
  }, [theme, systemTheme, mounted]);

  const isDark = effective === "dark";

  return (
    <Button
      variant="secondary"
      size="icon"
      className="rounded-xl border border-border/70 bg-card/70 hover:bg-card hover:-translate-y-[1px] transition-all"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      data-testid="theme-toggle"
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {isDark ? <SunMedium className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </Button>
  );
}
