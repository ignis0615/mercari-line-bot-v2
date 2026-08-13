import { describe, expect, it } from "vitest";
import { ListingContentSchema, ProductAnalysisSchema } from "../src/ai/schemas";

describe("ProductAnalysisSchema", () => {
  it("正しい形式のJSONを安全にパースできる", () => {
    const raw = {
      category: "家電",
      brand: "Panasonic",
      product_name: "衣類スチーマー",
      model_number: "NI-FS790-K",
      color: "ブラック",
      condition: "やや傷や汚れあり",
      damage: ["右側面に小さな傷"],
      accessories: ["給水カップ"],
      missing_accessories: ["箱", "説明書"],
      identification_confidence: 0.92,
    };
    const result = ProductAnalysisSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it("不明な項目がnullや空配列でも安全にパースできる", () => {
    const raw = {
      category: null,
      brand: null,
      product_name: null,
      model_number: null,
      color: null,
      condition: null,
      damage: [],
      accessories: [],
      missing_accessories: [],
      identification_confidence: 0.55,
    };
    const result = ProductAnalysisSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it("不正なJSON構造は安全に失敗として検出される", () => {
    const raw = { foo: "bar" };
    const result = ProductAnalysisSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("confidenceが範囲外の場合は失敗する", () => {
    const raw = {
      category: null,
      brand: null,
      product_name: null,
      model_number: null,
      color: null,
      condition: null,
      damage: [],
      accessories: [],
      missing_accessories: [],
      identification_confidence: 1.5,
    };
    const result = ProductAnalysisSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});

describe("ListingContentSchema", () => {
  it("正しい形式のJSONを安全にパースできる", () => {
    const raw = {
      title: "パナソニック 衣類スチーマー NI-FS790-K ブラック 動作確認済",
      description: "商品説明文...",
      recommended_price: 7480,
      quick_sale_price: 6980,
      high_price: 8280,
      price_confidence: "low",
      price_note: "現在はメルカリの実際の相場情報を取得していないため、AIが推定した参考価格です。",
    };
    const result = ListingContentSchema.safeParse(raw);
    expect(result.success).toBe(true);
  });

  it("price_confidenceが不正な値だと失敗する", () => {
    const raw = {
      title: "タイトル",
      description: "説明",
      recommended_price: 1000,
      quick_sale_price: 900,
      high_price: 1100,
      price_confidence: "very_high",
      price_note: "note",
    };
    const result = ListingContentSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });

  it("価格が数値でない場合は失敗する", () => {
    const raw = {
      title: "タイトル",
      description: "説明",
      recommended_price: "1000円",
      quick_sale_price: 900,
      high_price: 1100,
      price_confidence: "low",
      price_note: "note",
    };
    const result = ListingContentSchema.safeParse(raw);
    expect(result.success).toBe(false);
  });
});
