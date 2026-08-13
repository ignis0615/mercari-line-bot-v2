import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/ai/analyzeProduct", () => ({ analyzeProduct: vi.fn() }));
vi.mock("../src/ai/generateListing", () => ({ generateListing: vi.fn() }));
vi.mock("../src/marketplace/yahooAuctionSearchProvider", () => ({
  yahooAuctionSearchProvider: { search: vi.fn(async () => []) },
}));
vi.mock("../src/utils/files", () => ({ deleteFiles: vi.fn(async () => {}) }));

import { analyzeProduct } from "../src/ai/analyzeProduct";
import { generateListing } from "../src/ai/generateListing";
import { yahooAuctionSearchProvider } from "../src/marketplace/yahooAuctionSearchProvider";
import { runAnalysis } from "../src/services/listingService";
import { addImage, getSession, hasSession, removeSession, startSession } from "../src/session/sessionManager";
import { deleteFiles } from "../src/utils/files";

const USER_ID = "U_listing_service_test";

const ANALYSIS = {
  category: null,
  brand: "Panasonic",
  product_name: "衣類スチーマー",
  model_number: "AB-1",
  color: "ブラック",
  condition: "良好",
  damage: [],
  accessories: [],
  missing_accessories: [],
  identification_confidence: 0.9,
};

const LISTING = {
  title: "パナソニック 衣類スチーマー",
  description: "商品説明文",
  recommended_price: 1000,
  quick_sale_price: 900,
  high_price: 1100,
  price_confidence: "medium" as const,
  price_note: "AIによる参考価格です。",
};

describe("listingService.runAnalysis", () => {
  beforeEach(async () => {
    vi.mocked(analyzeProduct).mockReset();
    vi.mocked(generateListing).mockReset();
    vi.mocked(yahooAuctionSearchProvider.search).mockReset().mockResolvedValue([]);
    vi.mocked(deleteFiles).mockClear();
    removeSession(USER_ID);
    await startSession(USER_ID);
    addImage(USER_ID, "/tmp/img1.jpg");
  });

  it("成功時、結果テキストを返し画像とセッションを削除する", async () => {
    vi.mocked(analyzeProduct).mockResolvedValueOnce(ANALYSIS);
    vi.mocked(generateListing).mockResolvedValueOnce(LISTING);

    const session = getSession(USER_ID)!;
    const text = await runAnalysis(session);

    expect(text).toContain("パナソニック 衣類スチーマー");
    expect(text).toContain("AI参考価格");
    expect(deleteFiles).toHaveBeenCalledWith(["/tmp/img1.jpg"]);
    expect(hasSession(USER_ID)).toBe(false);
  });

  it("失敗時は画像・セッションを保持したまま例外を投げ、再試行できる", async () => {
    vi.mocked(analyzeProduct).mockRejectedValueOnce(new Error("openai down"));

    const session = getSession(USER_ID)!;
    await expect(runAnalysis(session)).rejects.toThrow();

    expect(deleteFiles).not.toHaveBeenCalled();
    expect(hasSession(USER_ID)).toBe(true);
    expect(getSession(USER_ID)?.images).toEqual(["/tmp/img1.jpg"]);
  });

  it("ブランド・商品名が分かる場合はヤフオク検索を実行し、結果をgenerateListingに渡す", async () => {
    vi.mocked(analyzeProduct).mockResolvedValueOnce(ANALYSIS);
    vi.mocked(generateListing).mockResolvedValueOnce(LISTING);

    const session = getSession(USER_ID)!;
    await runAnalysis(session);

    expect(yahooAuctionSearchProvider.search).toHaveBeenCalledWith("Panasonic 衣類スチーマー AB-1");
    expect(generateListing).toHaveBeenCalledWith(ANALYSIS, [], []);
  });

  it("落札実績が見つかった場合は件数付きの注意書きと実績例を表示する", async () => {
    vi.mocked(analyzeProduct).mockResolvedValueOnce(ANALYSIS);
    vi.mocked(yahooAuctionSearchProvider.search).mockResolvedValueOnce([
      {
        platform: "yahoo_auction",
        title: "類似品A",
        price: 1200,
        url: "https://auctions.yahoo.co.jp/jp/auction/1",
        sold: true,
      },
      {
        platform: "yahoo_auction",
        title: "類似品B",
        price: 800,
        url: "https://auctions.yahoo.co.jp/jp/auction/2",
        sold: false,
      },
    ]);
    vi.mocked(generateListing).mockResolvedValueOnce(LISTING);

    const session = getSession(USER_ID)!;
    const text = await runAnalysis(session);

    expect(text).toContain("落札実績(1件)を参考に");
    expect(text).toContain("参考にした落札実績");
    expect(text).toContain("類似品A");
    expect(text).not.toContain("類似品B");
  });

  it("類似商品が見つからない場合は推定のみである旨を表示する", async () => {
    vi.mocked(analyzeProduct).mockResolvedValueOnce(ANALYSIS);
    vi.mocked(generateListing).mockResolvedValueOnce(LISTING);

    const session = getSession(USER_ID)!;
    const text = await runAnalysis(session);

    expect(text).toContain("類似商品の落札実績が見つからなかったため");
    expect(text).not.toContain("参考にした落札実績");
  });

  it("ブランド・商品名・型番がすべて不明な場合はヤフオク検索を行わない", async () => {
    vi.mocked(analyzeProduct).mockResolvedValueOnce({ ...ANALYSIS, brand: null, product_name: null, model_number: null });
    vi.mocked(generateListing).mockResolvedValueOnce(LISTING);

    const session = getSession(USER_ID)!;
    await runAnalysis(session);

    expect(yahooAuctionSearchProvider.search).not.toHaveBeenCalled();
  });
});
