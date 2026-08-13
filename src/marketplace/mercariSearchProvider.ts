import { chromium, type Browser } from "playwright";
import { logger } from "../utils/logger";
import type { MarketplaceItem, MarketplaceSearchProvider } from "./types";

/**
 * メルカリの検索結果ページ(jp.mercari.com)を、実際のブラウザで開いて読み取る実装。
 *
 * 注意: メルカリは検索・相場取得のための公式APIを提供していません。この実装は
 * 「公開されている検索結果ページを通常のブラウザとして閲覧して読み取る」もので、
 * メルカリの内部APIの認証(署名)を偽装するような実装は行っていません。
 * とはいえ自動アクセスであることに変わりはなく、利用規約上グレーゾーンです。
 * 個人利用・低頻度の範囲に留めてください。ページ構造の変更で動かなくなる可能性もあります。
 */

const SEARCH_TIMEOUT_MS = 15000;
const MAX_SOLD_ITEMS = 15;
const MAX_ACTIVE_ITEMS = 5;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let browserPromise: Promise<Browser> | null = null;

function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ headless: true });
  }
  return browserPromise;
}

interface RawItem {
  id: string;
  title: string;
  price: number;
  sold: boolean;
}

async function scrapeStatus(query: string, status: "sold_out" | "on_sale"): Promise<RawItem[]> {
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: USER_AGENT, locale: "ja-JP" });
  try {
    const page = await context.newPage();
    const url = `https://jp.mercari.com/search?keyword=${encodeURIComponent(query)}&status=${status}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: SEARCH_TIMEOUT_MS });
    await page.waitForSelector('a[href^="/item/"]', { timeout: SEARCH_TIMEOUT_MS }).catch(() => null);

    return await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href^="/item/"]'));
      const results: { id: string; title: string; price: number; sold: boolean }[] = [];
      for (const link of links) {
        const idMatch = link.getAttribute("href")?.match(/\/item\/(m\d+)/);
        if (!idMatch) continue;
        const titleEl = link.querySelector('[data-testid="thumbnail-item-name"]');
        const thumb = link.querySelector('[role="img"][aria-label]');
        const ariaLabel = thumb?.getAttribute("aria-label") ?? "";
        const priceMatch = ariaLabel.match(/([\d,]+)円\s*$/);
        if (!titleEl?.textContent || !priceMatch) continue;
        results.push({
          id: idMatch[1],
          title: titleEl.textContent.trim(),
          price: Number(priceMatch[1].replace(/,/g, "")),
          sold: ariaLabel.includes("売り切れ"),
        });
      }
      return results;
    });
  } finally {
    await context.close();
  }
}

function dedupeById(items: RawItem[]): RawItem[] {
  const seen = new Set<string>();
  return items.filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}

export class MercariSearchProvider implements MarketplaceSearchProvider {
  async search(query: string): Promise<MarketplaceItem[]> {
    if (!query.trim()) return [];

    try {
      const [soldRaw, activeRaw] = await Promise.all([
        scrapeStatus(query, "sold_out"),
        scrapeStatus(query, "on_sale"),
      ]);

      // 広告枠の商品はstatusフィルタを無視して混入することがあるため、
      // 実際の売り切れ表示の有無で自前にフィルタし直す。
      const sold = dedupeById(soldRaw.filter((item) => item.sold)).slice(0, MAX_SOLD_ITEMS);
      const active = dedupeById(activeRaw.filter((item) => !item.sold)).slice(0, MAX_ACTIVE_ITEMS);

      logger.info("メルカリ検索が完了しました", { query, soldCount: sold.length, activeCount: active.length });

      return [...sold, ...active].map((item) => ({
        platform: "mercari" as const,
        title: item.title,
        price: item.price,
        url: `https://jp.mercari.com/item/${item.id}`,
        sold: item.sold,
      }));
    } catch (err) {
      logger.error("メルカリ検索に失敗しました", { query, error: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }
}

export const mercariSearchProvider: MarketplaceSearchProvider = new MercariSearchProvider();

/** プロセス終了時にヘッドレスブラウザを確実に閉じる。 */
export async function closeBrowser(): Promise<void> {
  if (!browserPromise) return;
  const browser = await browserPromise;
  browserPromise = null;
  await browser.close();
}
