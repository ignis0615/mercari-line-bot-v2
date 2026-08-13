import { analyzeProduct } from "../ai/analyzeProduct";
import { generateListing } from "../ai/generateListing";
import type { ListingContent, ProductAnalysis } from "../ai/schemas";
import { yahooAuctionSearchProvider } from "../marketplace/yahooAuctionSearchProvider";
import type { MarketplaceItem } from "../marketplace/types";
import type { ListingSession } from "../session/sessionManager";
import { removeSession, setStatus } from "../session/sessionManager";
import { deleteFiles } from "../utils/files";
import { logger } from "../utils/logger";

const MAX_COMP_EXAMPLES = 3;

function buildCaveats(analysis: ProductAnalysis): string[] {
  const caveats: string[] = [];
  if (!analysis.brand) caveats.push("ブランドは画像から特定できませんでした。");
  if (!analysis.model_number) caveats.push("型番は画像から特定できませんでした。");
  if (analysis.identification_confidence < 0.7) {
    caveats.push("商品特定の精度が低いため、出品前に内容をご確認ください。");
  }
  return caveats;
}

/** 分析結果から、類似商品検索に使うキーワードを組み立てる。手がかりが乏しい場合は検索しない。 */
function buildSearchQuery(analysis: ProductAnalysis): string | null {
  const parts = [analysis.brand, analysis.product_name, analysis.model_number].filter(
    (v): v is string => !!v
  );
  return parts.length > 0 ? parts.join(" ") : null;
}

function buildPriceDisclaimer(soldComps: MarketplaceItem[]): string[] {
  if (soldComps.length > 0) {
    return [
      `※ヤフオク!での類似商品の落札実績(${soldComps.length}件)を参考に、AIが算出した価格です。`,
      "メルカリでの実際の相場とは異なる場合があります。",
    ];
  }
  return [
    "※類似商品の落札実績が見つからなかったため、商品情報・状態などからAIが推定した参考価格です。",
    "実際のメルカリ・ヤフオクの相場データを参照したものではありません。",
  ];
}

export function formatResultMessage(
  analysis: ProductAnalysis,
  listing: ListingContent,
  comps: MarketplaceItem[] = []
): string {
  const productLines = [analysis.brand, analysis.product_name, analysis.model_number, analysis.color].filter(
    (v): v is string => !!v
  );
  const caveats = buildCaveats(analysis);
  const confidencePercent = Math.round(analysis.identification_confidence * 100);
  const soldComps = comps.filter((c) => c.sold);

  const sections = [
    "商品を分析しました。",
    "",
    "【商品】",
    productLines.length > 0 ? productLines.join("\n") : "(商品情報を特定できませんでした)",
    "",
    "【状態】",
    analysis.condition ?? "不明",
    "",
    "【メルカリ用タイトル】",
    listing.title,
    "",
    "【商品説明】",
    listing.description,
    "",
    "【AI参考価格】",
    "早く売りたい：",
    `${listing.quick_sale_price.toLocaleString("ja-JP")}円`,
    "おすすめ：",
    `${listing.recommended_price.toLocaleString("ja-JP")}円`,
    "高めスタート：",
    `${listing.high_price.toLocaleString("ja-JP")}円`,
    ...buildPriceDisclaimer(soldComps),
    "",
    "【商品特定精度】",
    `${confidencePercent}%`,
  ];

  if (soldComps.length > 0) {
    const examples = soldComps
      .slice(0, MAX_COMP_EXAMPLES)
      .map((c) => `・${c.title} / ${c.price.toLocaleString("ja-JP")}円`);
    sections.push("", "【参考にした落札実績(例)】", examples.join("\n"));
  }

  if (caveats.length > 0) {
    sections.push("", "【AIの判定に関する注意事項】", caveats.join("\n"));
  }

  return sections.join("\n");
}

/**
 * 分析〜出品文章生成までを実行し、LINEに送る結果テキストを返す。
 * 失敗時は画像・セッションを保持したまま例外を投げる(呼び出し側で再試行を許可するため)。
 * 成功時のみ画像とセッションを削除する。
 */
export async function runAnalysis(session: ListingSession): Promise<string> {
  setStatus(session.userId, "analyzing");
  logger.info("分析を開始します", { userId: session.userId, imageCount: session.images.length });

  let analysis: ProductAnalysis;
  let listing: ListingContent;
  let comps: MarketplaceItem[] = [];
  try {
    analysis = await analyzeProduct(session.images, session.notes);

    const query = buildSearchQuery(analysis);
    if (query) {
      comps = await yahooAuctionSearchProvider.search(query);
    }

    listing = await generateListing(analysis, session.notes, comps);
  } catch (err) {
    setStatus(session.userId, "error");
    logger.error("分析処理に失敗しました", {
      userId: session.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err instanceof Error ? err : new Error(String(err));
  }

  removeSession(session.userId);
  await deleteFiles(session.images);
  logger.info("分析が完了し、セッションを削除しました", { userId: session.userId, compsCount: comps.length });

  return formatResultMessage(analysis, listing, comps);
}
