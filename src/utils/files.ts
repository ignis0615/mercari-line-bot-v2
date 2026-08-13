import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import { logger } from "./logger";

const BASE_DIR = path.join(os.tmpdir(), "mercari-line-bot");

function userDir(userId: string): string {
  return path.join(BASE_DIR, userId);
}

export async function saveImageStream(userId: string, stream: Readable): Promise<string> {
  const dir = userDir(userId);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${randomUUID()}.jpg`);

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  await fs.writeFile(filePath, Buffer.concat(chunks));
  return filePath;
}

export async function readImageAsBase64(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return buffer.toString("base64");
}

export async function deleteFiles(filePaths: string[]): Promise<void> {
  await Promise.all(
    filePaths.map(async (filePath) => {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code;
        if (code !== "ENOENT") {
          logger.error("一時ファイルの削除に失敗しました", { filePath });
        }
      }
    })
  );
}

export async function deleteUserDir(userId: string): Promise<void> {
  try {
    await fs.rm(userDir(userId), { recursive: true, force: true });
  } catch {
    // ディレクトリが存在しない場合等は無視
  }
}
