import { validateSignature, type webhook } from "@line/bot-sdk";
import { Hono } from "hono";
import { env } from "../config/env";
import { logger } from "../utils/logger";
import { handleEvent } from "./messageHandler";

export const webhookRouter = new Hono();

webhookRouter.post("/", async (c) => {
  const signature = c.req.header("x-line-signature");
  const rawBody = await c.req.text();

  if (!signature || !validateSignature(rawBody, env.LINE_CHANNEL_SECRET, signature)) {
    logger.warn("LINE署名検証に失敗しました");
    return c.text("Invalid signature", 401);
  }

  let payload: webhook.CallbackRequest;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.text("Invalid body", 400);
  }

  const events = payload.events ?? [];
  // LINEへは即座に200を返し、実処理(reply/pushの送信含む)はバックグラウンドで行う
  void processEvents(events);

  return c.text("OK", 200);
});

async function processEvents(events: webhook.Event[]): Promise<void> {
  // 同一ユーザーからの複数画像などを正しい順序でカウントするため、逐次処理する
  for (const event of events) {
    try {
      await handleEvent(event);
    } catch (err) {
      logger.error("イベント処理中にエラーが発生しました", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
