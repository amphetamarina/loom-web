// webloom — service worker / fake backend
// Intercepts /api/* requests and serves HTML fragments backed by IndexedDB.

const DB_NAME = "webloom";
const STORE = "kv";

// ---------- IndexedDB ----------
function openDb() {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function dbGet(key) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
async function dbSet(key, val) {
  const db = await openDb();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

// ---------- defaults ----------
function defaultSettings() {
  return {
    generationSettings: { model: "gpt-4o-mini", temperature: 0.8 },
    modelConfigs: {
      "gpt-4o-mini": { name: "gpt-4o-mini", provider: "openai", api_type: "chat" },
      "gpt-4o": { name: "gpt-4o", provider: "openai", api_type: "chat" },
      "claude-3-5-sonnet-20241022": { name: "claude-3-5-sonnet-20241022", provider: "anthropic", api_type: "chat" },
    },
    apiKeys: { openai: "", anthropic: "" },
    preferences: { node_text_truncate: 200 },
  };
}

// ---------- state ----------
let state = null;
const streams = new Map(); // streamId -> { treeId, nodeId, abort }

async function loadState() {
  if (state) return state;
  const t = (await dbGet("trees")) || { trees: {}, activeTreeId: null };
  const s = (await dbGet("settings")) || defaultSettings();
  state = {
    trees: t.trees || {},
    activeTreeId: t.activeTreeId || null,
    settings: { ...defaultSettings(), ...s, apiKeys: { ...defaultSettings().apiKeys, ...(s.apiKeys || {}) } },
  };
  if (Object.keys(state.trees).length === 0) {
    createTree("Untitled");
    await persistTrees();
  } else if (!state.activeTreeId || !state.trees[state.activeTreeId]) {
    state.activeTreeId = Object.keys(state.trees)[0];
  }
  return state;
}
async function persistTrees() {
  await dbSet("trees", { trees: state.trees, activeTreeId: state.activeTreeId });
}
async function persistSettings() {
  await dbSet("settings", state.settings);
}

async function migrate(legacy) {
  await loadState();
  if (!(await dbGet("__migrated_v1"))) {
    const trees = legacy?.trees?.state?.trees;
    if (trees && Object.keys(trees).length && Object.keys(state.trees).length <= 1) {
      // overwrite the default empty tree
      state.trees = trees;
      state.activeTreeId = legacy.trees.state.activeTreeId || Object.keys(trees)[0];
      await persistTrees();
    }
    const s = legacy?.settings?.state;
    if (s) {
      if (s.generationSettings) state.settings.generationSettings = { ...state.settings.generationSettings, ...s.generationSettings };
      if (s.modelConfigs && Object.keys(s.modelConfigs).length) state.settings.modelConfigs = s.modelConfigs;
      if (s.apiKeys) state.settings.apiKeys = { ...state.settings.apiKeys, ...s.apiKeys };
      if (s.preferences) state.settings.preferences = { ...state.settings.preferences, ...s.preferences };
      await persistSettings();
    }
    await dbSet("__migrated_v1", true);
  }
}

// ---------- utils ----------
const uuid = () => crypto.randomUUID();
const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const truncate = (s, n) => {
  if (!s) return "";
  const t = String(s).replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n) + "…";
};
const html = (strings, ...vals) => {
  let out = "";
  strings.forEach((str, i) => {
    out += str;
    if (i < vals.length) {
      const v = vals[i];
      if (Array.isArray(v)) out += v.join("");
      else if (v == null || v === false) out += "";
      else out += String(v);
    }
  });
  return out;
};

// ---------- tree ops ----------
function createTree(name) {
  const id = uuid();
  const rootId = uuid();
  const now = Date.now();
  state.trees[id] = {
    id, name: name || "Untitled", rootId,
    nodes: { [rootId]: { id: rootId, text: "", parentId: null, children: [], created: now, modified: now } },
    currentNodeId: rootId, created: now, modified: now,
  };
  state.activeTreeId = id;
  return id;
}
function deleteTree(id) {
  delete state.trees[id];
  if (state.activeTreeId === id) {
    state.activeTreeId = Object.keys(state.trees)[0] || null;
    if (!state.activeTreeId) createTree("Untitled");
  }
}
function createNode(treeId, parentId, text) {
  const t = state.trees[treeId];
  if (!t) return null;
  const id = uuid();
  const now = Date.now();
  t.nodes[id] = { id, text: text || "", parentId, children: [], created: now, modified: now };
  if (parentId && t.nodes[parentId]) t.nodes[parentId].children.push(id);
  t.modified = now;
  return id;
}
function updateNode(treeId, nodeId, updates) {
  const t = state.trees[treeId];
  if (!t || !t.nodes[nodeId]) return;
  Object.assign(t.nodes[nodeId], updates);
  t.nodes[nodeId].modified = Date.now();
  t.modified = Date.now();
}
function deleteNode(treeId, nodeId) {
  const t = state.trees[treeId];
  if (!t || !t.nodes[nodeId]) return;
  if (nodeId === t.rootId) return;
  const n = t.nodes[nodeId];
  if (n.parentId && t.nodes[n.parentId]) {
    t.nodes[n.parentId].children = t.nodes[n.parentId].children.filter((c) => c !== nodeId);
  }
  const stack = [nodeId];
  while (stack.length) {
    const id = stack.pop();
    const node = t.nodes[id];
    if (!node) continue;
    stack.push(...node.children);
    delete t.nodes[id];
  }
  if (!t.nodes[t.currentNodeId]) t.currentNodeId = t.rootId;
  t.modified = Date.now();
}
function reparent(treeId, nodeId, newParentId) {
  const t = state.trees[treeId];
  if (!t) return;
  const n = t.nodes[nodeId];
  const p = t.nodes[newParentId];
  if (!n || !p || nodeId === newParentId) return;
  let cur = newParentId;
  while (cur) {
    if (cur === nodeId) return;
    cur = t.nodes[cur]?.parentId;
  }
  if (n.parentId && t.nodes[n.parentId]) {
    t.nodes[n.parentId].children = t.nodes[n.parentId].children.filter((c) => c !== nodeId);
  }
  n.parentId = newParentId;
  if (!p.children.includes(nodeId)) p.children.push(nodeId);
  t.modified = Date.now();
}
function ancestry(tree, nodeId) {
  const list = [];
  let cur = nodeId;
  while (cur && tree.nodes[cur]) {
    list.unshift(tree.nodes[cur]);
    cur = tree.nodes[cur].parentId;
  }
  return list;
}

// ---------- AI (OpenAI-compat) ----------
function resolveModelConfig(modelName) {
  const cfg = state.settings.modelConfigs[modelName] || { name: modelName, provider: "custom", api_type: "chat" };
  let baseURL = cfg.api_base;
  if (!baseURL) {
    if (cfg.provider === "openai") baseURL = "https://api.openai.com/v1";
    else if (cfg.provider === "anthropic") baseURL = "https://api.anthropic.com/v1";
    else if (cfg.provider === "ollama") baseURL = "http://localhost:11434/v1";
    else baseURL = "https://api.openai.com/v1";
  }
  let apiKey = cfg.api_key;
  if (!apiKey) {
    if (cfg.provider === "openai") apiKey = state.settings.apiKeys.openai;
    else if (cfg.provider === "anthropic") apiKey = state.settings.apiKeys.anthropic;
  }
  return { cfg, baseURL, apiKey };
}

async function* streamAI({ prompt, modelName, temperature, abortSignal }) {
  const { cfg, baseURL, apiKey } = resolveModelConfig(modelName);
  const useCompletions = cfg.api_type === "completions";
  const url = `${baseURL.replace(/\/$/, "")}/${useCompletions ? "completions" : "chat/completions"}`;
  const headers = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
    if (cfg.provider === "anthropic") headers["x-api-key"] = apiKey;
  }
  if (cfg.provider === "anthropic") headers["anthropic-version"] = "2023-06-01";

  let body;
  if (useCompletions) {
    const fullPrompt = cfg.system_prompt ? `${cfg.system_prompt}\n\n${prompt}` : prompt;
    body = { model: cfg.name, prompt: fullPrompt, temperature, stream: true };
  } else {
    const messages = [];
    if (cfg.system_prompt) messages.push({ role: "system", content: cfg.system_prompt });
    messages.push({ role: "user", content: prompt });
    body = { model: cfg.name, messages, temperature, stream: true };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: abortSignal,
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => resp.statusText);
    throw new Error(`AI error ${resp.status}: ${text.slice(0, 200)}`);
  }
  if (!resp.body) throw new Error("AI: no response body");

  const reader = resp.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split(/\r?\n/);
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      let json;
      try { json = JSON.parse(payload); } catch { continue; }
      let chunk = "";
      if (useCompletions) chunk = json.choices?.[0]?.text ?? "";
      else chunk = json.choices?.[0]?.delta?.content ?? "";
      if (chunk) yield chunk;
    }
  }
}

// ---------- templates ----------
function tplTabs() {
  const tabs = Object.values(state.trees).sort((a, b) => a.created - b.created);
  const items = tabs.map((t) => {
    const active = t.id === state.activeTreeId ? " active" : "";
    return html`<span class="tab${active}"
            hx-post="/api/trees/${t.id}/activate"
            hx-trigger="click"
            hx-swap="none"
            data-tree-id="${t.id}"
            title="Double-click to rename">${escapeHtml(truncate(t.name, 24))}<span class="close"
              hx-delete="/api/trees/${t.id}"
              hx-trigger="click consume"
              hx-confirm="Delete tree '${escapeHtml(t.name)}'?"
              hx-swap="none"
              onclick="event.stopPropagation()">×</span></span>`;
  }).join("");
  const newBtn = html`<span class="tab-new" hx-post="/api/trees" hx-swap="none" title="New tree">+</span>`;
  return items + newBtn;
}

function tplNode(tree, node) {
  const active = node.id === tree.currentNodeId ? " active" : "";
  const bookmark = node.bookmark ? " bookmark" : "";
  const truncLen = state.settings.preferences?.node_text_truncate || 200;
  const txt = truncate(node.text, truncLen);
  const isRoot = node.id === tree.rootId;
  const tid = tree.id, nid = node.id;
  return html`
    <li data-node-id="${nid}">
      <span class="node${active}${bookmark}"
            hx-post="/api/trees/${tid}/nodes/${nid}/select"
            hx-trigger="click"
            hx-swap="none">
        <span class="text${node.text ? "" : " empty"}" id="text-${nid}">${escapeHtml(txt)}</span>
        <span class="actions" onclick="event.stopPropagation()">
          <button hx-get="/api/trees/${tid}/nodes/${nid}/edit"
                  hx-target="#text-${nid}"
                  hx-swap="outerHTML"
                  title="Edit">Edit</button>
          <button hx-post="/api/trees/${tid}/nodes/${nid}/generate"
                  hx-target="#children-${nid}"
                  hx-swap="beforeend"
                  title="Generate child">Gen</button>
          <button hx-post="/api/trees/${tid}/nodes/${nid}/children"
                  hx-target="#children-${nid}"
                  hx-swap="beforeend"
                  hx-vals='{"text":""}'
                  title="Add empty child">+</button>
          <button hx-post="/api/trees/${tid}/nodes/${nid}/bookmark"
                  hx-target="#tree-view"
                  hx-swap="outerHTML"
                  title="Bookmark">★</button>
          ${isRoot ? "" : html`<button hx-delete="/api/trees/${tid}/nodes/${nid}"
                  hx-target="#tree-view"
                  hx-swap="outerHTML"
                  hx-confirm="Delete this node and all children?"
                  title="Delete">×</button>`}
        </span>
      </span>
      <ul id="children-${nid}">${node.children.map((c) => tplNode(tree, tree.nodes[c])).filter(Boolean).join("")}</ul>
    </li>`;
}

function tplTreeView(tree) {
  const root = tree.nodes[tree.rootId];
  if (!root) return `<div id="tree-view"><em>(empty tree)</em></div>`;
  return html`<ul class="tree" id="tree-view">${tplNode(tree, root)}</ul>`;
}

function tplWorkspace() {
  const tree = state.trees[state.activeTreeId];
  if (!tree) return `<em>No tree selected.</em>`;
  return html`
    <div style="display:flex; align-items:center; gap:6px; margin-bottom:6px; font-family:Tahoma,sans-serif; font-size:11px;">
      <strong>${escapeHtml(tree.name)}</strong>
      <span style="color:#808080;">— ${Object.keys(tree.nodes).length} node(s)</span>
      <span style="flex:1;"></span>
      <button hx-get="/api/active/read"
              hx-target="#workspace"
              hx-swap="innerHTML">Read view</button>
      <button onclick="(function(){var n=prompt('Rename tree:', '${escapeHtml(tree.name)}');if(n!==null)htmx.ajax('PATCH','/api/trees/${tree.id}',{values:{name:n},swap:'none'});})()">Rename</button>
    </div>
    ${tplTreeView(tree)}
  `;
}

function tplReadView() {
  const tree = state.trees[state.activeTreeId];
  if (!tree) return `<em>No tree selected.</em>`;
  const path = ancestry(tree, tree.currentNodeId);
  const cur = tree.nodes[tree.currentNodeId];
  const parent = cur?.parentId ? tree.nodes[cur.parentId] : null;
  const firstChild = cur?.children?.[0];
  return html`
    <div class="read-view">
      <div class="nav">
        <button hx-get="/api/active"
                hx-target="#workspace"
                hx-swap="innerHTML">← Tree view</button>
        ${parent ? html`<button hx-post="/api/trees/${tree.id}/nodes/${parent.id}/select"
                hx-target="#workspace"
                hx-swap="none">↑ Parent</button>` : ""}
        ${firstChild ? html`<button hx-post="/api/trees/${tree.id}/nodes/${firstChild}/select"
                hx-target="#workspace"
                hx-swap="none">↓ First child</button>` : ""}
        <span style="flex:1;"></span>
        <span style="color:#808080;">${path.length} ancestor(s)</span>
      </div>
      ${path.map((n) => {
        const isCur = n.id === tree.currentNodeId;
        return html`<span class="${isCur ? "current" : ""}">${escapeHtml(n.text || "(empty)")}</span>${n.text && !n.text.endsWith(" ") && !n.text.endsWith("\n") ? " " : ""}`;
      }).join("")}
    </div>
  `;
}

function tplEditForm(tree, node) {
  return html`<form hx-patch="/api/trees/${tree.id}/nodes/${node.id}"
                    hx-target="#tree-view"
                    hx-swap="outerHTML"
                    style="display:inline-block; width:100%;"
                    onkeydown="if(event.key==='Escape'){htmx.ajax('GET','/api/active',{target:'#workspace',swap:'innerHTML'});}">
    <textarea name="text" rows="3" style="width:99%;" autofocus>${escapeHtml(node.text)}</textarea>
    <div style="margin-top:2px;">
      <button type="submit">Save</button>
      <button type="button"
              hx-get="/api/active"
              hx-target="#workspace"
              hx-swap="innerHTML">Cancel</button>
    </div>
  </form>`;
}

function tplSettingsDialog() {
  const s = state.settings;
  const models = Object.values(s.modelConfigs);
  return html`<dialog id="settings-dialog">
    <div class="titlebar">
      <span>Settings</span>
      <span class="controls">
        <button data-close-dialog title="Close">×</button>
      </span>
    </div>
    <div class="body">
      <form hx-patch="/api/settings"
            hx-target="#dialog-host"
            hx-swap="innerHTML">

        <fieldset>
          <legend>Global API keys</legend>
          <div class="form-row">
            <label for="k-openai">OpenAI key:</label>
            <input type="password" id="k-openai" name="apiKeys.openai" value="${escapeHtml(s.apiKeys.openai || "")}" placeholder="sk-…" />
          </div>
          <div class="form-row">
            <label for="k-anthropic">Anthropic key:</label>
            <input type="password" id="k-anthropic" name="apiKeys.anthropic" value="${escapeHtml(s.apiKeys.anthropic || "")}" placeholder="sk-ant-…" />
          </div>
          <p style="margin:4px 0 0 0; color:#404040; font-size:10px;">
            Any OpenAI-compatible endpoint works. For custom providers (Groq,
            OpenRouter, LM Studio, vLLM, llama.cpp, etc.) set per-model Base URL
            and API key below.
          </p>
        </fieldset>

        <fieldset>
          <legend>Generation</legend>
          <div class="form-row">
            <label for="g-model">Model:</label>
            <select id="g-model" name="generationSettings.model">
              ${models.map((m) => html`<option value="${escapeHtml(m.name)}" ${m.name === s.generationSettings.model ? "selected" : ""}>${escapeHtml(m.name)} (${escapeHtml(m.provider)})</option>`).join("")}
            </select>
          </div>
          <div class="form-row">
            <label for="g-temp">Temperature:</label>
            <input type="number" id="g-temp" name="generationSettings.temperature" step="0.05" min="0" max="2" value="${s.generationSettings.temperature}" />
          </div>
        </fieldset>

        <fieldset>
          <legend>Models</legend>
          ${models.map((m, i) => html`
            <div class="form-row" style="grid-template-columns: 1fr; gap:2px; border-bottom:1px dotted #808080; padding-bottom:4px; margin-bottom:4px;">
              <div style="display:flex; gap:4px; align-items:center;">
                <strong>${escapeHtml(m.name)}</strong>
                <span style="color:#404040;">(${escapeHtml(m.provider)})</span>
                <span style="flex:1;"></span>
                <button type="button"
                        hx-delete="/api/settings/models/${encodeURIComponent(m.name)}"
                        hx-target="#dialog-host"
                        hx-swap="innerHTML"
                        hx-confirm="Remove model '${escapeHtml(m.name)}'?">Remove</button>
              </div>
              <div style="display:grid; grid-template-columns:120px 1fr 80px 1fr; gap:4px; font-size:10px;">
                <label>Provider:</label>
                <select name="modelConfigs.${escapeHtml(m.name)}.provider">
                  ${["openai","anthropic","ollama","custom"].map(p => html`<option value="${p}" ${m.provider===p?"selected":""}>${p}</option>`).join("")}
                </select>
                <label>API type:</label>
                <select name="modelConfigs.${escapeHtml(m.name)}.api_type">
                  <option value="chat" ${m.api_type!=="completions"?"selected":""}>chat</option>
                  <option value="completions" ${m.api_type==="completions"?"selected":""}>completions</option>
                </select>
                <label>Base URL:</label>
                <input type="text" name="modelConfigs.${escapeHtml(m.name)}.api_base" value="${escapeHtml(m.api_base || "")}" placeholder="(default)" />
                <label>API key:</label>
                <input type="password" name="modelConfigs.${escapeHtml(m.name)}.api_key" value="${escapeHtml(m.api_key || "")}" placeholder="(use global)" />
                <label>System prompt:</label>
                <input type="text" name="modelConfigs.${escapeHtml(m.name)}.system_prompt" value="${escapeHtml(m.system_prompt || "")}" placeholder="(none)" style="grid-column: span 3;" />
              </div>
            </div>
          `).join("")}
          <div style="display:flex; gap:4px; align-items:center;">
            <input type="text" id="new-model-name" placeholder="new model name, e.g. llama3" />
            <button type="button" onclick="(function(){var n=document.getElementById('new-model-name').value.trim();if(n)htmx.ajax('POST','/api/settings/models',{values:{name:n},target:'#dialog-host',swap:'innerHTML'});})()">Add model</button>
          </div>
        </fieldset>
      </form>
    </div>
    <div class="actions">
      <button type="button"
              hx-patch="/api/settings"
              hx-target="#dialog-host"
              hx-swap="innerHTML"
              hx-include="#settings-dialog form">Save</button>
      <button type="button" data-close-dialog>Close</button>
    </div>
  </dialog>`;
}

function tplStreamingPlaceholder(tree, parentId, streamId, nodeId) {
  return html`<li data-node-id="${nodeId}" data-streaming="1">
    <span class="node streaming"
          hx-ext="sse"
          sse-connect="/api/streams/${streamId}"
          sse-close="done"
          sse-swap="done"
          hx-swap="outerHTML">
      <span class="text" id="text-${nodeId}" sse-swap="token" hx-swap="beforeend"></span><span class="cursor">█</span>
    </span>
    <ul id="children-${nodeId}"></ul>
  </li>`;
}

// ---------- routes ----------
function notFound() { return new Response("not found", { status: 404 }); }
function ok(html, extraHeaders) {
  const h = new Headers({ "Content-Type": "text/html; charset=utf-8" });
  if (extraHeaders) for (const [k, v] of Object.entries(extraHeaders)) h.set(k, v);
  return new Response(html, { headers: h });
}
function noContent(triggers) {
  const h = new Headers();
  if (triggers) h.set("HX-Trigger", triggers);
  return new Response(null, { status: 204, headers: h });
}
async function readForm(req) {
  const ct = req.headers.get("Content-Type") || "";
  if (ct.includes("application/x-www-form-urlencoded")) {
    const body = await req.text();
    const params = new URLSearchParams(body);
    return Object.fromEntries(params.entries());
  }
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    return Object.fromEntries(fd.entries());
  }
  if (ct.includes("application/json")) return await req.json();
  return {};
}

// Apply dotted form keys onto an object: "a.b.c" -> obj.a.b.c
function applyDotted(target, key, value) {
  const parts = key.split(".");
  let cur = target;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

async function route(req) {
  await loadState();
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // ---- tabs ----
  if (path === "/api/trees" && method === "GET") return ok(tplTabs());
  if (path === "/api/trees" && method === "POST") {
    createTree("Untitled");
    await persistTrees();
    return noContent("trees-changed, active-changed");
  }

  // /api/trees/:id ...
  let m;
  if ((m = path.match(/^\/api\/trees\/([^\/]+)$/))) {
    const id = m[1];
    if (method === "DELETE") {
      deleteTree(id);
      await persistTrees();
      return noContent("trees-changed, active-changed");
    }
    if (method === "PATCH") {
      const data = await readForm(req);
      if (state.trees[id] && typeof data.name === "string") {
        state.trees[id].name = data.name.trim() || "Untitled";
        state.trees[id].modified = Date.now();
        await persistTrees();
      }
      return noContent("trees-changed, active-changed");
    }
  }

  if ((m = path.match(/^\/api\/trees\/([^\/]+)\/activate$/)) && method === "POST") {
    const id = m[1];
    if (state.trees[id]) {
      state.activeTreeId = id;
      await persistTrees();
    }
    return noContent("trees-changed, active-changed");
  }

  // ---- active workspace ----
  if (path === "/api/active" && method === "GET") return ok(tplWorkspace());
  if (path === "/api/active/read" && method === "GET") return ok(tplReadView());

  // ---- node ops ----
  if ((m = path.match(/^\/api\/trees\/([^\/]+)\/nodes\/([^\/]+)\/select$/)) && method === "POST") {
    const [, tid, nid] = m;
    if (state.trees[tid]?.nodes[nid]) {
      state.trees[tid].currentNodeId = nid;
      await persistTrees();
    }
    return noContent("active-changed");
  }

  if ((m = path.match(/^\/api\/trees\/([^\/]+)\/nodes\/([^\/]+)\/edit$/)) && method === "GET") {
    const [, tid, nid] = m;
    const tree = state.trees[tid]; const node = tree?.nodes[nid];
    if (!tree || !node) return notFound();
    return ok(tplEditForm(tree, node));
  }

  if ((m = path.match(/^\/api\/trees\/([^\/]+)\/nodes\/([^\/]+)$/))) {
    const [, tid, nid] = m;
    if (method === "PATCH") {
      const data = await readForm(req);
      if (typeof data.text === "string") updateNode(tid, nid, { text: data.text });
      await persistTrees();
      const tree = state.trees[tid];
      return ok(tplTreeView(tree));
    }
    if (method === "DELETE") {
      deleteNode(tid, nid);
      await persistTrees();
      return ok(tplTreeView(state.trees[tid]));
    }
  }

  if ((m = path.match(/^\/api\/trees\/([^\/]+)\/nodes\/([^\/]+)\/children$/)) && method === "POST") {
    const [, tid, nid] = m;
    const data = await readForm(req);
    const newId = createNode(tid, nid, data.text || "");
    await persistTrees();
    const tree = state.trees[tid];
    return ok(tplNode(tree, tree.nodes[newId]));
  }

  if ((m = path.match(/^\/api\/trees\/([^\/]+)\/nodes\/([^\/]+)\/bookmark$/)) && method === "POST") {
    const [, tid, nid] = m;
    const tree = state.trees[tid]; const node = tree?.nodes[nid];
    if (!tree || !node) return notFound();
    updateNode(tid, nid, { bookmark: !node.bookmark });
    await persistTrees();
    return ok(tplTreeView(tree));
  }

  // ---- generation ----
  if ((m = path.match(/^\/api\/trees\/([^\/]+)\/nodes\/([^\/]+)\/generate$/)) && method === "POST") {
    const [, tid, parentId] = m;
    const tree = state.trees[tid]; const parent = tree?.nodes[parentId];
    if (!tree || !parent) return notFound();
    const nodeId = createNode(tid, parentId, "");
    const streamId = uuid();
    streams.set(streamId, { treeId: tid, nodeId });
    await persistTrees();
    return ok(tplStreamingPlaceholder(tree, parentId, streamId, nodeId));
  }

  if ((m = path.match(/^\/api\/streams\/([^\/]+)$/)) && method === "GET") {
    const streamId = m[1];
    const ref = streams.get(streamId);
    if (!ref) return new Response("stream gone", { status: 410 });
    streams.delete(streamId);
    return sseGenerate(ref);
  }

  // ---- settings ----
  if (path === "/api/settings" && method === "GET") return ok(tplSettingsDialog());
  if (path === "/api/settings" && method === "PATCH") {
    const data = await readForm(req);
    // apply flat dotted keys onto state.settings
    const draft = JSON.parse(JSON.stringify(state.settings));
    for (const [k, v] of Object.entries(data)) applyDotted(draft, k, v);
    // numeric coercion for temperature
    if (draft.generationSettings?.temperature != null) {
      const t = parseFloat(draft.generationSettings.temperature);
      if (!Number.isNaN(t)) draft.generationSettings.temperature = t;
    }
    state.settings = draft;
    await persistSettings();
    // return the dialog re-rendered for a "save & stay" effect, plus trigger updates
    return ok(tplSettingsDialog(), { "HX-Trigger": "settings-changed, show-toast" });
  }

  if (path === "/api/settings/models" && method === "POST") {
    const data = await readForm(req);
    const name = (data.name || "").trim();
    if (name && !state.settings.modelConfigs[name]) {
      state.settings.modelConfigs[name] = { name, provider: "custom", api_type: "chat" };
      await persistSettings();
    }
    return ok(tplSettingsDialog(), { "HX-Trigger": "settings-changed" });
  }

  if ((m = path.match(/^\/api\/settings\/models\/([^\/]+)$/)) && method === "DELETE") {
    const name = decodeURIComponent(m[1]);
    delete state.settings.modelConfigs[name];
    await persistSettings();
    return ok(tplSettingsDialog(), { "HX-Trigger": "settings-changed" });
  }

  if (path === "/api/model-summary" && method === "GET") {
    const m = state.settings.generationSettings.model;
    const c = state.settings.modelConfigs[m];
    const provider = c?.provider || "?";
    return ok(`${escapeHtml(m)} :: ${escapeHtml(provider)} :: T=${state.settings.generationSettings.temperature}`);
  }

  return notFound();
}

// ---------- SSE generation ----------
function sseGenerate(ref) {
  const { treeId, nodeId } = ref;
  const encoder = new TextEncoder();
  const send = (controller, event, data) => {
    const safe = String(data ?? "").replace(/\r/g, "").replace(/\n/g, "\\n");
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${safe}\n\n`));
  };

  const tree = state.trees[treeId];
  if (!tree || !tree.nodes[nodeId]) {
    return new Response("not found", { status: 404 });
  }
  const node = tree.nodes[nodeId];
  const parent = node.parentId ? tree.nodes[node.parentId] : null;

  // Build prompt from ancestry of parent (excluding the new pending node).
  const ctxPath = parent ? ancestry(tree, parent.id) : [];
  const prompt = ctxPath.map((n) => n.text || "").join("");

  const { model, temperature } = state.settings.generationSettings;
  const abort = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      let acc = "";
      try {
        for await (const chunk of streamAI({ prompt, modelName: model, temperature, abortSignal: abort.signal })) {
          acc += chunk;
          send(controller, "token", escapeHtml(chunk));
        }
        updateNode(treeId, nodeId, { text: acc });
        await persistTrees();
        const updatedTree = state.trees[treeId];
        const finalHtml = tplNode(updatedTree, updatedTree.nodes[nodeId]);
        send(controller, "done", finalHtml);
      } catch (err) {
        const msg = (err && err.message) || String(err);
        send(controller, "token", escapeHtml(`\n[error: ${msg}]`));
        updateNode(treeId, nodeId, { text: acc + `\n[error: ${msg}]` });
        await persistTrees();
        const updatedTree = state.trees[treeId];
        send(controller, "done", tplNode(updatedTree, updatedTree.nodes[nodeId]));
      } finally {
        controller.close();
      }
    },
    cancel() { abort.abort(); },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

// ---------- worker glue ----------
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(self.clients.claim()); });

self.addEventListener("message", async (e) => {
  if (e.data?.type === "migrate") {
    try { await migrate(e.data.legacy); } catch (err) { console.error("migrate", err); }
  }
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return; // pass-through cross-origin
  if (!url.pathname.startsWith("/api/")) return;   // only intercept /api/*
  e.respondWith(
    (async () => {
      try {
        return await route(e.request);
      } catch (err) {
        console.error("route error", err);
        return new Response((err && err.message) || "internal error", { status: 500 });
      }
    })()
  );
});
