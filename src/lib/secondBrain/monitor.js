// Model Monitor — sub-page of the Second Brain.
//
// Which models are ACTIVE right now: EVERY model in the gateway's own
// /v1/models catalog (list mode, 0 tokens) and, on demand, a real chat
// ping (chat mode, costs tokens — same pingModelByKind the dashboard
// itself uses for model tests, with the dashboard's own keys, so no env
// key is needed).
//
// State lives in <dataDir>/model-monitor.json (same pattern as the
// Second Brain store). The monitored set IS the live catalog: each list
// round replaces it with whatever /v1/models returns right now.
//
// Status rules:
//   online   — present in /v1/models (list), or chat ping OK <= 8s
//   gangguan — chat ping slow (> 8s), 429 / 503 / timeout, or 1st failure
//   dead     — chat ping 400/401/403/404, or 2 consecutive failures
//   unknown  — never checked yet (no status pill is shown for these)

import fs from "node:fs/promises";
import path from "node:path";
import { getDataDir } from "../dataDir.js";
import { buildModelsList } from "@/app/api/v1/models/route.js";
import { pingModelByKind } from "@/app/api/models/test/ping.js";

export const STATE_FILE = "model-monitor.json";
export const SLOW_MS = 8000;
export const LIST_STALE_MS = 60000;
export const CHAT_CONCURRENCY = 6;

export function getStatePath() {
  return path.join(getDataDir(), STATE_FILE);
}

function emptyRecord(id) {
  return {
    id,
    status: "unknown",
    inCatalog: null,
    latencyMs: null,
    httpStatus: null,
    error: null,
    checkedVia: null,
    failures: 0,
    lastCheckedAt: null,
    lastPingAt: null,
  };
}

export function seedState() {
  // Monitored starts empty — the first list round (lazy, on state load)
  // fills it with the full live catalog from /v1/models.
  return {
    version: 1,
    monitored: [],
    models: {},
    totals: { req: 0, ok: 0, err: 0 },
    rounds: 0,
    catalogCount: null,
    lastRoundAt: null,
    lastListAt: null,
    lastChatAt: null,
  };
}

export async function loadState() {
  try {
    const raw = await fs.readFile(getStatePath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.monitored)) throw new Error("bad state");
    for (const id of parsed.monitored) {
      if (!parsed.models?.[id]) parsed.models[id] = emptyRecord(id);
    }
    return parsed;
  } catch {
    const seeded = seedState();
    await saveState(seeded);
    return seeded;
  }
}

export async function saveState(state) {
  const filePath = getStatePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(state, null, 2));
}

// Pure: classify one chat-ping result.
export function classifyPing(result, prevFailures = 0) {
  if (result?.ok) {
    if (result.latencyMs <= SLOW_MS) return { status: "online", failures: 0 };
    return { status: "gangguan", failures: 0 };
  }
  const s = result?.status;
  const failures = prevFailures + 1;
  const msg = String(result?.error || "").toLowerCase();
  if (s === 429 || s === 503 || msg.includes("timeout") || msg.includes("timed out") || !s) {
    return { status: "gangguan", failures };
  }
  if ([400, 401, 403, 404].includes(s) || failures >= 2) return { status: "dead", failures };
  return { status: "gangguan", failures };
}

export async function listCatalogIds() {
  const list = await buildModelsList(["llm"]);
  const arr = Array.isArray(list) ? list : list?.data || list?.models || [];
  return new Set(arr.map((m) => m?.id).filter(Boolean));
}

// List round (0 tokens): the monitored set becomes the full live catalog.
// Models never pinged count as active (online) from catalog presence alone.
// Models already tested by a real chat ping keep their ping-derived status:
// a list round must not clobber it back to "online" (that is how ONLINE
// pills ended up next to HTTP 503). The stored ping result (httpStatus +
// latencyMs) is re-run through classifyPing, so records clobbered by an
// older list round heal themselves on the next round. Models that left the
// catalog drop out of the monitored set entirely.
export async function runListRound(state) {
  const catalog = await listCatalogIds();
  const now = new Date().toISOString();
  const ids = [...catalog].sort();
  const models = {};
  for (const id of ids) {
    const prev = state.models?.[id] || emptyRecord(id);
    const pinged = prev.checkedVia === "chat" || prev.httpStatus != null;
    if (pinged) {
      const result = { ok: prev.httpStatus === 200, status: prev.httpStatus, latencyMs: prev.latencyMs };
      const { status, failures } = classifyPing(result, prev.failures || 0);
      models[id] = {
        ...prev,
        id,
        inCatalog: true,
        status,
        failures,
        checkedVia: "chat",
        error: result.ok ? null : (prev.error || `HTTP ${prev.httpStatus ?? "?"}`),
      };
    } else {
      models[id] = {
        ...prev,
        id,
        inCatalog: true,
        status: "online",
        checkedVia: "list",
        failures: 0,
        error: null,
        lastCheckedAt: now,
      };
    }
  }
  return {
    ...state,
    monitored: ids,
    models,
    catalogCount: catalog.size,
    lastListAt: now,
    lastRoundAt: now,
    rounds: (state.rounds || 0) + 1,
  };
}

async function mapPool(items, size, fn) {
  const results = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.max(1, size) }, async () => {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return results;
}

// Chat round: real ping per model (costs tokens — see 9router-monitor notes:
// one ping ≈ 2.862 token even for a 1-word reply).
// ids: optional subset to ping (e.g. only the models currently visible in
// the UI); defaults to the whole monitored set.
export async function runChatRound(state, ids = null) {
  const targets =
    Array.isArray(ids) && ids.length > 0
      ? [...new Set(ids)].filter((id) => state.monitored.includes(id))
      : [...state.monitored];
  const now = new Date().toISOString();
  const models = { ...state.models };
  const totals = { ...(state.totals || { req: 0, ok: 0, err: 0 }) };
  await mapPool(targets, CHAT_CONCURRENCY, async (id) => {
    const prev = models[id] || emptyRecord(id);
    let result;
    try {
      result = await pingModelByKind(id, "llm");
    } catch (e) {
      result = { ok: false, latencyMs: null, status: null, error: String(e?.message || e) };
    }
    const { status, failures } = classifyPing(result, prev.failures || 0);
    totals.req += 1;
    if (result?.ok) totals.ok += 1;
    else totals.err += 1;
    models[id] = {
      ...prev,
      id,
      status,
      failures,
      latencyMs: result?.latencyMs ?? null,
      httpStatus: result?.status ?? null,
      error: result?.ok ? null : (result?.error || `HTTP ${result?.status || "?"}`),
      checkedVia: "chat",
      lastCheckedAt: new Date().toISOString(),
      lastPingAt: new Date().toISOString(),
    };
  });
  return {
    ...state,
    models,
    totals,
    lastChatAt: now,
    lastRoundAt: now,
    rounds: (state.rounds || 0) + 1,
  };
}

export async function checkOne(state, model) {
  if (!state.monitored.includes(model)) throw new Error("Model not monitored");
  const prev = state.models[model] || emptyRecord(model);
  let result;
  try {
    result = await pingModelByKind(model, "llm");
  } catch (e) {
    result = { ok: false, latencyMs: null, status: null, error: String(e?.message || e) };
  }
  const { status, failures } = classifyPing(result, prev.failures || 0);
  const totals = { ...(state.totals || { req: 0, ok: 0, err: 0 }) };
  totals.req += 1;
  if (result?.ok) totals.ok += 1;
  else totals.err += 1;
  return {
    ...state,
    totals,
    models: {
      ...state.models,
      [model]: {
        ...prev,
        id: model,
        status,
        failures,
        latencyMs: result?.latencyMs ?? null,
        httpStatus: result?.status ?? null,
        error: result?.ok ? null : (result?.error || `HTTP ${result?.status || "?"}`),
        checkedVia: "chat",
        lastCheckedAt: new Date().toISOString(),
        lastPingAt: new Date().toISOString(),
      },
    },
  };
}

// In-flight guard so concurrent requests don't stack rounds.
let running = null;
export function withRoundLock(fn) {
  if (running) return running;
  running = (async () => {
    try {
      return await fn();
    } finally {
      running = null;
    }
  })();
  return running;
}
