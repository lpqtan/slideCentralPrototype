import crypto from "crypto";
import { getDb } from "./mongodb";

const AUTH_SECRET = process.env.AUTH_SECRET ?? "slide-central-dev-secret-change-me";
const COOKIE_NAME = "sc_auth";
const SESSION_DAYS = 7;

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function decodeB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

function signJwt(payload: Record<string, unknown>): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = b64url(Buffer.from(JSON.stringify(payload)));
  const signature = crypto.createHmac("sha256", AUTH_SECRET).update(`${header}.${body}`).digest();
  return `${header}.${body}.${b64url(signature)}`;
}

function verifyJwt(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expected = b64url(
    crypto.createHmac("sha256", AUTH_SECRET).update(`${header}.${body}`).digest()
  );
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const payload = JSON.parse(decodeB64url(body).toString("utf8"));
    if (payload.exp && Date.now() > payload.exp * 1000) return null;
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function createAuthToken(userId: string): string {
  return signJwt({
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400,
  });
}

export function verifyAuthToken(token: string): string | null {
  const payload = verifyJwt(token);
  if (!payload?.sub || typeof payload.sub !== "string") return null;
  return payload.sub;
}

export function getAuthTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${COOKIE_NAME}=([^;]*)`));
  return match?.[1] ?? null;
}

export function getAuthCookieHeader(token: string): string {
  const maxAge = SESSION_DAYS * 86400;
  return `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

export function getLogoutCookieHeader(): string {
  return `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}

export async function getCurrentUserId(request: Request): Promise<string | null> {
  const token = getAuthTokenFromRequest(request);
  if (!token) return null;
  return verifyAuthToken(token);
}

export async function requireAuth(request: Request): Promise<string> {
  const userId = await getCurrentUserId(request);
  if (!userId) throw new AuthError("Authentication required");
  return userId;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100_000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export interface DbUser {
  userId: string;
  passwordHash: string;
  salt: string;
  provider: string;
  apiKey: string;
  daemonAgent: string;
  daemonModel: string;
  strategy: string;
  createdAt: number;
}

export async function authenticateUser(
  username: string,
  password: string
): Promise<{ userId: string; token: string } | null> {
  const db = await getDb();
  const collection = db.collection<DbUser>("users");
  const user = await collection.findOne({ userId: username });
  if (!user) return null;

  const hash = hashPassword(password, user.salt);
  if (!crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"))) {
    return null;
  }

  return { userId: user.userId, token: createAuthToken(user.userId) };
}

export async function createUser(
  username: string,
  password: string
): Promise<DbUser> {
  const db = await getDb();
  const collection = db.collection<DbUser>("users");
  const existing = await collection.findOne({ userId: username });
  if (existing) throw new Error(`User '${username}' already exists`);

  const salt = generateSalt();
  const user: DbUser = {
    userId: username,
    passwordHash: hashPassword(password, salt),
    salt,
    provider: "gemini",
    apiKey: "",
    daemonAgent: "opencode",
    daemonModel: "opencode/big-pickle",
    strategy: "mock",
    createdAt: Date.now(),
  };
  await collection.insertOne(user);
  return user;
}

export async function getUserSettings(userId: string): Promise<{
  provider: string;
  apiKey: string;
  daemonAgent: string;
  daemonModel: string;
  strategy: string;
} | null> {
  const db = await getDb();
  const collection = db.collection<DbUser>("users");
  const user = await collection.findOne({ userId });
  if (!user) return null;
  return {
    provider: user.provider,
    apiKey: user.apiKey,
    daemonAgent: user.daemonAgent,
    daemonModel: user.daemonModel,
    strategy: user.strategy,
  };
}

export async function saveUserSettings(
  userId: string,
  settings: {
    provider?: string;
    apiKey?: string;
    daemonAgent?: string;
    daemonModel?: string;
    strategy?: string;
  }
): Promise<void> {
  const db = await getDb();
  const collection = db.collection<DbUser>("users");
  const $set: Record<string, unknown> = {};
  if (settings.provider !== undefined) $set.provider = settings.provider;
  if (settings.apiKey !== undefined) $set.apiKey = settings.apiKey;
  if (settings.daemonAgent !== undefined) $set.daemonAgent = settings.daemonAgent;
  if (settings.daemonModel !== undefined) $set.daemonModel = settings.daemonModel;
  if (settings.strategy !== undefined) $set.strategy = settings.strategy;
  if (Object.keys($set).length > 0) {
    await collection.updateOne({ userId }, { $set });
  }
}
