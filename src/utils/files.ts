import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import sharp from "sharp";
import { logger } from "./logger";

const BASE_DIR = path.join(os.tmpdir(), "mercari-line-bot");

// OpenAIへの送信ペイロックを抑えるため、保存時点で長辺を縮小しJPEG再圧縮する。
// スマホ写真を原寸(数MB×複数枚)のまま送ると、リクエストが肥大化して
// "Premature close" のような接続断が起きることがあったため導入。
const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 82;

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
  const original = Buffer.concat(chunks);

  const resized = await sharp(original)
    .rotate() // Exifの回転情報を反映してから正規化する
    .resize({
      width: MAX_IMAGE_DIMENSION,
      height: MAX_IMAGE_DIMENSION,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  await fs.writeFile(filePath, resized);
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
