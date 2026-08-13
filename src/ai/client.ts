import https from "node:https";
import OpenAI from "openai";
import { env } from "../config/env";

// OpenAI SDKの既定はkeep-alive接続を使い回す設定になっており、Railway等のネットワーク環境で
// アイドル中の接続が無言で切断されると、それを再利用しようとして
// "Premature close" エラーになることがある。接続を使い回さず毎回張り直すことで回避する。
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  httpAgent: new https.Agent({ keepAlive: false }),
});
