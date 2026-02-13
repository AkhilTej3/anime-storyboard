import { eq, desc } from "drizzle-orm";
import {
  assets,
  assetRenditions,
  generationJobs,
  type AssetResponse,
  type AssetRenditionResponse,
  type CreateAssetRenditionRequest,
  type CreateAssetRequest,
  type CreateGenerationJobRequest,
  type GenerationJobResponse,
} from "@shared/schema";
import { db } from "./db";

export interface IStorage {
  // Jobs
  listJobs(): Promise<GenerationJobResponse[]>;
  getJob(id: number): Promise<GenerationJobResponse | undefined>;
  createJob(input: CreateGenerationJobRequest): Promise<GenerationJobResponse>;
  updateJob(
    id: number,
    updates: Partial<GenerationJobResponse>
  ): Promise<GenerationJobResponse | undefined>;

  // Assets
  listAssets(): Promise<AssetResponse[]>;
  getAsset(id: number): Promise<AssetResponse | undefined>;
  createAsset(input: CreateAssetRequest): Promise<AssetResponse>;

  // Renditions
  createRendition(
    input: CreateAssetRenditionRequest
  ): Promise<AssetRenditionResponse>;
  getLatestRenditionByAsset(
    assetId: number
  ): Promise<AssetRenditionResponse | undefined>;
}

export class DatabaseStorage implements IStorage {
  async listJobs(): Promise<GenerationJobResponse[]> {
    return db.select().from(generationJobs).orderBy(desc(generationJobs.createdAt));
  }

  async getJob(id: number): Promise<GenerationJobResponse | undefined> {
    const [row] = await db.select().from(generationJobs).where(eq(generationJobs.id, id));
    return row;
  }

  async createJob(input: CreateGenerationJobRequest): Promise<GenerationJobResponse> {
    const [row] = await db
      .insert(generationJobs)
      .values({
        prompt: input.prompt,
        negativePrompt: input.negativePrompt ?? null,
        stylePreset: input.stylePreset ?? null,
        size: input.size ?? "1024x1024",
        seed: input.seed ?? null,
      })
      .returning();
    return row;
  }

  async updateJob(
    id: number,
    updates: Partial<GenerationJobResponse>
  ): Promise<GenerationJobResponse | undefined> {
    const [row] = await db
      .update(generationJobs)
      .set(updates)
      .where(eq(generationJobs.id, id))
      .returning();
    return row;
  }

  async listAssets(): Promise<AssetResponse[]> {
    return db.select().from(assets).orderBy(desc(assets.createdAt));
  }

  async getAsset(id: number): Promise<AssetResponse | undefined> {
    const [row] = await db.select().from(assets).where(eq(assets.id, id));
    return row;
  }

  async createAsset(input: CreateAssetRequest): Promise<AssetResponse> {
    const [row] = await db
      .insert(assets)
      .values({
        type: input.type ?? "image",
        jobId: input.jobId ?? null,
        title: input.title ?? null,
        prompt: input.prompt ?? null,
        metadata: (input as any).metadata ?? null,
      })
      .returning();
    return row;
  }

  async createRendition(
    input: CreateAssetRenditionRequest
  ): Promise<AssetRenditionResponse> {
    const [row] = await db
      .insert(assetRenditions)
      .values({
        assetId: input.assetId,
        mimeType: input.mimeType ?? "image/png",
        width: input.width,
        height: input.height,
        dataBase64: input.dataBase64,
      })
      .returning();
    return row;
  }

  async getLatestRenditionByAsset(
    assetId: number
  ): Promise<AssetRenditionResponse | undefined> {
    const [row] = await db
      .select()
      .from(assetRenditions)
      .where(eq(assetRenditions.assetId, assetId))
      .orderBy(desc(assetRenditions.createdAt))
      .limit(1);
    return row;
  }
}

export const storage = new DatabaseStorage();
