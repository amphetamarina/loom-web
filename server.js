#!/usr/bin/env bun
// Bun static file server. No backend logic. All dynamic behaviour lives in
// the browser's Service Worker (sw.js). This server only ships files.

import { file } from "bun";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT ?? 3000);
const ROOT = import.meta.dir;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".mjs": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

function resolvePath(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  p = normalize(p).replace(/^([./\\]+)/, "/");
  return join(ROOT, p);
}

Bun.serve({
  port: PORT,
  development: true,
  async fetch(req) {
    const url = new URL(req.url);
    const fsPath = resolvePath(url.pathname);
    if (!fsPath.startsWith(ROOT)) return new Response("forbidden", { status: 403 });

    const f = file(fsPath);
    if (!(await f.exists())) return new Response("not found", { status: 404 });

    const headers = new Headers();
    const ext = extname(fsPath).toLowerCase();
    if (MIME[ext]) headers.set("Content-Type", MIME[ext]);
    headers.set("Cache-Control", "no-cache");
    if (url.pathname === "/sw.js") {
      headers.set("Service-Worker-Allowed", "/");
    }

    return new Response(f, { headers });
  },
});

console.log(`webloom :: http://localhost:${PORT}`);
