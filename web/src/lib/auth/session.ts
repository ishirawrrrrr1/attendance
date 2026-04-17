import { createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getUserById, type SessionUser } from "@/lib/db/queries";

const COOKIE_NAME = "attendance_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = SessionUser & {
  exp: number;
};

function secret() {
  const value = process.env.SESSION_SECRET;

  if (!value) {
    throw new Error("SESSION_SECRET is not configured.");
  }

  return value;
}

function shouldUseSecureCookies() {
  return process.env.VERCEL === "1";
}

function encode(payload: SessionPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

function sanitizeAvatarForSession(value: string | null | undefined) {
  if (!value || value.startsWith("data:image/")) {
    return null;
  }

  return value;
}

function decode(token: string): SessionPayload | null {
  const [encodedPayload, encodedSignature] = token.split(".");

  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const expected = sign(encodedPayload);

  if (
    expected.length !== encodedSignature.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(encodedSignature))
  ) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as SessionPayload;

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export async function setSession(user: SessionUser) {
  const expiresAt = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = encode({
    ...user,
    avatar_data_url: sanitizeAvatarForSession(user.avatar_data_url),
    exp: expiresAt
  });
  const token = `${payload}.${sign(payload)}`;
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: shouldUseSecureCookies(),
    path: "/",
    maxAge: MAX_AGE_SECONDS
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = decode(token);

  if (!payload) {
    cookieStore.delete(COOKIE_NAME);
    return null;
  }

  return {
    id: payload.id,
    name: payload.name,
    username: payload.username,
    avatar_data_url: sanitizeAvatarForSession(payload.avatar_data_url),
    role: payload.role
  } satisfies SessionUser;
}

export async function requireUserSession() {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const latestUser = await getUserById(session.id);

  if (!latestUser) {
    await clearSession();
    redirect("/login");
  }

  return {
    id: latestUser.id,
    name: latestUser.name,
    username: latestUser.username,
    avatar_data_url: sanitizeAvatarForSession(latestUser.avatar_data_url),
    role: latestUser.role
  } satisfies SessionUser;
}

export async function requireAdminSession() {
  const session = await requireUserSession();

  if (session.role !== "admin") {
    redirect("/dashboard");
  }

  return session;
}
