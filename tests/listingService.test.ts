import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/ai/analyzeProduct", () => ({ analyzeProduct: vi.fn() }));
vi.mock("../src/ai/generateListing", () => ({ generateListing: vi.fn() }));
vi.mock("../src/utils/files", () => ({ deleteFiles: vi.fn(async () => {}) }));

import { analyzeProduct } from "../src/ai/analyzeProduct";
import { generateListing } from "../src/ai/generateListing";
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
});
