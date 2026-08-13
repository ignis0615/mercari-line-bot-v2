import { OPENAI_MODEL } from "../config/env";
import type { MarketplaceItem } from "../marketplace/types";
import { logger } from "../utils/logger";
import { openai } from "./client";
import { buildListingSystemPrompt, buildListingUserText } from "./prompts";
import { ListingContentSchema, type ListingContent, type ProductAnalysis } from "./schemas";

const MAX_ATTEMPTS = 2;

async function callOnce(analysis: ProductAnalysis, notes: string[], comps: MarketplaceItem[]): Promise<unknown> {
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: buildListingSystemPrompt() },
      {
        role: "user",
        content: buildListingUserText(JSON.stringify(analysis), notes, comps),
      },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("OpenAIから空の応答が返されました");
  return JSON.parse(content);
}

export async function generateListing(
  analysis: ProductAnalysis,
  notes: string[],
  comps: MarketplaceItem[] = []
): Promise<ListingContent> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callOnce(analysis, notes, comps);
      const parsed = ListingContentSchema.safeParse(raw);
      if (parsed.success) {
        logger.info("出品文章・価格の生成に成功しました", { attempt, compsCount: comps.length });
        return parsed.data;
      }
      logger.warn("出品文章生成結果のJSON検証に失敗しました", { attempt });
    } catch (err) {
      logger.error("OpenAI出品文章生成呼び出しに失敗しました", {
        attempt,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  throw new Error("商品の分析中にエラーが発生しました");
}
