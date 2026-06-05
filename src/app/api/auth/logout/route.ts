import { NextResponse } from "next/server";
import { getLogoutCookieHeader } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", getLogoutCookieHeader());
  return res;
}
