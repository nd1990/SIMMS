import { Prisma } from "@prisma/client";

// Transient Prisma/MySQL failures that are safe to retry on idempotent operations.
const TRANSIENT_CODES = new Set(["P1001", "P1002", "P1017", "P2024", "P2034"]);
const TRANSIENT_TEXT = [
  "can't reach database server",
  "server has closed the connection",
  "connection reset",
  "connection closed",
  "connection timed out",
  "econnreset",
  "econnrefused",
  "socket closed",
];

function isTransientDbError(err: unknown): boolean {
  if (err instanceof Prisma.PrismaClientKnownRequestError && TRANSIENT_CODES.has(err.code)) {
    return true;
  }
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return TRANSIENT_TEXT.some((needle) => message.includes(needle));
}

/**
 * Retries a database operation when it fails with a transient connectivity error.
 * Only use for idempotent operations (replace-style writes, updates, reads).
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
  baseDelayMs = 300
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastError;
}