import * as cheerio from "cheerio";
import { logger } from "../utils/logger";
import type { MarketplaceItem, MarketplaceSearchProvider } from "./types";

/**
 * ヤフオク!の「落札相場・落札価格」検索(closedsearch)を取得する実装。
 *
 * このページはYahoo!オークションが提供する公式の落札価格リサーチ機能で、
 * auctions.yahoo.co.jp の robots.txt でも `/closedsearch/closedsearch` は
 * 明示的にAllowされている(他の検索パスは概ねDisallow)。サーバーサイドで
 * レンダリングされた通常のHTMLページを取得しているだけで、ヘッドレスブラウザや
 * 内部APIの認証を偽装するような実装は行っていない。
 */

const SEARCH_TIMEOUT_MS = 10000;
const MAX_ITEMS = 15;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parsePrice(dataClParams: string): number | null {
  // data-cl-params の中に "etc:p=15480,b=1,..." のようにカンマ区切りで価格が入っている
  const etcMatch = dataClParams.match(/etc:([^;]+)/);
  if (!etcMatch) return null;
  const priceMatch = etcMatch[1].match(/(?:^|,)p=(\d+)/);
  if (!priceMatch) return null;
  return Number(priceMatch[1]);
}

function parseId(dataClParams: string): string | null {
  const idMatch = dataClParams.match(/cid:(\w+)/);
  return idMatch ? idMatch[1] : null;
}

export class YahooAuctionSearchProvider implements MarketplaceSearchProvider {
  async search(query: string): Promise<MarketplaceItem[]> {
    if (!query.trim()) return [];

    const url = `https://auctions.yahoo.co.jp/closedsearch/closedsearch?p=${encodeURIComponent(
      query
    )}&va=${encodeURIComponent(query)}&exflg=1&b=1&n=${MAX_ITEMS}`;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
      let html: string;
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT, "Accept-Language": "ja-JP" },
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`HTTPステータス ${response.status}`);
        }
        html = await response.text();
      } finally {
        clearTimeout(timer);
      }

      const $ = cheerio.load(html);
      const items = new Map<string, MarketplaceItem>();

      $("a[data-cl-params]").each((_, el) => {
        const dataClParams = $(el).attr("data-cl-params") ?? "";
        const href = $(el).attr("href") ?? "";
        if (!href.includes("/jp/auction/")) return;

        const id = parseId(dataClParams);
        const price = parsePrice(dataClParams);
        const title = $(el).attr("title")?.trim();
        if (!id || !price || !title || items.has(id)) return;

        items.set(id, {
          platform: "yahoo_auction",
          title,
          price,
          url: `https://auctions.yahoo.co.jp/jp/auction/${id}`,
          sold: true,
        });
      });

      const results = [...items.values()].slice(0, MAX_ITEMS);
      logger.info("ヤフオク落札相場検索が完了しました", { query, count: results.length });
      return results;
    } catch (err) {
      logger.error("ヤフオク落札相場検索に失敗しました", {
        query,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }
}

export const yahooAuctionSearchProvider: MarketplaceSearchProvider = new YahooAuctionSearchProvider();
