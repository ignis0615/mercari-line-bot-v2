import { messagingApi } from "@line/bot-sdk";
import { env } from "../config/env";
import { saveImageStream } from "../utils/files";
import { logger } from "../utils/logger";

const blobClient = new messagingApi.MessagingApiBlobClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});

/** LINEから画像コンテンツをダウンロードし、一時ファイルとして保存してパスを返す。 */
export async function downloadAndSaveImage(userId: string, messageId: string): Promise<string> {
  try {
    const stream = await blobClient.getMessageContent(messageId);
    return await saveImageStream(userId, stream);
  } catch (err) {
    logger.error("LINE画像の取得に失敗しました", {
      userId,
      messageId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new Error("画像の取得に失敗しました");
  }
}
