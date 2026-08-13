import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/line/imageDownloader", () => ({
  downloadAndSaveImage: vi.fn(async () => "/tmp/fake.jpg"),
}));
vi.mock("../src/line/reply", () => ({
  replyText: vi.fn(async () => {}),
  pushText: vi.fn(async () => {}),
}));

import { handleEvent } from "../src/line/messageHandler";
import { pushText, replyText } from "../src/line/reply";
import { removeSession, startSession } from "../src/session/sessionManager";

const USER_ID = "U_message_handler_test";

function imageEvent(messageId: string) {
  return {
    type: "message",
    replyToken: `token-${messageId}`,
    source: { type: "user", userId: USER_ID },
    message: { type: "image", id: messageId },
  } as never;
}

describe("messageHandler 画像受信通知のデバウンス", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    removeSession(USER_ID);
    await startSession(USER_ID);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("連続で届いた画像は1回のpushにまとめられ、最新枚数が通知される", async () => {
    await handleEvent(imageEvent("m1"));
    await handleEvent(imageEvent("m2"));
    await handleEvent(imageEvent("m3"));

    expect(pushText).not.toHaveBeenCalled();
    expect(replyText).not.toHaveBeenCalled();

    await vi.runAllTimersAsync();

    expect(pushText).toHaveBeenCalledTimes(1);
    expect(pushText).toHaveBeenCalledWith(USER_ID, expect.stringContaining("3/20"));
  });

  it("無音区間を挟んで送ると通知も2回に分かれる", async () => {
    await handleEvent(imageEvent("m1"));
    await vi.advanceTimersByTimeAsync(2000);
    await handleEvent(imageEvent("m2"));
    await vi.runAllTimersAsync();

    expect(pushText).toHaveBeenCalledTimes(2);
    expect(pushText).toHaveBeenNthCalledWith(1, USER_ID, expect.stringContaining("1/20"));
    expect(pushText).toHaveBeenNthCalledWith(2, USER_ID, expect.stringContaining("2/20"));
  });
});
