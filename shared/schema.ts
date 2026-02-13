import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// =========================
// USERS (template)
// =========================

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// =========================
// CHAT (from AI integration)
// =========================

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

// =========================
// GENERATION JOBS + ASSETS
// =========================

export const jobStatusEnum = pgEnum("job_status", [
  "queued",
  "running",
  "succeeded",
  "failed",
]);

export const assetTypeEnum = pgEnum("asset_type", ["image"]);

export const generationJobs = pgTable("generation_jobs", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  negativePrompt: text("negative_prompt"),
  stylePreset: text("style_preset"),
  size: text("size").notNull().default("1024x1024"),
  seed: integer("seed"),
  status: jobStatusEnum("status").notNull().default("queued"),
  progress: integer("progress").notNull().default(0),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const assets = pgTable("assets", {
  id: serial("id").primaryKey(),
  type: assetTypeEnum("type").notNull().default("image"),
  jobId: integer("job_id").references(() => generationJobs.id, {
    onDelete: "set null",
  }),
  title: text("title"),
  prompt: text("prompt"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const assetRenditions = pgTable("asset_renditions", {
  id: serial("id").primaryKey(),
  assetId: integer("asset_id")
    .notNull()
    .references(() => assets.id, { onDelete: "cascade" }),
  mimeType: text("mime_type").notNull().default("image/png"),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  // base64 image payload for MVP; later can move to object storage
  dataBase64: text("data_base64").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGenerationJobSchema = createInsertSchema(generationJobs).omit({
  id: true,
  status: true,
  progress: true,
  error: true,
  createdAt: true,
  completedAt: true,
});

export const insertAssetSchema = createInsertSchema(assets).omit({
  id: true,
  createdAt: true,
});

export const insertAssetRenditionSchema = createInsertSchema(assetRenditions).omit({
  id: true,
  createdAt: true,
});

export type GenerationJob = typeof generationJobs.$inferSelect;
export type InsertGenerationJob = z.infer<typeof insertGenerationJobSchema>;

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = z.infer<typeof insertAssetSchema>;

export type AssetRendition = typeof assetRenditions.$inferSelect;
export type InsertAssetRendition = z.infer<typeof insertAssetRenditionSchema>;

// Explicit API contract types
export type CreateGenerationJobRequest = InsertGenerationJob;
export type UpdateGenerationJobRequest = Partial<InsertGenerationJob>;
export type GenerationJobResponse = GenerationJob;

export type CreateAssetRequest = InsertAsset;
export type AssetResponse = Asset;

export type CreateAssetRenditionRequest = z.infer<typeof insertAssetRenditionSchema>;
export type AssetRenditionResponse = AssetRendition;

export type CreateGenerateImageRequest = {
  prompt: string;
  negativePrompt?: string;
  stylePreset?: string;
  size?: "1024x1024" | "512x512" | "256x256";
};

export type GenerateImageResponse = {
  job: GenerationJobResponse;
  asset: AssetResponse;
  rendition: AssetRenditionResponse;
};

export type JobsListResponse = GenerationJobResponse[];
export type AssetsListResponse = AssetResponse[];

export const STYLE_PRESETS = [
  "Photoreal",
  "Illustration",
  "Anime",
  "Pixel",
  "3D",
  "Line Art",
] as const;

export type StylePreset = (typeof STYLE_PRESETS)[number];
