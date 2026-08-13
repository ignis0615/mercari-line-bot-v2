import { MAX_IMAGES_PER_LISTING } from "../config/env";
import { deleteFiles } from "../utils/files";

export type SessionStatus = "collecting" | "analyzing" | "error";

export interface ListingSession {
  userId: string;
  images: string[];
  notes: string[];
  createdAt: Date;
  lastActivityAt: Date;
  status: SessionStatus;
}

const sessions = new Map<string, ListingSession>();

function touch(session: ListingSession): void {
  session.lastActivityAt = new Date();
}

/** 新しい出品セッションを開始する。既存セッションがあれば画像を削除してから作り直す。 */
export async function startSession(userId: string): Promise<void> {
  const existing = sessions.get(userId);
  if (existing) {
    await deleteFiles(existing.images);
  }
  sessions.set(userId, {
    userId,
    images: [],
    notes: [],
    createdAt: new Date(),
    lastActivityAt: new Date(),
    status: "collecting",
  });
}

export function hasSession(userId: string): boolean {
  return sessions.has(userId);
}

export function getSession(userId: string): ListingSession | undefined {
  return sessions.get(userId);
}

export type AddImageResult =
  | { status: "added"; count: number }
  | { status: "limit_reached"; count: number }
  | { status: "no_session" };

export function addImage(userId: string, filePath: string): AddImageResult {
  const session = sessions.get(userId);
  if (!session) return { status: "no_session" };
  if (session.images.length >= MAX_IMAGES_PER_LISTING) {
    return { status: "limit_reached", count: session.images.length };
  }
  session.images.push(filePath);
  touch(session);
  return { status: "added", count: session.images.length };
}

export type AddNoteResult = "added" | "no_session";

export function addNote(userId: string, text: string): AddNoteResult {
  const session = sessions.get(userId);
  if (!session) return "no_session";
  session.notes.push(text);
  touch(session);
  return "added";
}

export function setStatus(userId: string, status: SessionStatus): void {
  const session = sessions.get(userId);
  if (session) {
    session.status = status;
    touch(session);
  }
}

/** セッションをメモリから削除して返す(ファイル削除は呼び出し側の責務)。 */
export function removeSession(userId: string): ListingSession | undefined {
  const session = sessions.get(userId);
  sessions.delete(userId);
  return session;
}

export function getAllSessions(): ListingSession[] {
  return [...sessions.values()];
}
