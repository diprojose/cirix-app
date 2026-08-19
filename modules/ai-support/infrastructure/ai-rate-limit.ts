import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { adminFirestore } from "@/shared/infrastructure/firebase-admin";

const COLLECTION = "ai_support_rate_limits";
const SESSION_COOKIE = "cirix_ai_session";
const SESSION_LIMIT = 10;
const DAILY_LIMIT = 20;

export class AiRateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super("AI support rate limit exceeded");
  }
}

export class AiRateLimitConfigurationError extends Error {}

function digest(secret: string, value: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

function endOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

function sessionCookie(value: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

export async function enforceAiRateLimit(request: NextRequest): Promise<{
  safetyIdentifier: string;
  setCookie: string | null;
}> {
  const secret = process.env.AI_RATE_LIMIT_SECRET;
  if (!secret || secret.length < 24) {
    throw new AiRateLimitConfigurationError("AI_RATE_LIMIT_SECRET must contain at least 24 characters");
  }

  const existingSession = request.cookies.get(SESSION_COOKIE)?.value;
  const rawSession = existingSession && /^[a-f0-9]{48}$/.test(existingSession)
    ? existingSession
    : randomBytes(24).toString("hex");
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const network = forwarded || request.headers.get("x-real-ip") || `session:${rawSession}`;
  const sessionHash = digest(secret, `session:${rawSession}`);
  const networkHash = digest(secret, `network:${network}`);
  const now = new Date();
  const dayEnd = endOfUtcDay(now);
  const day = now.toISOString().slice(0, 10);

  const firestore = adminFirestore();
  const sessionRef = firestore.collection(COLLECTION).doc(`session_${sessionHash}`);
  const dailyRef = firestore.collection(COLLECTION).doc(`daily_${day}_${networkHash}`);

  await firestore.runTransaction(async (transaction) => {
    const [sessionSnapshot, dailySnapshot] = await Promise.all([
      transaction.get(sessionRef),
      transaction.get(dailyRef),
    ]);
    const sessionCount = Number(sessionSnapshot.data()?.count ?? 0);
    const dailyCount = Number(dailySnapshot.data()?.count ?? 0);

    if (sessionCount >= SESSION_LIMIT || dailyCount >= DAILY_LIMIT) {
      const retry = Math.max(1, Math.ceil((dayEnd.getTime() - now.getTime()) / 1000));
      throw new AiRateLimitError(retry);
    }

    transaction.set(sessionRef, {
      count: sessionCount + 1,
      updatedAt: now,
      expiresAt: dayEnd,
    });
    transaction.set(dailyRef, {
      count: dailyCount + 1,
      updatedAt: now,
      expiresAt: dayEnd,
    });
  });

  return {
    safetyIdentifier: `cirix_${sessionHash.slice(0, 32)}`,
    setCookie: existingSession ? null : sessionCookie(rawSession),
  };
}
