import { z } from "zod";

export const ProjectStatusSchema = z.enum(["active", "archived", "paused"]);
export const AssetTypeSchema = z.enum([
  "character",
  "environment",
  "nature",
  "prop",
]);
export const AssetLifecycleSchema = z.enum([
  "draft",
  "generated",
  "locked",
  "deprecated",
]);

export const ProjectSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  visualStyle: z.string(),
  baseModel: z.string(),
  defaultSampler: z.string(),
  styleAnchorPrompt: z.string(),
  createdAt: z.string(),
  status: ProjectStatusSchema,
});

export const AssetSpecSchema = z.object({
  projectId: z.string(),
  assetType: AssetTypeSchema,
  name: z.string(),
  description: z.string(),
  style: z.string(),
  variants: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});

export const AssetBundleSchema = z.object({
  assetId: z.string(),
  projectId: z.string(),
  assetType: AssetTypeSchema,
  name: z.string(),
  version: z.number().int().positive(),
  lockState: AssetLifecycleSchema,
  canonicalPrompt: z.string(),
  negativePrompt: z.string(),
  sampler: z.string(),
  seed: z.number().int(),
  embeddingRefs: z.record(z.string(), z.string()),
  baseImages: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export const SceneNodeSchema = z.object({
  sceneId: z.string(),
  projectId: z.string(),
  characters: z.array(z.string()),
  environment: z.string(),
  nature: z.array(z.string()).default([]),
  props: z.array(z.string()).default([]),
  mood: z.string(),
  lighting: z.string(),
  camera: z.string(),
  action: z.string(),
});

export const RenderRequestSchema = z.object({
  projectId: z.string(),
  sceneId: z.string(),
  frameIndex: z.number().int().nonnegative(),
  overrideNotes: z.string().optional(),
  strictConsistency: z.boolean().default(true),
});

export const ConsistencyReportSchema = z.object({
  passAll: z.boolean(),
  identityScores: z.record(z.string(), z.number()),
  promptDiffScore: z.number(),
  styleAnchorScore: z.number(),
  seedInherited: z.boolean(),
  violations: z.array(z.string()),
});

export const RenderFrameSchema = z.object({
  frameId: z.string(),
  projectId: z.string(),
  sceneId: z.string(),
  frameIndex: z.number().int().nonnegative(),
  renderVersion: z.number().int().positive(),
  imageUri: z.string(),
  dependencyAssetVersions: z.array(z.string()),
  consistency: ConsistencyReportSchema,
});

export type ProjectContract = z.infer<typeof ProjectSchema>;
export type AssetSpecContract = z.infer<typeof AssetSpecSchema>;
export type AssetBundleContract = z.infer<typeof AssetBundleSchema>;
export type SceneNodeContract = z.infer<typeof SceneNodeSchema>;
export type RenderRequestContract = z.infer<typeof RenderRequestSchema>;
export type RenderFrameContract = z.infer<typeof RenderFrameSchema>;
