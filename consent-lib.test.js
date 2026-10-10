// Run: node --test consent
import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizationId, isClaude, looksLikeEmail, redirectHost, returnUrl } from "./consent-lib.js";

test("reads a well-formed authorization id only", () => {
  assert.equal(authorizationId("https://x.app/oauth/consent?authorization_id=abc_123-XYZ"), "abc_123-XYZ");
  assert.equal(authorizationId("https://x.app/oauth/consent"), null);
  assert.equal(authorizationId("https://x.app/oauth/consent?authorization_id=<script>"), null);
});

test("return address keeps the request and drops the code", () => {
  assert.equal(
    returnUrl("https://x.app/oauth/consent?authorization_id=a1b2c3&code=zzz", "a1b2c3"),
    "https://x.app/oauth/consent?authorization_id=a1b2c3",
  );
});

test("shows where access goes", () => {
  assert.equal(redirectHost("https://claude.ai/api/mcp/auth_callback"), "claude.ai");
  assert.ok(isClaude("https://claude.ai/api/mcp/auth_callback"));
  assert.ok(!isClaude("http://localhost:3118/callback"));
  assert.equal(redirectHost("not a url"), "unknown");
});

test("email check", () => {
  assert.ok(looksLikeEmail("me@example.com"));
  assert.ok(!looksLikeEmail("me@example"));
});
