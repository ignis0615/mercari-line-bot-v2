import { messagingApi } from "@line/bot-sdk";
import { env } from "../config/env";

const client = new messagingApi.MessagingApiClient({
  channelAccessToken: env.LINE_CHANNEL_ACCESS_TOKEN,
});

const MAX_CHARS_PER_MESSAGE = 4800;
const MAX_MESSAGES_PER_CALL = 5;

/** LINEの1メッセージ文字数上限を考慮して、長文を複数チャンクに分割する。 */
function chunkText(text: string): string[] {
  if (text.length <= MAX_CHARS_PER_MESSAGE) return [text];

  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > MAX_CHARS_PER_MESSAGE) {
    let splitAt = remaining.lastIndexOf("\n", MAX_CHARS_PER_MESSAGE);
    if (splitAt <= 0) splitAt = MAX_CHARS_PER_MESSAGE;
    chunks.push(remaining.slice(0, splitAt));
    remaining = remaining.slice(splitAt).replace(/^\n+/, "");
  }
  if (remaining.length > 0) chunks.push(remaining);
  return chunks;
}

function toTextMessages(text: string): messagingApi.TextMessage[] {
  return chunkText(text).map((chunk) => ({ type: "text", text: chunk }));
}

/** replyTokenを使って即時応答する。1回のreplyで最大5メッセージまで送信できる。 */
export async function replyText(replyToken: string, text: string): Promise<void> {
  const messages = toTextMessages(text).slice(0, MAX_MESSAGES_PER_CALL);
  await client.replyMessage({ replyToken, messages });
}

/** userIdにpushする。5メッセージを超える場合は複数回のpush呼び出しに分割する。 */
export async function pushText(userId: string, text: string): Promise<void> {
  const messages = toTextMessages(text);
  for (let i = 0; i < messages.length; i += MAX_MESSAGES_PER_CALL) {
    const batch = messages.slice(i, i + MAX_MESSAGES_PER_CALL);
    await client.pushMessage({ to: userId, messages: batch });
  }
}
