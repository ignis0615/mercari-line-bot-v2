import { OPENAI_MODEL } from "../config/env";
import { readImageAsBase64 } from "../utils/files";
import { logger } from "../utils/logger";
import { openai } from "./client";
import { buildAnalysisSystemPrompt, buildAnalysisUserText } from "./prompts";
import { ProductAnalysisSchema, type ProductAnalysis } from "./schemas";

const MAX_ATTEMPTS = 2;

async function callOnce(imagePaths: string[], notes: string[]): Promise<unknown> {
  const imageParts = await Promise.all(
    imagePaths.map(async (filePath) => {
      const base64 = await readImageAsBase64(filePath);
      return {
        type: "image_url" as const,
        image_url: { url: `data:image/jpeg;base64,${base64}` },
      };
    })
  );

  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildAnalysisSystemPrompt() },
      {
        role: "user",
        content: [{ type: "text", text: buildAnalysisUserText(notes) }, ...imageParts],
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAIから空の応答が返されました");
  return JSON.parse(content);
}

export async function analyzeProduct(imagePaths: string[], notes: string[]): Promise<ProductAnalysis> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callOnce(imagePaths, notes);
      const parsed = ProductAnalysisSchema.safeParse(raw);
      if (parsed.success) {
        logger.info("商品分析に成功しました", { attempt });
        return parsed.data;
      }
      logger.warn("商品分析結果のJSON検証に失敗しました", { attempt });
    } catch (err) {
      logger.error("OpenAI画像解析呼び出しに失敗しました", {
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  throw new Error("商品の分析中にエラーが発生しました");
}
