import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { api } from "@shared/routes";
import { storage } from "./storage";
import { generateImageBase64 } from "./image-provider";

function zodToValidation(err: z.ZodError) {
  const first = err.errors[0];
  return {
    message: first?.message ?? "Invalid request",
    field: first?.path?.join(".") || undefined,
  };
}

function sizeToDims(size: string): { width: number; height: number } {
  if (size === "256x256") return { width: 256, height: 256 };
  if (size === "512x512") return { width: 512, height: 512 };
  return { width: 1024, height: 1024 };
}


type ParsedScene = {
  index: number;
  title: string;
  summary: string;
  characterConsistency: string;
  composition: string;
  nature: string;
};

type StoryboardContext = {
  projectName: string;
  characterNotes?: string;
  environmentNotes?: string;
  natureNotes?: string;
  referenceContext?: string;
};

type ProjectAssetCategory = "character" | "environment" | "nature";

function extractCharacterBible(script: string): string {
  const names = Array.from(
    new Set(
      (script.match(/\b[A-Z][A-Z]{2,}\b/g) ?? [])
        .map((name) => name.trim())
        .filter((name) => name.length > 2)
    )
  ).slice(0, 6);

  if (!names.length) {
    return "Maintain visual continuity for recurring protagonists, wardrobe, and emotional expression across all scenes.";
  }

  return `Maintain continuity for these characters: ${names.join(", ")}. Keep facial features, wardrobe palette, and silhouette consistent scene-to-scene.`;
}

function normalizeScriptScenes(script: string, targetCount: number, context: StoryboardContext): ParsedScene[] {
  const blocks = script
    .split(/\n\s*\n/g)
    .map((block) => block.trim())
    .filter(Boolean);

  const rawScenes =
    blocks.length >= 2
      ? blocks
      : script
          .split(/(?<=[.!?])\s+/)
          .map((part) => part.trim())
          .filter((part) => part.length > 20);

  const chunks: string[] = [];
  const effective = Math.max(2, targetCount);
  for (let i = 0; i < effective; i++) {
    const start = Math.floor((i * rawScenes.length) / effective);
    const end = Math.floor(((i + 1) * rawScenes.length) / effective);
    const slice = rawScenes.slice(start, Math.max(start + 1, end));
    const text = slice.join(" ").trim();
    if (text) chunks.push(text);
  }

  const characterConsistency = context.characterNotes?.trim().length
    ? context.characterNotes.trim()
    : extractCharacterBible(script);

  return chunks.slice(0, targetCount).map((sceneText, idx) => {
    const heading = sceneText.split(/[.!?]/)[0]?.trim() || `Scene ${idx + 1}`;
    return {
      index: idx + 1,
      title: heading.slice(0, 80),
      summary: sceneText,
      characterConsistency,
      composition:
        context.environmentNotes?.trim().length
          ? context.environmentNotes.trim()
          : idx % 2 === 0
            ? "Use cinematic wide framing with a clear foreground-middle-background depth stack."
            : "Use medium shot with an anchored subject and leading lines guiding toward emotional focus.",
      nature:
        context.natureNotes?.trim().length
          ? context.natureNotes.trim()
          : sceneText.toLowerCase().includes("night")
            ? "Night ambience with moonlight gradients, reflective highlights, and atmospheric haze."
            : "Natural environmental storytelling with weather, vegetation, and terrain textures matching the scene tone.",
    };
  });
}

function buildStoryboardPrompt(scene: ParsedScene, context: StoryboardContext, stylePreset?: string): string {
  const styleLine = stylePreset
    ? `Visual style: ${stylePreset}.`
    : "Visual style: cinematic anime storyboard concept art.";

  return [
    `Project: ${context.projectName}`,
    `Storyboard scene ${scene.index}: ${scene.title}`,
    `Scene summary: ${scene.summary}`,
    `Character consistency: ${scene.characterConsistency}`,
    `Composition guidance: ${scene.composition}`,
    `Nature and environment guidance: ${scene.nature}`,
    context.referenceContext ?? "",
    styleLine,
    "Keep continuity with prior frames: same character design language, costume colors, and location identity.",
  ].join("\n");
}


function pickTopLines(script: string, limit: number): string[] {
  return script
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 20)
    .slice(0, limit);
}

function extractCharacterCandidates(script: string, count: number): string[] {
  const names = Array.from(
    new Set((script.match(/\b[A-Z][a-z]{2,}\b/g) ?? []).map((name) => name.trim()))
  );
  return names.slice(0, count);
}

function extractEnvironmentCandidates(script: string, count: number): string[] {
  const lines = pickTopLines(script, 40);
  const keywords = [
    "forest",
    "city",
    "village",
    "temple",
    "school",
    "room",
    "street",
    "castle",
    "river",
    "mountain",
    "beach",
    "market",
  ];
  const matches = lines.filter((line) =>
    keywords.some((keyword) => line.toLowerCase().includes(keyword))
  );
  const fallback = lines.filter((line) => !matches.includes(line));
  return [...matches, ...fallback].slice(0, count);
}

function extractNatureCandidates(script: string, count: number): string[] {
  const lines = pickTopLines(script, 40);
  const keywords = [
    "rain",
    "wind",
    "storm",
    "sunset",
    "dawn",
    "night",
    "tree",
    "leaf",
    "ocean",
    "mist",
    "snow",
    "cloud",
  ];
  const matches = lines.filter((line) =>
    keywords.some((keyword) => line.toLowerCase().includes(keyword))
  );
  const fallback = lines.filter((line) => !matches.includes(line));
  return [...matches, ...fallback].slice(0, count);
}

function buildProjectAssetPrompt(
  category: ProjectAssetCategory,
  descriptor: string,
  projectName: string,
  stylePreset?: string
): string {
  const styleLine = stylePreset
    ? `Style: ${stylePreset}.`
    : "Style: anime concept art storyboard pre-production.";
  const subjectLine =
    category === "character"
      ? `Character design sheet: ${descriptor}. Full body, expression clarity, repeatable costume shapes.`
      : category === "environment"
        ? `Environment concept frame: ${descriptor}. Strong layout readability and location identity.`
        : `Nature mood plate: ${descriptor}. Focus on weather, foliage, terrain and atmosphere.`;

  return [
    `Project: ${projectName}`,
    subjectLine,
    styleLine,
    "Designed for reuse as reference in consistent storyboard scene generation.",
  ].join("\n");
}

async function buildReferenceContext(
  projectName: string,
  referenceAssetIds?: number[]
): Promise<string> {
  const allAssets = await storage.listAssets();
  const projectAssets = allAssets.filter((asset) => {
    const metadata = (asset.metadata ?? {}) as Record<string, unknown>;
    return metadata.projectName === projectName;
  });

  const selectedAssets = referenceAssetIds?.length
    ? projectAssets.filter((asset) => referenceAssetIds.includes(asset.id))
    : projectAssets
        .filter((asset) => {
          const metadata = (asset.metadata ?? {}) as Record<string, unknown>;
          return (
            metadata.assetCategory === "character" ||
            metadata.assetCategory === "environment" ||
            metadata.assetCategory === "nature"
          );
        })
        .slice(0, 12);

  if (!selectedAssets.length) return "";

  const lines = selectedAssets.map((asset) => {
    const metadata = (asset.metadata ?? {}) as Record<string, unknown>;
    const category = String(metadata.assetCategory ?? "reference");
    const descriptor = asset.prompt ?? asset.title ?? `asset-${asset.id}`;
    return `- [${category}] #${asset.id}: ${descriptor}`;
  });

  return `Use these generated reference assets for consistency:
${lines.join("\n")}`;
}

async function generateProjectAssetSet(input: {
  projectName: string;
  script: string;
  characterCount: number;
  environmentCount: number;
  natureCount: number;
  stylePreset?: string;
  size?: "1024x1024" | "512x512" | "256x256";
  jobId?: number;
}) {
  const dims = sizeToDims(input.size ?? "1024x1024");

  const characterDescriptors = extractCharacterCandidates(input.script, input.characterCount);
  const environmentDescriptors = extractEnvironmentCandidates(input.script, input.environmentCount);
  const natureDescriptors = extractNatureCandidates(input.script, input.natureCount);

  const createCategoryAssets = async (category: ProjectAssetCategory, descriptors: string[]) => {
    const created: any[] = [];
    const effectiveDescriptors = descriptors.length ? descriptors : [input.script.slice(0, 120)];

    for (const descriptor of effectiveDescriptors) {
      const generatedPrompt = buildProjectAssetPrompt(category, descriptor, input.projectName, input.stylePreset);
      const b64 = await generateImageBase64(
        generatedPrompt,
        (input.size ?? "1024x1024") as "1024x1024" | "512x512" | "256x256"
      );

      const asset = await storage.createAsset({
        type: "image",
        jobId: input.jobId ?? null,
        title: `${category[0].toUpperCase()}${category.slice(1)} ref: ${descriptor.slice(0, 64)}`,
        prompt: descriptor,
        metadata: {
          mode: "project-pack",
          projectName: input.projectName,
          assetCategory: category,
          generatedPrompt,
        },
      } as any);

      await storage.createRendition({
        assetId: asset.id,
        mimeType: "image/png",
        width: dims.width,
        height: dims.height,
        dataBase64: b64,
      });

      created.push(asset);
    }

    return created;
  };

  const characters = await createCategoryAssets("character", characterDescriptors);
  const environments = await createCategoryAssets("environment", environmentDescriptors);
  const nature = await createCategoryAssets("nature", natureDescriptors);

  return { characters, environments, nature };
}

async function seedDatabase() {
  const existing = await storage.listAssets();
  if (existing.length > 0) return;

  // Create a few realistic starter assets so the UI isn't empty.
  // These are not AI-generated (no placeholder image data); instead we seed via
  // a minimal 1x1 transparent PNG base64 to ensure the UI renders safely.
  // (The app will generate real images immediately on first use.)
  const transparent1x1PngBase64 =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/6X8e0cAAAAASUVORK5CYII=";

  const job = await storage.createJob({
    prompt: "A clean product photo of a modern desk lamp, soft studio lighting",
    size: "512x512",
    negativePrompt: "blurry, low quality",
    stylePreset: "Photoreal",
    seed: null as any,
  });

  const asset = await storage.createAsset({
    type: "image",
    jobId: job.id,
    title: "Starter asset",
    prompt: job.prompt,
    metadata: { seeded: true },
  } as any);

  await storage.createRendition({
    assetId: asset.id,
    mimeType: "image/png",
    width: 1,
    height: 1,
    dataBase64: transparent1x1PngBase64,
  });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Seed once on startup
  seedDatabase().catch((err) => {
    console.error("Seed failed", err);
  });

  app.get(api.jobs.list.path, async (_req, res) => {
    const jobs = await storage.listJobs();
    res.json(jobs);
  });

  app.get(api.jobs.get.path, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  });

  app.get(api.assets.list.path, async (_req, res) => {
    const list = await storage.listAssets();
    res.json(list);
  });

  app.get(api.assets.get.path, async (req, res) => {
    const asset = await storage.getAsset(Number(req.params.id));
    if (!asset) return res.status(404).json({ message: "Asset not found" });
    res.json(asset);
  });

  app.get(api.assets.renditions.getLatest.path, async (req, res) => {
    const rendition = await storage.getLatestRenditionByAsset(Number(req.params.id));
    if (!rendition)
      return res.status(404).json({ message: "Rendition not found" });
    res.json(rendition);
  });

  app.post(api.generate.image.path, async (req, res) => {
    try {
      const input = api.generate.image.input.parse(req.body);

      const job = await storage.createJob({
        prompt: input.prompt,
        negativePrompt: input.negativePrompt,
        stylePreset: input.stylePreset,
        size: input.size ?? "1024x1024",
        seed: null as any,
      } as any);

      await storage.updateJob(job.id, {
        status: "running" as any,
        progress: 10,
      } as any);

      const expandedPromptParts = [input.prompt];
      if (input.stylePreset) expandedPromptParts.push(`Style: ${input.stylePreset}.`);
      if (input.negativePrompt)
        expandedPromptParts.push(`Avoid: ${input.negativePrompt}.`);

      const prompt = expandedPromptParts.join("\n");

      const b64 = await generateImageBase64(
        prompt,
        (input.size ?? "1024x1024") as "1024x1024" | "512x512" | "256x256"
      );

      if (!b64) {
        await storage.updateJob(job.id, {
          status: "failed" as any,
          progress: 100,
          error: "No image data returned",
          completedAt: new Date(),
        } as any);
        return res.status(500).json({ message: "No image data returned" });
      }

      const asset = await storage.createAsset({
        type: "image",
        jobId: job.id,
        title: input.title?.trim() || null,
        prompt: input.prompt,
        metadata: {
          projectName: input.projectName ?? null,
          assetCategory: input.assetCategory ?? "general",
          stylePreset: input.stylePreset ?? null,
          negativePrompt: input.negativePrompt ?? null,
        },
      } as any);

      const dims = sizeToDims(input.size ?? "1024x1024");
      const rendition = await storage.createRendition({
        assetId: asset.id,
        mimeType: "image/png",
        width: dims.width,
        height: dims.height,
        dataBase64: b64,
      });

      await storage.updateJob(job.id, {
        status: "succeeded" as any,
        progress: 100,
        completedAt: new Date(),
      } as any);

      res.status(201).json({ job, asset, rendition });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidation(err));
      }
      console.error(err);
      res.status(500).json({ message: "Internal error" });
    }
  });


  app.post(api.generate.projectPack.path, async (req, res) => {
    try {
      const input = api.generate.projectPack.input.parse(req.body);

      const job = await storage.createJob({
        prompt: `${input.projectName}: project pack generation`,
        negativePrompt: undefined,
        stylePreset: input.stylePreset,
        size: input.size ?? "1024x1024",
        seed: null as any,
      } as any);

      await storage.updateJob(job.id, {
        status: "running" as any,
        progress: 10,
      } as any);

      const assets = await generateProjectAssetSet({
        ...input,
        jobId: job.id,
      });

      await storage.updateJob(job.id, {
        status: "succeeded" as any,
        progress: 100,
        completedAt: new Date(),
      } as any);

      res.status(201).json({ job, assets });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidation(err));
      }
      console.error(err);
      res.status(500).json({ message: "Internal error" });
    }
  });


  app.post(api.generate.storyboard.path, async (req, res) => {
    try {
      const input = api.generate.storyboard.input.parse(req.body);

      const referenceContext = await buildReferenceContext(input.projectName, input.referenceAssetIds);

      const context: StoryboardContext = {
        projectName: input.projectName,
        characterNotes: input.characterNotes,
        environmentNotes: input.environmentNotes,
        natureNotes: input.natureNotes,
        referenceContext,
      };

      const storyboardScenes = normalizeScriptScenes(input.script, input.sceneCount, context);

      const job = await storage.createJob({
        prompt: `${input.projectName}: storyboard generation (${storyboardScenes.length} scenes)`,
        negativePrompt: undefined,
        stylePreset: input.stylePreset,
        size: input.size ?? "1024x1024",
        seed: null as any,
      } as any);

      await storage.updateJob(job.id, {
        status: "running" as any,
        progress: 5,
      } as any);

      const dims = sizeToDims(input.size ?? "1024x1024");
      const createdScenes: Array<{
        index: number;
        title: string;
        summary: string;
        characterConsistency: string;
        composition: string;
        nature: string;
        asset: any;
        rendition: any;
      }> = [];

      for (let i = 0; i < storyboardScenes.length; i++) {
        console.log(`Generating image for scene ${i + 1}/${storyboardScenes.length}...`,input);
        const scene = storyboardScenes[i];
        const b64 = await generateImageBase64(
          buildStoryboardPrompt(scene, context, input.stylePreset),
          (input.size ?? "1024x1024") as "1024x1024" | "512x512" | "256x256"
        );

        if (!b64) throw new Error(`No image data for scene ${scene.index}`);

        const asset = await storage.createAsset({
          type: "image",
          jobId: job.id,
          title: `Scene ${scene.index}: ${scene.title}`,
          prompt: scene.summary,
          metadata: {
            mode: "storyboard",
            projectName: input.projectName,
            referenceAssetIds: input.referenceAssetIds ?? [],
            sceneIndex: scene.index,
            sceneTitle: scene.title,
            characterConsistency: scene.characterConsistency,
            composition: scene.composition,
            nature: scene.nature,
          },
        } as any);

        const rendition = await storage.createRendition({
          assetId: asset.id,
          mimeType: "image/png",
          width: dims.width,
          height: dims.height,
          dataBase64: b64,
        });

        createdScenes.push({ ...scene, asset, rendition });

        await storage.updateJob(job.id, {
          progress: Math.round(((i + 1) / storyboardScenes.length) * 100),
        } as any);
      }

      await storage.updateJob(job.id, {
        status: "succeeded" as any,
        progress: 100,
        completedAt: new Date(),
      } as any);

      res.status(201).json({ job, scenes: createdScenes });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json(zodToValidation(err));
      }
      console.error(err);
      res.status(500).json({ message: "Internal error" });
    }
  });

  // Text chat integration endpoints (non-conflicting)
  // We mount the provided chat routes which expose /api/conversations/*
  // and streaming responses for messages.
  const { registerChatRoutes } = await import("./replit_integrations/chat");
  registerChatRoutes(app);

  return httpServer;
}
