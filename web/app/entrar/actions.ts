"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, createSessionToken, passwordMatches } from "@/lib/session";

export async function entrar(form: FormData) {
  const secret = process.env.SESSION_SECRET ?? "";
  const expected = process.env.APP_PASSWORD ?? "";
  const input = String(form.get("senha") ?? "");
  if (!secret || !expected || !(await passwordMatches(input, expected, secret))) {
    // Atraso fixo para encarecer tentativa e erro.
    await new Promise((r) => setTimeout(r, 800));
    redirect("/entrar?erro=1");
  }
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
  redirect("/");
}
