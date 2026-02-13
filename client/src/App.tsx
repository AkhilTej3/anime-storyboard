import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { ThemeProvider } from "next-themes";

import StudioPage from "@/pages/StudioPage";
import AssetsPage from "@/pages/AssetsPage";
import AssetDetailPage from "@/pages/AssetDetailPage";
import JobsPage from "@/pages/JobsPage";
import JobDetailPage from "@/pages/JobDetailPage";
import ConversationsPage from "@/pages/ConversationsPage";
import ConversationDetailPage from "@/pages/ConversationDetailPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={StudioPage} />
      <Route path="/assets" component={AssetsPage} />
      <Route path="/assets/:id" component={AssetDetailPage} />
      <Route path="/jobs" component={JobsPage} />
      <Route path="/jobs/:id" component={JobDetailPage} />
      <Route path="/conversations" component={ConversationsPage} />
      <Route path="/conversations/:id" component={ConversationDetailPage} />

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
