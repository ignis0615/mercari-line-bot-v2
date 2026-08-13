import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { env } from "./config/env";
import { webhookRouter } from "./line/webhook";
import { startSessionCleanup } from "./session/cleanup";
import { logger } from "./utils/logger";

const app = new Hono();

app.get("/", (c) => c.text("mercari-line-bot-v2 is running"));
app.route("/webhook", webhookRouter);

startSessionCleanup();

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info("サーバーを起動しました", { port: info.port });
});
