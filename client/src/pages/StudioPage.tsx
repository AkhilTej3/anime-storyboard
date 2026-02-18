import { useEffect, useMemo, useState } from "react";
import { Sparkles, Wand2, Loader2, History, X, Copy } from "lucide-react";
import { STYLE_PRESETS, type StylePreset } from "@shared/schema";
import { useGenerateImage } from "@/hooks/use-generate";
import { useGenerateStoryboard } from "@/hooks/use-generate-storyboard";
import { useGenerateProjectPack } from "@/hooks/use-generate-project-pack";
import { useAssets, useLatestRendition } from "@/hooks/use-assets";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ImageTile } from "@/components/ImageTile";
import { cn } from "@/lib/utils";

type Size = "1024x1024" | "512x512" | "256x256";

export default function StudioPage() {
  const { toast } = useToast();
  const generate = useGenerateImage();
  const generateStoryboard = useGenerateStoryboard();
  const generateProjectPack = useGenerateProjectPack();
  const assetsQuery = useAssets();

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [stylePreset, setStylePreset] = useState<StylePreset | "none">("Anime");
  const [size, setSize] = useState<Size>("1024x1024");
  const [projectName, setProjectName] = useState("");
  const [assetTitle, setAssetTitle] = useState("");
  const [assetCategory, setAssetCategory] = useState<"character" | "environment" | "nature" | "general">("character");
  const [script, setScript] = useState("");
  const [sceneCount, setSceneCount] = useState(4);
  const [characterNotes, setCharacterNotes] = useState("");
  const [environmentNotes, setEnvironmentNotes] = useState("");
  const [natureNotes, setNatureNotes] = useState("");
  const [referenceAssetIdsInput, setReferenceAssetIdsInput] = useState("");
  const [characterCount, setCharacterCount] = useState(2);
  const [environmentCount, setEnvironmentCount] = useState(2);
  const [natureCount, setNatureCount] = useState(2);
  const [projectAssetIds, setProjectAssetIds] = useState<number[]>([]);
  const [storyboardScenes, setStoryboardScenes] = useState<Array<any>>([]);

  const latestAsset = useMemo(() => {
    const list = assetsQuery.data ?? [];
    // Assume server returns newest first; if not, UI still works.
    return list[0] ?? null;
  }, [assetsQuery.data]);

  const latestRenditionQuery = useLatestRendition(latestAsset?.id ?? Number.NaN);

  useEffect(() => {
    // Seed a tasteful default prompt for empty state
    if (!prompt) {
      setPrompt("Hero character full-body concept sheet, cel-shaded anime style, clean linework, neutral studio backdrop");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onGenerate() {
    try {
      const res = await generate.mutateAsync({
        prompt,
        title: assetTitle.trim() || undefined,
        projectName: projectName.trim() || undefined,
        assetCategory,
        negativePrompt: negativePrompt.trim() ? negativePrompt : undefined,
        stylePreset: stylePreset === "none" ? undefined : stylePreset,
        size,
      });

      toast({
        title: "Generated",
        description: "Your image is ready. It’s now saved to Assets.",
      });

      // Optimistically show latest result even before assets refetch
      // by relying on response directly.
      // We'll also gently scroll into view.
      requestAnimationFrame(() => {
        document.getElementById("latest-result")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      // If backend returns rendition data, it will render in the preview.
      // We can push into local state? Keep simple: rely on assets invalidation + queries.
      void res;
    } catch (e) {
      toast({
        title: "Generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  function clearNegative() {
    setNegativePrompt("");
  }


  async function onGenerateProjectPack() {
    try {
      const res = await generateProjectPack.mutateAsync({
        projectName: projectName.trim(),
        script,
        characterCount,
        environmentCount,
        natureCount,
        stylePreset: stylePreset === "none" ? undefined : stylePreset,
        size,
      });

      const ids = [
        ...res.assets.characters.map((asset) => asset.id),
        ...res.assets.environments.map((asset) => asset.id),
        ...res.assets.nature.map((asset) => asset.id),
      ];

      setProjectAssetIds(ids);
      setReferenceAssetIdsInput(ids.join(", "));

      toast({
        title: "Project assets generated",
        description: `Created ${ids.length} reusable reference assets for ${projectName.trim()}.`,
      });
    } catch (e) {
      toast({
        title: "Project asset generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function onGenerateStoryboard() {
    try {
      const manuallyProvidedReferenceAssetIds = referenceAssetIdsInput
        .split(",")
        .map((value) => Number(value.trim()))
        .filter((value) => Number.isInteger(value) && value > 0);

      const fallbackProjectAssetIds = projectAssetIds.length
        ? projectAssetIds
        : (assetsQuery.data ?? [])
            .filter((asset: any) => {
              const metadata = (asset.metadata ?? {}) as Record<string, unknown>;
              const category = metadata.assetCategory;
              return metadata.projectName === projectName.trim() && (category === "character" || category === "environment" || category === "nature");
            })
            .slice(0, 24)
            .map((asset: any) => asset.id);

      const referenceAssetIds = manuallyProvidedReferenceAssetIds.length
        ? manuallyProvidedReferenceAssetIds
        : fallbackProjectAssetIds;

      const res = await generateStoryboard.mutateAsync({
        script,
        sceneCount,
        projectName: projectName.trim(),
        characterNotes: characterNotes.trim() || undefined,
        environmentNotes: environmentNotes.trim() || undefined,
        natureNotes: natureNotes.trim() || undefined,
        referenceAssetIds: referenceAssetIds.length ? referenceAssetIds : undefined,
        stylePreset: stylePreset === "none" ? undefined : stylePreset,
        size,
      });

      setStoryboardScenes(res.scenes);
      toast({
        title: "Storyboard generated",
        description: `Created ${res.scenes.length} scene frames with consistency notes.`,
      });

      requestAnimationFrame(() => {
        document.getElementById("storyboard-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (e) {
      toast({
        title: "Storyboard generation failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt);
      toast({ title: "Copied", description: "Prompt copied to clipboard." });
    } catch {
      toast({ title: "Copy failed", description: "Clipboard permission denied.", variant: "destructive" });
    }
  }

  const canGenerate = prompt.trim().length > 0 && projectName.trim().length > 0 && !generate.isPending;

  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8 animate-in-up">
        <SectionHeader
          eyebrow="Studio"
          title="Generate. Iterate. Curate."
          description="A minimal creative studio for prompt-to-image exploration. Choose a style, dial in size, and capture your best outputs as Assets."
          data-testid="studio-header"
          right={
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="rounded-xl"
                onClick={copyPrompt}
                data-testid="studio-copy-prompt"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy prompt
              </Button>

              <Button
                className="rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                onClick={onGenerate}
                disabled={!canGenerate}
                data-testid="studio-generate"
              >
                {generate.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Wand2 className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          }
        />

        <GlowCard data-testid="storyboard-controls" className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">Storyboard mode</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Paste a script to auto-extract scenes and generate consistent character, composition, and nature-driven frames.
              </div>
            </div>
            <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-xl"
              onClick={onGenerateProjectPack}
              disabled={projectName.trim().length < 1 || script.trim().length < 20 || generateProjectPack.isPending || generateStoryboard.isPending}
              data-testid="project-pack-generate"
            >
              {generateProjectPack.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating project assets…</>
              ) : (
                <><History className="mr-2 h-4 w-4" />Generate project assets</>
              )}
            </Button>
            <Button
              className="rounded-xl"
              onClick={onGenerateStoryboard}
              disabled={projectName.trim().length < 1 || script.trim().length < 20 || generateStoryboard.isPending || generateProjectPack.isPending}
              data-testid="storyboard-generate"
            >
              {generateStoryboard.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating storyboard…</>
              ) : (
                <><Wand2 className="mr-2 h-4 w-4" />Generate storyboard</>
              )}
            </Button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="projectName" className="text-sm">Project name</Label>
              <Input
                id="projectName"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="rounded-2xl"
                placeholder="e.g. Forest Spirits Episode 01"
                data-testid="studio-project-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="referenceAssets" className="text-sm">Reference asset IDs</Label>
              <Input
                id="referenceAssets"
                value={referenceAssetIdsInput}
                onChange={(e) => setReferenceAssetIdsInput(e.target.value)}
                className="rounded-2xl"
                placeholder="e.g. 12, 15, 27"
                data-testid="storyboard-reference-assets"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="characterCount" className="text-sm">Character refs</Label>
              <Input
                id="characterCount"
                type="number"
                min={1}
                max={6}
                value={characterCount}
                onChange={(e) => setCharacterCount(Math.max(1, Math.min(6, Number(e.target.value) || 2)))}
                className="rounded-2xl"
                data-testid="project-character-count"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="environmentCount" className="text-sm">Environment refs</Label>
              <Input
                id="environmentCount"
                type="number"
                min={1}
                max={6}
                value={environmentCount}
                onChange={(e) => setEnvironmentCount(Math.max(1, Math.min(6, Number(e.target.value) || 2)))}
                className="rounded-2xl"
                data-testid="project-environment-count"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="natureCount" className="text-sm">Nature refs</Label>
              <Input
                id="natureCount"
                type="number"
                min={1}
                max={6}
                value={natureCount}
                onChange={(e) => setNatureCount(Math.max(1, Math.min(6, Number(e.target.value) || 2)))}
                className="rounded-2xl"
                data-testid="project-nature-count"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="script" className="text-sm">Script</Label>
              <Textarea
                id="script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                rows={7}
                className="rounded-2xl bg-background/60 border-border/70 focus-ring leading-relaxed"
                placeholder="Paste your scene script here. We'll auto split it into key scenes and keep continuity between frames."
                data-testid="storyboard-script"
              />
            </div>
            <div className="space-y-2 min-w-28">
              <Label htmlFor="sceneCount" className="text-sm">Scenes</Label>
              <Input
                id="sceneCount"
                type="number"
                min={2}
                max={8}
                value={sceneCount}
                onChange={(e) => setSceneCount(Math.max(2, Math.min(8, Number(e.target.value) || 4)))}
                className="rounded-2xl"
                data-testid="storyboard-scene-count"
              />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="characterNotes" className="text-sm">Character notes</Label>
              <Textarea
                id="characterNotes"
                value={characterNotes}
                onChange={(e) => setCharacterNotes(e.target.value)}
                rows={3}
                className="rounded-2xl bg-background/60 border-border/70 focus-ring"
                placeholder="Define core character design consistency."
                data-testid="storyboard-character-notes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="environmentNotes" className="text-sm">Environment notes</Label>
              <Textarea
                id="environmentNotes"
                value={environmentNotes}
                onChange={(e) => setEnvironmentNotes(e.target.value)}
                rows={3}
                className="rounded-2xl bg-background/60 border-border/70 focus-ring"
                placeholder="Define locations and set dressing style."
                data-testid="storyboard-environment-notes"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="natureNotes" className="text-sm">Nature notes</Label>
              <Textarea
                id="natureNotes"
                value={natureNotes}
                onChange={(e) => setNatureNotes(e.target.value)}
                rows={3}
                className="rounded-2xl bg-background/60 border-border/70 focus-ring"
                placeholder="Define weather, foliage, terrain mood."
                data-testid="storyboard-nature-notes"
              />
            </div>
          </div>

          {storyboardScenes.length > 0 && (
            <div id="storyboard-results" className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="storyboard-results">
              {storyboardScenes.map((scene) => (
                <div key={scene.asset.id} className="rounded-2xl border border-border/60 bg-card/60 p-3 space-y-3">
                  <div className="text-sm font-semibold">Scene {scene.index}: {scene.title}</div>
                  <div className="text-xs text-muted-foreground leading-relaxed">{scene.summary}</div>
                  {scene.rendition?.dataBase64 ? (
                    <img
                      src={`data:image/png;base64,${scene.rendition.dataBase64}`}
                      alt={`Storyboard scene ${scene.index}`}
                      className="w-full rounded-xl border border-border/60"
                    />
                  ) : null}
                  <div className="text-xs space-y-1">
                    <div><span className="font-medium">Character consistency:</span> {scene.characterConsistency}</div>
                    <div><span className="font-medium">Composition:</span> {scene.composition}</div>
                    <div><span className="font-medium">Nature:</span> {scene.nature}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlowCard>


        <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-8">
          <GlowCard data-testid="studio-controls" className="p-4 sm:p-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" />
              Prompt Craft
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="assetTitle" className="text-sm">Asset title</Label>
                  <Input
                    id="assetTitle"
                    value={assetTitle}
                    onChange={(e) => setAssetTitle(e.target.value)}
                    className="rounded-2xl bg-background/60 border-border/70 focus-ring"
                    placeholder="e.g. Aya turnaround sheet"
                    data-testid="studio-asset-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Category</Label>
                  <Select value={assetCategory} onValueChange={(v) => setAssetCategory(v as any)}>
                    <SelectTrigger className="rounded-2xl bg-background/60 border-border/70" data-testid="studio-asset-category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="character">Character</SelectItem>
                      <SelectItem value="environment">Environment</SelectItem>
                      <SelectItem value="nature">Nature</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-sm" data-testid="studio-prompt-label">
                  Prompt
                </Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={6}
                  className="rounded-2xl bg-background/60 border-border/70 focus-ring leading-relaxed"
                  placeholder="Describe what you want to create…"
                  data-testid="studio-prompt"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span data-testid="studio-prompt-hint">
                    Tip: subject + medium + lighting + camera + mood.
                  </span>
                  <span data-testid="studio-prompt-count">{prompt.trim().length} chars</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="negativePrompt" className="text-sm" data-testid="studio-negative-label">
                    Negative prompt <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearNegative}
                    className="h-8 rounded-xl"
                    data-testid="studio-negative-clear"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
                <Input
                  id="negativePrompt"
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  className="rounded-2xl bg-background/60 border-border/70 focus-ring"
                  placeholder="e.g. blurry, low-res, watermark, extra limbs…"
                  data-testid="studio-negative"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm" data-testid="studio-style-label">
                    Style preset
                  </Label>
                  <Select
                    value={stylePreset}
                    onValueChange={(v) => setStylePreset(v as any)}
                  >
                    <SelectTrigger
                      className="rounded-2xl bg-background/60 border-border/70 focus:ring-4 focus:ring-ring/15"
                      data-testid="studio-style"
                    >
                      <SelectValue placeholder="Choose a style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {STYLE_PRESETS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-muted-foreground" data-testid="studio-style-hint">
                    Keep it minimal: one preset, one strong concept.
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm" data-testid="studio-size-label">
                    Size
                  </Label>
                  <Select value={size} onValueChange={(v) => setSize(v as Size)}>
                    <SelectTrigger
                      className="rounded-2xl bg-background/60 border-border/70 focus:ring-4 focus:ring-ring/15"
                      data-testid="studio-size"
                    >
                      <SelectValue placeholder="Choose size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1024x1024">1024 × 1024</SelectItem>
                      <SelectItem value="512x512">512 × 512</SelectItem>
                      <SelectItem value="256x256">256 × 256</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="text-xs text-muted-foreground" data-testid="studio-size-hint">
                    Larger sizes look sharper, smaller sizes iterate faster.
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <Button
                  className={cn(
                    "w-full rounded-2xl py-6 text-base font-semibold",
                    "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground",
                    "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0",
                    "transition-all duration-200 ease-out"
                  )}
                  onClick={onGenerate}
                  disabled={!canGenerate}
                  data-testid="studio-generate-bottom"
                >
                  {generate.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-5 w-5" />
                      Generate image
                    </>
                  )}
                </Button>
              </div>
            </div>
          </GlowCard>

          <GlowCard id="latest-result" data-testid="studio-latest" className="p-4 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4 text-accent" />
                Latest result
              </div>
              <Button
                variant="secondary"
                className="rounded-xl"
                data-testid="studio-refresh-assets"
                onClick={() => assetsQuery.refetch()}
              >
                Refresh
              </Button>
            </div>

            <div className="mt-4">
              {assetsQuery.isLoading ? (
                <div className="space-y-3" data-testid="studio-latest-loading">
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-5 w-2/3 rounded-xl" />
                  <Skeleton className="h-4 w-full rounded-xl" />
                </div>
              ) : assetsQuery.isError ? (
                <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm" data-testid="studio-latest-error">
                  <div className="font-semibold">Couldn’t load assets</div>
                  <div className="mt-1 text-muted-foreground">
                    {assetsQuery.error instanceof Error ? assetsQuery.error.message : "Unknown error"}
                  </div>
                </div>
              ) : !latestAsset ? (
                <div className="rounded-2xl border border-border/70 bg-card/60 p-6 text-center" data-testid="studio-latest-empty">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-base font-semibold">No generations yet</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Hit <span className="font-semibold text-foreground">Generate</span> to create your first asset.
                  </div>
                </div>
              ) : (
                <div className="space-y-3" data-testid="studio-latest-content">
                  <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/50">
                    {latestRenditionQuery.isLoading ? (
                      <Skeleton className="h-64 w-full" data-testid="studio-latest-rendition-loading" />
                    ) : latestRenditionQuery.data?.dataBase64 ? (
                      <img
                        src={`data:image/png;base64,${latestRenditionQuery.data.dataBase64}`}
                        alt={latestAsset.title ?? latestAsset.prompt ?? "Latest result"}
                        className="h-auto w-full object-cover"
                        data-testid="studio-latest-image"
                      />
                    ) : (
                      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground" data-testid="studio-latest-noimage">
                        No rendition available.
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-semibold" data-testid="studio-latest-title">
                      {latestAsset.title?.trim() ? latestAsset.title : "Untitled"}
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground leading-relaxed" data-testid="studio-latest-prompt">
                      {latestAsset.prompt ?? "No prompt stored."}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlowCard>
        </div>

        <GlowCard data-testid="studio-history" className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">History</div>
              <div className="mt-1 text-xs text-muted-foreground">
                Your most recent assets — click to inspect and download.
              </div>
            </div>
            <Button
              variant="secondary"
              className="rounded-xl"
              data-testid="studio-history-refresh"
              onClick={() => assetsQuery.refetch()}
            >
              Refresh
            </Button>
          </div>

          <div className="mt-4">
            {assetsQuery.isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="studio-history-loading">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-52 rounded-2xl" />
                ))}
              </div>
            ) : assetsQuery.isError ? (
              <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm" data-testid="studio-history-error">
                <div className="font-semibold">Couldn’t load history</div>
                <div className="mt-1 text-muted-foreground">
                  {assetsQuery.error instanceof Error ? assetsQuery.error.message : "Unknown error"}
                </div>
              </div>
            ) : (assetsQuery.data?.length ?? 0) === 0 ? (
              <div className="rounded-2xl border border-border/70 bg-card/60 p-6 text-sm text-muted-foreground" data-testid="studio-history-empty">
                No assets yet. Generate an image to populate your library.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="studio-history-grid">
                {(assetsQuery.data ?? []).slice(0, 9).map((a) => (
                  <StudioAssetTile key={a.id} asset={a} />
                ))}
              </div>
            )}
          </div>
        </GlowCard>
      </div>
    </AppShell>
  );
}

function StudioAssetTile({ asset }: { asset: any }) {
  const rendition = useLatestRendition(asset.id);
  return (
    <ImageTile
      assetId={asset.id}
      title={asset.title}
      prompt={asset.prompt}
      createdAt={asset.createdAt}
      dataBase64={rendition.data?.dataBase64 ?? null}
      data-testid={`studio-history-asset-${asset.id}`}
      compact
    />
  );
}
