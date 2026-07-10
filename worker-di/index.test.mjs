// Unit tests for the #214 rate-limit cooldown helpers in the DI Worker.
// Run: node --test worker-di/
//
// Covers the pure helpers (email hashing + remaining-seconds math) and the KV
// round-trip (set -> remaining > 0 -> clear -> remaining 0) against a Map-backed
// fake KV that mimics the Cloudflare KV get/put/delete surface.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hashEmail,
  remainingSeconds,
  cooldownRemaining,
  setCooldown,
  clearCooldown,
} from "./index.js";

// A minimal fake of the Cloudflare KV binding.
function fakeKV() {
  const store = new Map();
  return {
    store,
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    async put(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
  };
}

test("hashEmail is deterministic and normalizes case + whitespace", async () => {
  const a = await hashEmail("Foo@Example.com");
  const b = await hashEmail("  foo@example.com  ");
  assert.equal(a, b, "casing/whitespace variants hash the same");
  assert.match(a, /^[0-9a-f]{64}$/, "is a 64-char sha-256 hex");

  const c = await hashEmail("other@example.com");
  assert.notEqual(a, c, "different accounts hash differently");
});

test("remainingSeconds floors at 0 and ceils partial seconds", () => {
  const now = 1_000_000;
  assert.equal(remainingSeconds(now - 5000, now), 0, "past -> 0");
  assert.equal(remainingSeconds(now, now), 0, "exactly now -> 0");
  assert.equal(remainingSeconds(now + 7200_000, now), 7200, "2h future -> 7200");
  assert.equal(remainingSeconds(now + 1, now), 1, "partial second ceils up");
});

test("cooldown round-trip: set -> active -> clear", async () => {
  const env = { MFA_SESSIONS: fakeKV() };
  const email = "athlete@garmin.test";

  assert.equal(await cooldownRemaining(env, email), 0, "no cooldown initially");

  const secs = await setCooldown(env, email);
  assert.equal(secs, 7200, "cooldown length is the 2h base");

  const rem = await cooldownRemaining(env, email);
  assert.ok(rem > 7100 && rem <= 7200, `remaining ~2h, got ${rem}`);

  await clearCooldown(env, email);
  assert.equal(await cooldownRemaining(env, email), 0, "cleared -> 0");
});

test("cooldown is per-account (one account's cooldown doesn't gate another)", async () => {
  const env = { MFA_SESSIONS: fakeKV() };
  await setCooldown(env, "a@garmin.test");
  assert.ok((await cooldownRemaining(env, "a@garmin.test")) > 0, "a is gated");
  assert.equal(
    await cooldownRemaining(env, "b@garmin.test"),
    0,
    "b is not gated by a's cooldown",
  );
});

test("fails open when KV is unavailable", async () => {
  assert.equal(await cooldownRemaining({}, "x@garmin.test"), 0, "no binding -> 0");
  assert.equal(
    await cooldownRemaining(undefined, "x@garmin.test"),
    0,
    "no env -> 0",
  );

  const throwingEnv = {
    MFA_SESSIONS: {
      async get() {
        throw new Error("KV down");
      },
      async put() {
        throw new Error("KV down");
      },
      async delete() {
        throw new Error("KV down");
      },
    },
  };
  assert.equal(
    await cooldownRemaining(throwingEnv, "x@garmin.test"),
    0,
    "KV get error -> 0 (proceed to Garmin)",
  );
  // setCooldown still reports the cooldown length even if the KV write fails,
  // so the caller can tell the user the real 429 they just hit.
  assert.equal(
    await setCooldown(throwingEnv, "x@garmin.test"),
    7200,
    "KV put error -> still returns cooldown length",
  );
});
