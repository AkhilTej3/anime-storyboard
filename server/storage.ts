import { and, eq, desc } from "drizzle-orm";
import {
  assets,
  assetRenditions,
  compiledScenes,
  generationJobs,
  projectAssets,
  projects,
  sceneFrames,
  type AssetResponse,
  type AssetRenditionResponse,
  type CompiledScene,
  type CreateAssetRenditionRequest,
  type CreateAssetRequest,
  type CreateGenerationJobRequest,
  type GenerationJobResponse,
  type InsertCompiledScene,
  type InsertProject,
  type InsertProjectAsset,
  type InsertSceneFrame,
  type Project,
  type ProjectAsset,
  type SceneFrame,
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

  // Projects
  listProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(input: InsertProject): Promise<Project>;

  // Project assets registry
  createProjectAsset(input: InsertProjectAsset): Promise<ProjectAsset>;
  listProjectAssets(projectId: string): Promise<ProjectAsset[]>;
  getProjectAsset(projectId: string, assetId: string): Promise<ProjectAsset | undefined>;
  lockProjectAsset(projectId: string, assetId: string): Promise<ProjectAsset | undefined>;

  // Scenes and timeline frames
  createCompiledScene(input: InsertCompiledScene): Promise<CompiledScene>;
  listCompiledScenes(projectId: string): Promise<CompiledScene[]>;
  getCompiledScene(projectId: string, sceneId: string): Promise<CompiledScene | undefined>;
  createSceneFrame(input: InsertSceneFrame): Promise<SceneFrame>;
  listSceneFrames(projectId: string, sceneId: string): Promise<SceneFrame[]>;
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

  async listProjects(): Promise<Project[]> {
    return db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [row] = await db.select().from(projects).where(eq(projects.id, id));
    return row;
  }

  async createProject(input: InsertProject): Promise<Project> {
    const [row] = await db.insert(projects).values(input).returning();
    return row;
  }

  async createProjectAsset(input: InsertProjectAsset): Promise<ProjectAsset> {
    const [row] = await db.insert(projectAssets).values(input).returning();
    return row;
  }

  async listProjectAssets(projectId: string): Promise<ProjectAsset[]> {
    return db
      .select()
      .from(projectAssets)
      .where(eq(projectAssets.projectId, projectId))
      .orderBy(desc(projectAssets.createdAt));
  }

  async getProjectAsset(projectId: string, assetId: string): Promise<ProjectAsset | undefined> {
    const [row] = await db
      .select()
      .from(projectAssets)
      .where(and(eq(projectAssets.projectId, projectId), eq(projectAssets.id, assetId)));
    return row;
  }

  async lockProjectAsset(projectId: string, assetId: string): Promise<ProjectAsset | undefined> {
    const [row] = await db
      .update(projectAssets)
      .set({ lockState: "locked", updatedAt: new Date() })
      .where(and(eq(projectAssets.projectId, projectId), eq(projectAssets.id, assetId)))
      .returning();
    return row;
  }

  async createCompiledScene(input: InsertCompiledScene): Promise<CompiledScene> {
    const [row] = await db.insert(compiledScenes).values(input).returning();
    return row;
  }

  async listCompiledScenes(projectId: string): Promise<CompiledScene[]> {
    return db
      .select()
      .from(compiledScenes)
      .where(eq(compiledScenes.projectId, projectId))
      .orderBy(desc(compiledScenes.createdAt));
  }

  async getCompiledScene(projectId: string, sceneId: string): Promise<CompiledScene | undefined> {
    const [row] = await db
      .select()
      .from(compiledScenes)
      .where(and(eq(compiledScenes.projectId, projectId), eq(compiledScenes.id, sceneId)));
    return row;
  }

  async createSceneFrame(input: InsertSceneFrame): Promise<SceneFrame> {
    const [row] = await db.insert(sceneFrames).values(input).returning();
    return row;
  }

  async listSceneFrames(projectId: string, sceneId: string): Promise<SceneFrame[]> {
    return db
      .select()
      .from(sceneFrames)
      .where(and(eq(sceneFrames.projectId, projectId), eq(sceneFrames.sceneId, sceneId)))
      .orderBy(desc(sceneFrames.createdAt));
  }
}

export const storage = new DatabaseStorage();
