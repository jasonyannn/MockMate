import assert from "node:assert/strict";
import test from "node:test";

async function render(path = "/", headers = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept: "text/html", ...headers } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
      DB: undefined,
      DOCUMENTS: undefined,
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished MockMate product", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<title>MockMate — Evidence wins interviews<\/title>/i);
  assert.match(html, /Your experience is strong/);
  assert.match(html, /Create my account/);
  assert.match(html, /signin-with-chatgpt/);
  assert.match(html, /Evidence wins interviews/);
  assert.match(html, /Skip to main content/);
  assert.match(html, /Accessibility and language settings/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("signed-in visitors get account-aware controls", async () => {
  const response = await render("/", {
    "oai-authenticated-user-id": "test-user",
    "oai-authenticated-user-email": "maya@example.com",
    "oai-authenticated-user-full-name": "Maya%20Chen",
    "oai-authenticated-user-full-name-encoding": "percent-encoded-utf-8",
  });
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html.replaceAll("<!-- -->", ""), /Welcome, Maya/);
  assert.match(html, /Open workspace/);
});
