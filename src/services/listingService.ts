import type { ListingContent, ProductAnalysis } from "../ai/schemas";
import { analyzeProduct } from "../ai/analyzeProduct";
import { generateListing } from "../ai/generateListing";
import type { ListingSession } from "../session/sessionManager";
import { removeSession, setStatus } from "../session/sessionManager";
import { deleteFiles } from "../utils/files";
import { logger } from "../utils/logger";

function buildCaveats(analysis: ProductAnalysis): string[] {
  const caveats: string[] = [];
  if (!analysis.brand) caveats.push("ブランドは画像から特定できませんでした。");
  if (!analysis.model_number) caveats.push("型番は画像から特定できませんでした。");
  if (analysis.identification_confidence < 0.7) {
    caveats.push("商品特定の精度が低いため、出品前に内容をご確認ください。");
  }
  return caveats;
}

export function formatResultMessage(analysis: ProductAnalysis, listing: ListingContent): string {
  const productLines = [analysis.brand, analysis.product_name, analysis.model_number, analysis.color].filter(
    (v): v is string => !!v
  );
  const caveats = buildCaveats(analysis);
  const confidencePercent = Math.round(analysis.identification_confidence * 100);

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
    "※現在はメルカリの実際の出品・売却相場を参照していません。",
    "価格はAIが商品情報・状態などから推定した参考価格です。",
    "",
    "【商品特定精度】",
    `${confidencePercent}%`,
  ];

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
  try {
    analysis = await analyzeProduct(session.images, session.notes);
    listing = await generateListing(analysis, session.notes);
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
  logger.info("分析が完了し、セッションを削除しました", { userId: session.userId });

  return formatResultMessage(analysis, listing);
}
