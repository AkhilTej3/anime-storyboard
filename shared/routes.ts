import { z } from "zod";

import {
  insertGenerationJobSchema,
  insertAssetSchema,
  insertAssetRenditionSchema,
  generationJobs,
  assets,
  assetRenditions,
  conversations,
  messages,
  insertConversationSchema,
  projects,
  projectAssets,
  compiledScenes,
  sceneFrames,
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  jobs: {
    list: {
      method: "GET" as const,
      path: "/api/jobs" as const,
      responses: {
        200: z.array(z.custom<typeof generationJobs.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/jobs/:id" as const,
      responses: {
        200: z.custom<typeof generationJobs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  assets: {
    list: {
      method: "GET" as const,
      path: "/api/assets" as const,
      responses: {
        200: z.array(z.custom<typeof assets.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/assets/:id" as const,
      responses: {
        200: z.custom<typeof assets.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    renditions: {
      getLatest: {
        method: "GET" as const,
        path: "/api/assets/:id/rendition" as const,
        responses: {
          200: z.custom<typeof assetRenditions.$inferSelect>(),
          404: errorSchemas.notFound,
        },
      },
    },
  },
  generate: {
    image: {
      method: "POST" as const,
      path: "/api/generate/image" as const,
      input: z.object({
        prompt: z.string().min(1),
        title: z.string().min(1).max(120).optional(),
        projectName: z.string().min(1).max(120).optional(),
        assetCategory: z.enum(["character", "environment", "nature", "general"]).optional(),
        negativePrompt: z.string().optional(),
        stylePreset: z.string().optional(),
        size: z.enum(["1024x1024", "512x512", "256x256"]).optional(),
      }),
      responses: {
        201: z.object({
          job: z.custom<typeof generationJobs.$inferSelect>(),
          asset: z.custom<typeof assets.$inferSelect>(),
          rendition: z.custom<typeof assetRenditions.$inferSelect>(),
        }),
        400: errorSchemas.validation,
      },
    },

    projectPack: {
      method: "POST" as const,
      path: "/api/generate/project-pack" as const,
      input: z.object({
        projectName: z.string().min(1).max(120),
        script: z.string().min(20),
        characterCount: z.number().int().min(1).max(6).default(2),
        environmentCount: z.number().int().min(1).max(6).default(2),
        natureCount: z.number().int().min(1).max(6).default(2),
        stylePreset: z.string().optional(),
        size: z.enum(["1024x1024", "512x512", "256x256"]).optional(),
      }),
      responses: {
        201: z.object({
          job: z.custom<typeof generationJobs.$inferSelect>(),
          assets: z.object({
            characters: z.array(z.custom<typeof assets.$inferSelect>()),
            environments: z.array(z.custom<typeof assets.$inferSelect>()),
            nature: z.array(z.custom<typeof assets.$inferSelect>()),
          }),
        }),
        400: errorSchemas.validation,
      },
    },
    storyboard: {
      method: "POST" as const,
      path: "/api/generate/storyboard" as const,
      input: z.object({
        script: z.string().min(20),
        sceneCount: z.number().int().min(2).max(8).default(4),
        projectName: z.string().min(1).max(120),
        characterNotes: z.string().optional(),
        environmentNotes: z.string().optional(),
        natureNotes: z.string().optional(),
        referenceAssetIds: z.array(z.number().int().positive()).max(24).optional(),
        stylePreset: z.string().optional(),
        size: z.enum(["1024x1024", "512x512", "256x256"]).optional(),
      }),
      responses: {
        201: z.object({
          job: z.custom<typeof generationJobs.$inferSelect>(),
          scenes: z.array(
            z.object({
              index: z.number(),
              title: z.string(),
              summary: z.string(),
              characterConsistency: z.string(),
              composition: z.string(),
              nature: z.string(),
              asset: z.custom<typeof assets.$inferSelect>(),
              rendition: z.custom<typeof assetRenditions.$inferSelect>(),
            })
          ),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  projects: {
    list: {
      method: "GET" as const,
      path: "/api/projects" as const,
      responses: {
        200: z.array(z.custom<typeof projects.$inferSelect>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/projects" as const,
      input: z.object({
        id: z.string().min(3).max(80),
        name: z.string().min(1).max(120),
        visualStyle: z.string().min(1).max(200),
        baseModel: z.string().min(1).max(80).default("SDXL"),
        defaultSampler: z.string().min(1).max(80).default("DPM++"),
      }),
      responses: {
        201: z.custom<typeof projects.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    assets: {
      list: {
        method: "GET" as const,
        path: "/api/projects/:projectId/assets" as const,
        responses: {
          200: z.array(z.custom<typeof projectAssets.$inferSelect>()),
          404: errorSchemas.notFound,
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/projects/:projectId/assets" as const,
        input: z.object({
          type: z.enum(["character", "environment", "nature", "prop"]),
          name: z.string().min(1).max(160),
          description: z.string().min(1),
          canonicalPrompt: z.string().min(1),
          negativePrompt: z.string().default(""),
          sampler: z.string().default("DPM++"),
          seed: z.number().int().optional(),
          metadata: z.record(z.string(), z.unknown()).default({}),
        }),
        responses: {
          201: z.custom<typeof projectAssets.$inferSelect>(),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      lock: {
        method: "POST" as const,
        path: "/api/projects/:projectId/assets/:assetId/lock" as const,
        responses: {
          200: z.custom<typeof projectAssets.$inferSelect>(),
          404: errorSchemas.notFound,
        },
      },
    },
    scenes: {
      compile: {
        method: "POST" as const,
        path: "/api/projects/:projectId/scenes/compile" as const,
        input: z.object({
          scriptId: z.string().min(1).default("SCRIPT_001"),
          script: z.string().min(20),
          sceneCount: z.number().int().min(1).max(12).default(4),
        }),
        responses: {
          201: z.object({
            scenes: z.array(z.custom<typeof compiledScenes.$inferSelect>()),
          }),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      render: {
        method: "POST" as const,
        path: "/api/projects/:projectId/scenes/:sceneId/render" as const,
        input: z.object({
          frameIndex: z.number().int().min(1).default(1),
          stylePreset: z.string().optional(),
          size: z.enum(["1024x1024", "512x512", "256x256"]).optional(),
        }),
        responses: {
          201: z.object({
            frame: z.custom<typeof sceneFrames.$inferSelect>(),
            asset: z.custom<typeof assets.$inferSelect>(),
            rendition: z.custom<typeof assetRenditions.$inferSelect>(),
          }),
          400: errorSchemas.validation,
          404: errorSchemas.notFound,
        },
      },
      timeline: {
        method: "GET" as const,
        path: "/api/projects/:projectId/scenes/:sceneId/timeline" as const,
        responses: {
          200: z.array(z.custom<typeof sceneFrames.$inferSelect>()),
          404: errorSchemas.notFound,
        },
      },
    },
  },
  chat: {
    conversations: {
      list: {
        method: "GET" as const,
        path: "/api/conversations" as const,
        responses: {
          200: z.array(z.custom<typeof conversations.$inferSelect>()),
        },
      },
      get: {
        method: "GET" as const,
        path: "/api/conversations/:id" as const,
        responses: {
          200: z.object({
            conversation: z.custom<typeof conversations.$inferSelect>(),
            messages: z.array(z.custom<typeof messages.$inferSelect>()),
          }),
          404: errorSchemas.notFound,
        },
      },
      create: {
        method: "POST" as const,
        path: "/api/conversations" as const,
        input: insertConversationSchema
          .extend({ title: z.string().min(1) })
          .partial({ title: true }),
        responses: {
          201: z.custom<typeof conversations.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: "DELETE" as const,
        path: "/api/conversations/:id" as const,
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
      messages: {
        create: {
          method: "POST" as const,
          path: "/api/conversations/:id/messages" as const,
          input: z.object({
            content: z.string().min(1),
          }),
          responses: {
            200: z.unknown(),
            400: errorSchemas.validation,
          },
        },
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url = url.replace(`:${key}`, String(value));
    }
  }
  return url;
}

export type GenerateImageInput = z.infer<typeof api.generate.image.input>;
export type GenerateImageResponse = z.infer<
  typeof api.generate.image.responses[201]
>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type InternalError = z.infer<typeof errorSchemas.internal>;
