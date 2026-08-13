import { env } from "../config/env";
import { deleteFiles } from "../utils/files";
import { logger } from "../utils/logger";
import { getAllSessions, removeSession } from "./sessionManager";

const SWEEP_INTERVAL_MS = 60 * 1000;

/** 最終操作から SESSION_TIMEOUT_MINUTES 経過したセッションを定期的に削除する。 */
export function startSessionCleanup(): NodeJS.Timeout {
  return setInterval(() => {
    const timeoutMs = env.SESSION_TIMEOUT_MINUTES * 60 * 1000;
    const now = Date.now();

    for (const session of getAllSessions()) {
      if (now - session.lastActivityAt.getTime() < timeoutMs) continue;

      removeSession(session.userId);
      void deleteFiles(session.images).then(() => {
        logger.info("セッションをタイムアウトにより削除しました", {
          userId: session.userId,
          imageCount: session.images.length,
        });
      });
    }
  }, SWEEP_INTERVAL_MS);
}
