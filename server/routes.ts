import type { Express } from "express";
import type { Server } from "http";
import { z } from "zod";
import { api } from "@shared/routes";
import { storage } from "./storage";
import { openai } from "./replit_integrations/image/client";

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

      const response = await openai.images.generate({
        model: "gpt-image-1",
        prompt,
        size: (input.size ?? "1024x1024") as any,
      });

      const b64 = response.data[0]?.b64_json;
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
        title: null,
        prompt: input.prompt,
        metadata: {
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

  // Text chat integration endpoints (non-conflicting)
  // We mount the provided chat routes which expose /api/conversations/*
  // and streaming responses for messages.
  const { registerChatRoutes } = await import("./replit_integrations/chat");
  registerChatRoutes(app);

  return httpServer;
}
