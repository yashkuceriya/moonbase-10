import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
const templateRoot = new URL("../", import.meta.url);

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html", host: "localhost" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Moonbase 10 learner mission", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Moonbase 10 — Adaptive Math Adventure<\/title>/i);
  assert.match(html, /MOONBASE 10/);
  assert.match(html, /Wake the west wing/);
  assert.match(html, /6 rows of 4 cells/);
  assert.match(html, /Learner mission/);
  assert.match(html, /Learning map/);
  assert.match(html, /ORBIT/);
  assert.match(html, /Every mistake maps the next mission/);
  assert.doesNotMatch(html, developmentPreviewMeta);
  assert.doesNotMatch(html, /react-loading-skeleton|Your site is taking shape/);
});

test("ships product metadata, research grounding, and no starter preview", async () => {
  const [page, layout, css, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    access(new URL("../public/og.png", import.meta.url)),
    access(new URL("../public/favicon.png", import.meta.url)),
  ]);

  assert.match(packageJson, /"name": "moonbase-10"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(page, /^"use client";/);
  assert.match(page, /misconception/i);
  assert.match(page, /ADAPTATION TRACE/);
  assert.match(page, /https:\/\/ies\.ed\.gov\/ncee\/wwc\/practiceguide\/26/);
  assert.match(layout, /generateMetadata/);
  assert.match(layout, /new URL\("\/og\.png", baseUrl\)/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.doesNotMatch(page + layout + css, /codex-preview|_sites-preview|SkeletonPreview|Starter Project/);

  await assert.rejects(access(new URL("app/_sites-preview", templateRoot)));
});
