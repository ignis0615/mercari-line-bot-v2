import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/ai/client", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
}));
vi.mock("../src/utils/files", () => ({
  readImageAsBase64: vi.fn(async () => "ZmFrZQ=="),
}));

import { openai } from "../src/ai/client";
import { analyzeProduct } from "../src/ai/analyzeProduct";

const createMock = vi.mocked(openai.chat.completions.create);

function jsonResponse(obj: unknown) {
  return { choices: [{ message: { content: JSON.stringify(obj) } }] } as never;
}

const VALID_ANALYSIS = {
  category: "家電",
  brand: "Panasonic",
  product_name: "衣類スチーマー",
  model_number: null,
  color: "ブラック",
  condition: "良好",
  damage: [],
  accessories: [],
  missing_accessories: [],
  identification_confidence: 0.8,
};

describe("analyzeProduct", () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it("正常なJSONを安全にパースして解析結果を返す", async () => {
    createMock.mockResolvedValueOnce(jsonResponse(VALID_ANALYSIS));
    const result = await analyzeProduct(["/tmp/a.jpg"], ["備考"]);
    expect(result.brand).toBe("Panasonic");
    expect(result.model_number).toBeNull();
  });

  it("OpenAI呼び出しが1回失敗しても再試行して成功する", async () => {
    createMock.mockRejectedValueOnce(new Error("network error")).mockResolvedValueOnce(jsonResponse(VALID_ANALYSIS));
    const result = await analyzeProduct(["/tmp/a.jpg"], []);
    expect(result.identification_confidence).toBe(0.8);
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("不正なJSON構造が続く場合は再試行後にエラーになる", async () => {
    createMock.mockResolvedValue(jsonResponse({ unexpected: "shape" }));
    await expect(analyzeProduct(["/tmp/a.jpg"], [])).rejects.toThrow();
    expect(createMock).toHaveBeenCalledTimes(2);
  });

  it("2回とも例外が発生した場合はエラーになる", async () => {
    createMock.mockRejectedValue(new Error("network error"));
    await expect(analyzeProduct(["/tmp/a.jpg"], [])).rejects.toThrow();
    expect(createMock).toHaveBeenCalledTimes(2);
  });
});
