import type { webhook } from "@line/bot-sdk";
import { MAX_IMAGES_PER_LISTING, env } from "../config/env";
import { runAnalysis } from "../services/listingService";
import * as sessionManager from "../session/sessionManager";
import { deleteFiles } from "../utils/files";
import { logger } from "../utils/logger";
import { downloadAndSaveImage } from "./imageDownloader";
import { pushText, replyText } from "./reply";

const COMMAND_START = "出品開始";
const COMMAND_ANALYZE = "分析開始";
const COMMAND_CANCEL = "キャンセル";
const COMMAND_STATUS = "状態確認";

const START_GUIDE = [
  "商品の写真を送ってください。",
  "最大20枚まで送れます。",
  "おすすめ写真：",
  "・商品全体",
  "・正面",
  "・背面",
  "・メーカー名",
  "・型番ラベル",
  "・付属品",
  "・傷や汚れ",
  "写真を送ったあと、傷や付属品などの補足情報を文章で送ってください。",
  "すべて送り終わったら『分析開始』と送ってください。",
].join("\n");

const NO_SESSION_TEXT = "先に『出品開始』と送ってください。";
const ANALYSIS_ERROR_TEXT = "商品の分析中にエラーが発生しました。もう一度お試しください。";

export async function handleEvent(event: webhook.Event): Promise<void> {
  if (event.type !== "message") return;

  const source = event.source;
  if (!source || source.type !== "user" || !source.userId) return;
  const userId = source.userId;
  const replyToken = event.replyToken;

  logger.info("LINEイベントを受信しました", { userId, messageType: event.message.type });

  if (event.message.type === "text") {
    await handleText(userId, replyToken, event.message.text.trim());
  } else if (event.message.type === "image") {
    await handleImage(userId, replyToken, event.message.id);
  }
}

async function handleText(userId: string, replyToken: string | undefined, text: string): Promise<void> {
  switch (text) {
    case COMMAND_START:
      await handleStartCommand(userId, replyToken);
      return;
    case COMMAND_ANALYZE:
      await handleAnalyzeCommand(userId, replyToken);
      return;
    case COMMAND_CANCEL:
      await handleCancelCommand(userId, replyToken);
      return;
    case COMMAND_STATUS:
      await handleStatusCommand(userId, replyToken);
      return;
    default:
      await handleNote(userId, replyToken, text);
  }
}

async function handleStartCommand(userId: string, replyToken: string | undefined): Promise<void> {
  await sessionManager.startSession(userId);
  logger.info("出品セッションを開始しました", { userId });
  if (replyToken) await replyText(replyToken, START_GUIDE);
}

async function handleNote(userId: string, replyToken: string | undefined, text: string): Promise<void> {
  if (text.length === 0) return;
  const result = sessionManager.addNote(userId, text);
  if (result === "no_session") {
    if (replyToken) await replyText(replyToken, NO_SESSION_TEXT);
    return;
  }
  logger.info("備考を追加しました", { userId });
}

async function handleCancelCommand(userId: string, replyToken: string | undefined): Promise<void> {
  const session = sessionManager.removeSession(userId);
  if (session) {
    await deleteFiles(session.images);
  }
  logger.info("セッションをキャンセルしました", { userId });
  if (replyToken) await replyText(replyToken, "今回の出品データを削除しました。");
}

async function handleStatusCommand(userId: string, replyToken: string | undefined): Promise<void> {
  const session = sessionManager.getSession(userId);
  if (!session) {
    if (replyToken) await replyText(replyToken, NO_SESSION_TEXT);
    return;
  }
  const notesStatus = session.notes.length > 0 ? "あり" : "なし";
  const text = [
    "現在の出品データ",
    `画像：${session.images.length}枚`,
    `備考：${notesStatus}`,
    "準備ができたら『分析開始』と送ってください。",
  ].join("\n");
  if (replyToken) await replyText(replyToken, text);
}

async function handleAnalyzeCommand(userId: string, replyToken: string | undefined): Promise<void> {
  const session = sessionManager.getSession(userId);
  if (!session) {
    if (replyToken) await replyText(replyToken, NO_SESSION_TEXT);
    return;
  }
  if (session.images.length === 0) {
    if (replyToken) await replyText(replyToken, "画像が登録されていません。商品の写真を送ってください。");
    return;
  }

  if (replyToken) {
    await replyText(replyToken, "分析を開始します。少々お待ちください。");
  }
  logger.info("分析開始コマンドを受け付けました", { userId, imageCount: session.images.length });

  try {
    const resultText = await runAnalysis(session);
    await pushText(userId, resultText);
  } catch (err) {
    logger.error("分析処理でエラーが発生しました", {
      userId,
      error: err instanceof Error ? err.message : String(err),
    });
    await pushText(userId, ANALYSIS_ERROR_TEXT);
  }
}

async function handleImage(userId: string, replyToken: string | undefined, messageId: string): Promise<void> {
  const existing = sessionManager.getSession(userId);
  if (!existing) {
    if (replyToken) await replyText(replyToken, NO_SESSION_TEXT);
    return;
  }

  if (existing.images.length >= MAX_IMAGES_PER_LISTING) {
    if (replyToken) {
      await replyText(
        replyToken,
        `画像は最大${MAX_IMAGES_PER_LISTING}枚までです。現在${MAX_IMAGES_PER_LISTING}枚登録されています。`
      );
    }
    return;
  }

  let filePath: string;
  try {
    filePath = await downloadAndSaveImage(userId, messageId);
  } catch {
    if (replyToken) await replyText(replyToken, "画像の取得に失敗しました。もう一度お試しください。");
    return;
  }

  const result = sessionManager.addImage(userId, filePath);
  if (result.status !== "added") {
    await deleteFiles([filePath]);
    if (result.status === "limit_reached" && replyToken) {
      await replyText(
        replyToken,
        `画像は最大${MAX_IMAGES_PER_LISTING}枚までです。現在${MAX_IMAGES_PER_LISTING}枚登録されています。`
      );
    } else if (result.status === "no_session" && replyToken) {
      await replyText(replyToken, NO_SESSION_TEXT);
    }
    return;
  }

  logger.info("画像を受信しました", { userId, count: result.count });
  if (env.SEND_IMAGE_RECEIVED_MESSAGE && replyToken) {
    await replyText(replyToken, `画像を受け取りました。（${result.count}/${MAX_IMAGES_PER_LISTING}枚）`);
  }
}
