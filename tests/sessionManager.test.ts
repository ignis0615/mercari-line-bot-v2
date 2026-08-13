import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/utils/files", () => ({
  deleteFiles: vi.fn(async () => {}),
}));

import {
  addImage,
  addNote,
  getAllSessions,
  getSession,
  hasSession,
  removeSession,
  startSession,
} from "../src/session/sessionManager";

const USER_ID = "U_test_user";

describe("sessionManager", () => {
  beforeEach(() => {
    removeSession(USER_ID);
  });

  it("出品開始でセッションが作成される", async () => {
    await startSession(USER_ID);
    expect(hasSession(USER_ID)).toBe(true);
    const session = getSession(USER_ID);
    expect(session?.images).toEqual([]);
    expect(session?.notes).toEqual([]);
  });

  it("画像を1枚保存できる", async () => {
    await startSession(USER_ID);
    const result = addImage(USER_ID, "/tmp/a.jpg");
    expect(result).toEqual({ status: "added", count: 1 });
  });

  it("画像を20枚保存でき、21枚目は拒否される", async () => {
    await startSession(USER_ID);
    for (let i = 0; i < 20; i++) {
      const result = addImage(USER_ID, `/tmp/${i}.jpg`);
      expect(result.status).toBe("added");
    }
    const overLimit = addImage(USER_ID, "/tmp/21.jpg");
    expect(overLimit).toEqual({ status: "limit_reached", count: 20 });
    expect(getSession(USER_ID)?.images.length).toBe(20);
  });

  it("備考を複数回追加すると蓄積される", async () => {
    await startSession(USER_ID);
    addNote(USER_ID, "右側面に傷あり");
    addNote(USER_ID, "箱なし、動作確認済み");
    expect(getSession(USER_ID)?.notes).toEqual(["右側面に傷あり", "箱なし、動作確認済み"]);
  });

  it("セッションがない状態での画像追加はno_sessionになる", () => {
    const result = addImage("U_no_session", "/tmp/a.jpg");
    expect(result).toEqual({ status: "no_session" });
  });

  it("セッションがない状態での備考追加はno_sessionになる", () => {
    const result = addNote("U_no_session_2", "テスト");
    expect(result).toBe("no_session");
  });

  it("キャンセル(removeSession)でセッションが消える", async () => {
    await startSession(USER_ID);
    const removed = removeSession(USER_ID);
    expect(removed?.userId).toBe(USER_ID);
    expect(hasSession(USER_ID)).toBe(false);
  });

  it("同じユーザーが新しい出品を開始すると画像がリセットされる", async () => {
    await startSession(USER_ID);
    addImage(USER_ID, "/tmp/old.jpg");
    await startSession(USER_ID);
    expect(getSession(USER_ID)?.images).toEqual([]);
  });

  it("getAllSessionsで全セッションを取得できる", async () => {
    await startSession(USER_ID);
    const all = getAllSessions();
    expect(all.some((s) => s.userId === USER_ID)).toBe(true);
  });
});
