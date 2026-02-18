import crypto from "node:crypto";
import { openai } from "./replit_integrations/image/client";

type SupportedSize = "1024x1024" | "512x512" | "256x256";
type ImageProvider = "openai" | "bedrock";

const DEFAULT_BEDROCK_MODEL = "amazon.nova-canvas-v1:0";

function parseSize(size: SupportedSize): { width: number; height: number } {
  const [width, height] = size.split("x").map((value) => Number(value));
  return { width, height };
}

function hashSha256(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

function hmacSha256(key: Buffer | string, input: string): Buffer {
  return crypto.createHmac("sha256", key).update(input, "utf8").digest();
}

function getImageProvider(): ImageProvider {
  const configured = process.env.IMAGE_PROVIDER?.toLowerCase();
  return configured === "bedrock" ? "bedrock" : "openai";
}

async function generateWithOpenAI(prompt: string, size: SupportedSize): Promise<string> {
  const response = await openai.images.generate({
    model: "gpt-image-1",
    prompt,
    size,
  });

  const base64 = response.data[0]?.b64_json;
  if (!base64) throw new Error("OpenAI returned no image data");
  return base64;
}

function buildBedrockAuthHeaders(body: string, canonicalPath: string, region: string, service: string) {
  console.log("Building Bedrock auth headers...");
  const apiKey = process.env.BEDROCK_API_KEY;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const payloadHash = hashSha256(body);

  const host = `bedrock-runtime.${region}.amazonaws.com`;
  console.log(`Building Bedrock auth headers with host: ${host}, amzDate: ${amzDate}, payloadHash: ${payloadHash}, apiKey: ${apiKey}`);
  if (apiKey) {
    return {
      host,
      amzDate,
      payloadHash,
      sessionToken: undefined,
      authorization: undefined,
      apiKey,
    };
  }

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "Missing Bedrock credentials. Set BEDROCK_API_KEY or AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY."
    );
  }
  const canonicalHeaders = [
    `content-type:application/json`,
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
    ...(sessionToken ? [`x-amz-security-token:${sessionToken}`] : []),
  ]
    .sort()
    .join("\n");

  const signedHeaders = [
    "content-type",
    "host",
    "x-amz-content-sha256",
    "x-amz-date",
    ...(sessionToken ? ["x-amz-security-token"] : []),
  ]
    .sort()
    .join(";");

  const canonicalRequest = [
    "POST",
    canonicalPath,
    "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    hashSha256(canonicalRequest),
  ].join("\n");

  const kDate = hmacSha256(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  const kSigning = hmacSha256(kService, "aws4_request");
  const signature = hmacSha256(kSigning, stringToSign).toString("hex");

  return {
    host,
    amzDate,
    payloadHash,
    sessionToken,
    authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  };
}

async function generateWithBedrock(prompt: string, size: SupportedSize): Promise<string> {
  const { width, height } = parseSize(size);
  const modelId = process.env.BEDROCK_MODEL_ID ?? DEFAULT_BEDROCK_MODEL;
  const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
  const service = "bedrock";

  let body = JSON.stringify({
    taskType: "TEXT_IMAGE",
    textToImageParams: {
      text: prompt,
    },
    imageGenerationConfig: {
      width,
      height,
      numberOfImages: 1,
      quality: "standard",
    },
  });

  // body = {
  //   "text_prompts": [{ "text": prompt }],
  //   "style_preset": "photorealistic",
  //   "seed": Math.floor(Math.random() * 1000000)
  // }.toString();


const encodedModelId = encodeURIComponent(modelId);
const canonicalPath = `/model/${encodedModelId}/invoke`;

const auth = buildBedrockAuthHeaders(body, canonicalPath, region, service);
console.log(`Auth headers for Bedrock request: ${JSON.stringify(auth)}`);

const response = await fetch(`https://${auth.host}${canonicalPath}`, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "Authorization": `Bearer ${auth.apiKey}`,
    "x-amz-date": auth.amzDate,
    "x-amz-content-sha256": auth.payloadHash,
    ...(auth.sessionToken ? { "x-amz-security-token": auth.sessionToken } : {}),
    ...(auth.authorization ? { authorization: auth.authorization } : {}),
    ...(auth.apiKey ? { "x-api-key": auth.apiKey } : {}),
  },
  body,
});

if (!response.ok) {
  throw new Error(`Bedrock request failed (${response.status}): ${await response.text()}`);
}

const parsed = (await response.json()) as { images?: string[]; error?: string };
const base64 = parsed.images?.[0];
if (!base64) {
  throw new Error(parsed.error ?? "Bedrock returned no image data");
}

return base64;
}

export async function generateImageBase64(
  prompt: string,
  size: SupportedSize = "1024x1024"
): Promise<string> {
  const provider = getImageProvider();
  console.log(`Generating image with provider: ${provider}`);
  if (provider === "bedrock") {
    return generateWithBedrock(prompt, size);
  }

  return generateWithOpenAI(prompt, size);
}
