import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  LINE_CHANNEL_SECRET: z.string().min(1, "LINE_CHANNEL_SECRET is required"),
  LINE_CHANNEL_ACCESS_TOKEN: z.string().min(1, "LINE_CHANNEL_ACCESS_TOKEN is required"),
  OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  PORT: z.coerce.number().int().positive().default(3000),
  SESSION_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(60),
  SEND_IMAGE_RECEIVED_MESSAGE: z
    .string()
    .default("true")
    .transform((v) => v.toLowerCase() !== "false"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `- ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`環境変数の設定が不正です:\n${issues}`);
}

export const env = parsed.data;

export const MAX_IMAGES_PER_LISTING = 20;
export const OPENAI_MODEL = "gpt-4o";
