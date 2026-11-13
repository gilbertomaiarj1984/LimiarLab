import { test } from "node:test";
import assert from "node:assert/strict";
import { bearerMatches, createSessionToken, passwordMatches, verifySessionToken } from "./session.ts";

const SECRET = "s".repeat(40);

test("sessão: token válido, expirado e adulterado", async () => {
  const now = Date.parse("2026-11-13T19:00:00Z");
  const t = await createSessionToken(SECRET, now);
  assert.ok(await verifySessionToken(t, SECRET, now));
  assert.ok(!(await verifySessionToken(t, "outro-segredo".repeat(4), now)));
  assert.ok(!(await verifySessionToken(t, SECRET, now + 181 * 86_400_000)));
  const [v, exp, sig] = t.split(".");
  assert.ok(!(await verifySessionToken(`${v}.${Number(exp) + 1000}.${sig}`, SECRET, now)));
  assert.ok(!(await verifySessionToken(undefined, SECRET, now)));
  assert.ok(!(await verifySessionToken(t, "", now)));
});

test("senha e token de importação", async () => {
  assert.ok(await passwordMatches("abc", "abc", SECRET));
  assert.ok(!(await passwordMatches("abd", "abc", SECRET)));
  assert.ok(!(await passwordMatches("", "", SECRET)));
  const tok = "t".repeat(40);
  assert.ok(await bearerMatches(`Bearer ${tok}`, tok));
  assert.ok(!(await bearerMatches(`Bearer ${tok}x`, tok)));
  assert.ok(!(await bearerMatches(tok, tok)));
  assert.ok(!(await bearerMatches("Bearer curto", "curto"))); // token curto demais nunca vale
  assert.ok(!(await bearerMatches(`Bearer ${tok}`, undefined)));
});
