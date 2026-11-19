// Second Brain (agent edition) — server-side store.
//
// This is NOT the Forte/PARA personal-notes brain. It is the connected AI
// agent's working memory: what the agent is doing RIGHT NOW. When the active
// task finishes, its nodes / edges / trace are wiped — the knowledge
// disappears with the task. Only a titles-only log of finished tasks remains.
//
// State lives in a JSON file under getDataDir() (same pattern as the other
// 9Router JSON stores): <dataDir>/second-brain.json
//
//   state = {
//     version, mode: "sample" | "live",
//     agent: { id, name, kind, connected, model, startedAt, note },
//     task: { id, title, goal, status: "active", startedAt, stepsTotal, stepsDone } | null,
//     nodes: [{ id, kind, label, detail, status, createdAt }],
//       kind: "goal" | "step" | "fact" | "file" | "tool" | "decision"
//       status: "active" | "done" | "waiting"
//     edges: [{ id, from, to, relation }],
//       relation: "part_of" | "uses" | "reads" | "writes" | "learned_from" | "depends_on" | "produces"
//     events: [{ id, at, type, text }],
//       type: "thought" | "action" | "tool" | "observation" | "done"
//     completedTasks: [{ id, title, finishedAt }]  // titles only — knowledge is gone
//   }
//
// Future agent connector: POST /api/second-brain/event appends trace events
// (and optionally nodes/edges) while a task runs. Mode flips to "live" when
// a real agent connects; until then everything here is sample data.

import fs from "node:fs/promises";
import path from "node:path";
import { getDataDir } from "../dataDir.js";

export const STATE_FILE = "second-brain.json";
export const MAX_EVENTS = 100;

export function uid(prefix = "n") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getStatePath() {
  return path.join(getDataDir(), STATE_FILE);
}

const minutesAgo = (m) => new Date(Date.now() - m * 60 * 1000).toISOString();

// ---- Sample tasks -------------------------------------------------------

function sampleTaskSecondBrain() {
  const now = Date.now();
  const startedAt = new Date(now - 42 * 60 * 1000).toISOString();
  return {
    task: {
      id: "task-second-brain",
      title: "Bangun page Second Brain di 9Router",
      goal: "Second Brain sebagai otak agent: working memory live yang hilang saat tugas selesai",
      status: "active",
      startedAt,
      stepsTotal: 4,
      stepsDone: 2,
    },
    nodes: [
      { id: "goal-1", kind: "goal", label: "Second Brain = otak agent", detail: "Working memory live, bukan catatan PARA. Hilang saat tugas selesai.", status: "active", createdAt: minutesAgo(42) },
      { id: "step-research", kind: "step", label: "Riset konsep Second Brain", detail: "Deep research: Forte CODE/PARA, Obsidian, Notion, Logseq, Capacities, Tana.", status: "done", createdAt: minutesAgo(40) },
      { id: "step-graph", kind: "step", label: "Desain graph working memory", detail: "Graph Obsidian dipakai, tapi node = hal aktif di kepala agent.", status: "done", createdAt: minutesAgo(28) },
      { id: "step-backend", kind: "step", label: "Bangun backend API + state", detail: "API state/event/complete + JSON di dataDir. Titik masuk konektor agent.", status: "active", createdAt: minutesAgo(15) },
      { id: "step-ui", kind: "step", label: "Bangun UI graph + feed", detail: "Graph React Flow per-kind, panel working memory, live trace.", status: "waiting", createdAt: minutesAgo(15) },
      { id: "fact-concept", kind: "fact", label: "Second Brain di sini = working memory agent", detail: "Koreksi dari Jun: bukan PARA/Forte. Isinya hilang saat tugas selesai.", status: "active", createdAt: minutesAgo(33) },
      { id: "fact-hermes", kind: "fact", label: "Hermes Agent sudah dihapus 18 Nov 2026", detail: "Belum ada agent yang terkoneksi. UI jalan dulu pakai data contoh.", status: "active", createdAt: minutesAgo(30) },
      { id: "fact-ram", kind: "fact", label: "Full next build OOM di mesin John", detail: "RAM bebas ~535 MB. Build jalan di Railway / laptop Jun.", status: "active", createdAt: minutesAgo(20) },
      { id: "file-sidebar", kind: "file", label: "src/shared/components/Sidebar.js", detail: "Item Second Brain di urutan ke-3 sidebar.", status: "done", createdAt: minutesAgo(38) },
      { id: "file-page", kind: "file", label: "dashboard/second-brain/page.js", detail: "Route page Second Brain.", status: "active", createdAt: minutesAgo(15) },
      { id: "file-api", kind: "file", label: "src/app/api/second-brain/", detail: "Route state / event / complete / start-sample / reset.", status: "active", createdAt: minutesAgo(12) },
      { id: "file-store", kind: "file", label: "src/lib/secondBrain/store.js", detail: "State JSON di dataDir + lifecycle tugas.", status: "active", createdAt: minutesAgo(12) },
      { id: "tool-search", kind: "tool", label: "browser search (riset)", detail: "Deep research Second Brain.", status: "done", createdAt: minutesAgo(40) },
      { id: "tool-read", kind: "tool", label: "read (baca repo)", detail: "Baca Sidebar, routes, pola storage.", status: "done", createdAt: minutesAgo(25) },
      { id: "tool-edit", kind: "tool", label: "edit (tulis file)", detail: "Tulis store, API routes, UI.", status: "active", createdAt: minutesAgo(12) },
      { id: "tool-exec", kind: "tool", label: "exec (verifikasi)", detail: "esbuild parse + smoke test store.", status: "waiting", createdAt: minutesAgo(15) },
      { id: "decision-sample", kind: "decision", label: "UI dulu pakai data contoh, konektor nyusul", detail: "Keputusan Jun: urusan konekin masih panjang, bangun backend + UI dulu.", status: "active", createdAt: minutesAgo(10) },
    ],
    edges: [
      { id: "e1", from: "step-research", to: "goal-1", relation: "part_of" },
      { id: "e2", from: "step-graph", to: "goal-1", relation: "part_of" },
      { id: "e3", from: "step-backend", to: "goal-1", relation: "part_of" },
      { id: "e4", from: "step-ui", to: "goal-1", relation: "part_of" },
      { id: "e5", from: "step-research", to: "tool-search", relation: "uses" },
      { id: "e6", from: "step-research", to: "fact-concept", relation: "learned_from" },
      { id: "e7", from: "step-graph", to: "tool-read", relation: "uses" },
      { id: "e8", from: "step-graph", to: "fact-concept", relation: "depends_on" },
      { id: "e9", from: "step-backend", to: "tool-edit", relation: "uses" },
      { id: "e10", from: "step-backend", to: "file-store", relation: "writes" },
      { id: "e11", from: "step-backend", to: "file-api", relation: "writes" },
      { id: "e12", from: "step-ui", to: "file-page", relation: "writes" },
      { id: "e13", from: "step-ui", to: "file-sidebar", relation: "reads" },
      { id: "e14", from: "step-ui", to: "tool-exec", relation: "depends_on" },
      { id: "e15", from: "fact-hermes", to: "decision-sample", relation: "depends_on" },
      { id: "e16", from: "fact-ram", to: "step-ui", relation: "depends_on" },
      { id: "e17", from: "decision-sample", to: "step-backend", relation: "depends_on" },
    ],
    events: [
      { id: "ev1", at: minutesAgo(42), type: "thought", text: "Mulai riset: apa itu Second Brain di luar sana?" },
      { id: "ev2", at: minutesAgo(40), type: "tool", text: "browser search → riset Forte CODE/PARA, Obsidian, Capacities, Tana" },
      { id: "ev3", at: minutesAgo(38), type: "action", text: "Tambah item Second Brain di sidebar (urutan ke-3)" },
      { id: "ev4", at: minutesAgo(33), type: "observation", text: "Koreksi dari Jun: ini otak agent, bukan catatan PARA" },
      { id: "ev5", at: minutesAgo(30), type: "thought", text: "Hermes sudah dihapus — belum ada agent yang bisa dikonekin" },
      { id: "ev6", at: minutesAgo(28), type: "action", text: "Desain ulang graph: node = hal aktif di kepala agent" },
      { id: "ev7", at: minutesAgo(25), type: "tool", text: "read → cek pola storage 9Router (getDataDir + JSON)" },
      { id: "ev8", at: minutesAgo(15), type: "action", text: "Mulai bangun backend: store + API routes second-brain" },
      { id: "ev9", at: minutesAgo(12), type: "tool", text: "edit → tulis src/lib/secondBrain/store.js" },
      { id: "ev10", at: minutesAgo(10), type: "decision", text: "Keputusan: UI dulu pakai data contoh, konektor agent nyusul" },
    ],
  };
}

function sampleTaskModels() {
  const now = Date.now();
  const startedAt = new Date(now - 18 * 60 * 1000).toISOString();
  return {
    task: {
      id: "task-models",
      title: "Cek model 9Router yang masih hidup",
      goal: "Tahu model mana yang live / gangguan / dead sebelum dipakai",
      status: "active",
      startedAt,
      stepsTotal: 4,
      stepsDone: 3,
    },
    nodes: [
      { id: "goal-2", kind: "goal", label: "Model 9Router yang masih hidup", detail: "Live check sebelum model dipakai agent.", status: "active", createdAt: minutesAgo(18) },
      { id: "step-list", kind: "step", label: "Ambil /v1/models", detail: "1.075 ids, 768 di antaranya varian regional req/azure.", status: "done", createdAt: minutesAgo(17) },
      { id: "step-ping1", kind: "step", label: "Ping DeepSeek-V4-Flash-0731", detail: "OK 3.701 ms, 2.862 token.", status: "done", createdAt: minutesAgo(12) },
      { id: "step-ping2", kind: "step", label: "Ping gpt-6-astra", detail: "503 Dead — model tidak didukung di Codex.", status: "done", createdAt: minutesAgo(8) },
      { id: "step-note", kind: "step", label: "Catat hasil ke monitor", detail: "Update status model di Ruang Monitor Model.", status: "active", createdAt: minutesAgo(5) },
      { id: "fact-count", kind: "fact", label: "1.075 ids, hanya ~70 chat model asli", detail: "Sisanya varian regional req/azure.", status: "active", createdAt: minutesAgo(17) },
      { id: "fact-deepseek", kind: "fact", label: "DeepSeek-V4-Flash-0731 OK", detail: "3.701 ms, 2.862 token per ping.", status: "active", createdAt: minutesAgo(12) },
      { id: "fact-astra", kind: "fact", label: "gpt-6-astra 503", detail: "Upstream: tidak didukung di Codex, reset ~30 menit.", status: "active", createdAt: minutesAgo(8) },
      { id: "file-9router", kind: "file", label: "custom.9router/bin/9router.py", detail: "Helper API 9Router (endpoint + key).", status: "active", createdAt: minutesAgo(17) },
      { id: "tool-exec2", kind: "tool", label: "exec (live check)", detail: "Jalankan helper 9Router + catat hasil.", status: "done", createdAt: minutesAgo(12) },
    ],
    edges: [
      { id: "m1", from: "step-list", to: "goal-2", relation: "part_of" },
      { id: "m2", from: "step-ping1", to: "goal-2", relation: "part_of" },
      { id: "m3", from: "step-ping2", to: "goal-2", relation: "part_of" },
      { id: "m4", from: "step-note", to: "goal-2", relation: "part_of" },
      { id: "m5", from: "step-list", to: "file-9router", relation: "uses" },
      { id: "m6", from: "step-list", to: "fact-count", relation: "learned_from" },
      { id: "m7", from: "step-ping1", to: "fact-deepseek", relation: "learned_from" },
      { id: "m8", from: "step-ping2", to: "fact-astra", relation: "learned_from" },
      { id: "m9", from: "step-note", to: "fact-deepseek", relation: "depends_on" },
      { id: "m10", from: "step-note", to: "fact-astra", relation: "depends_on" },
    ],
    events: [
      { id: "mev1", at: minutesAgo(18), type: "thought", text: "Mulai cek: model 9Router mana yang masih hidup?" },
      { id: "mev2", at: minutesAgo(17), type: "tool", text: "exec → GET /v1/models: 1.075 ids" },
      { id: "mev3", at: minutesAgo(12), type: "observation", text: "DeepSeek-V4-Flash-0731 OK (3.701 ms)" },
      { id: "mev4", at: minutesAgo(8), type: "observation", text: "gpt-6-astra 503 Dead" },
      { id: "mev5", at: minutesAgo(5), type: "action", text: "Catat hasil ke monitor model" },
    ],
  };
}

const SAMPLE_TASKS = {
  "second-brain": sampleTaskSecondBrain,
  models: sampleTaskModels,
};

export function seedSampleState(taskKey = "second-brain") {
  const build = SAMPLE_TASKS[taskKey] || SAMPLE_TASKS["second-brain"];
  const { task, nodes, edges, events } = build();
  return {
    version: 1,
    mode: "sample",
    agent: {
      id: "hermes",
      name: "Hermes Agent",
      kind: "hermes",
      connected: false,
      model: "—",
      startedAt: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
      note: "SAMPLE — belum ada agent yang terkoneksi. Data contoh saja.",
    },
    task,
    nodes,
    edges,
    events,
    completedTasks: [],
  };
}

// ---- Load / save ---------------------------------------------------------

export async function loadState() {
  try {
    const raw = await fs.readFile(getStatePath(), "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.nodes)) {
      throw new Error("bad state");
    }
    return parsed;
  } catch {
    const seeded = seedSampleState();
    await saveState(seeded);
    return seeded;
  }
}

export async function saveState(state) {
  const filePath = getStatePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(state, null, 2));
}

// ---- Lifecycle -----------------------------------------------------------
// Completing a task WIPES its working memory: nodes, edges and trace are
// gone. Only the finished task's title + time remain in completedTasks.
export function completeTask(state) {
  if (!state.task) return state;
  const finished = {
    id: state.task.id,
    title: state.task.title,
    finishedAt: new Date().toISOString(),
  };
  return {
    ...state,
    task: null,
    nodes: [],
    edges: [],
    events: [],
    completedTasks: [finished, ...(state.completedTasks || [])].slice(0, 10),
  };
}

export function startSampleTask(state, taskKey = "second-brain") {
  const build = SAMPLE_TASKS[taskKey] || SAMPLE_TASKS["second-brain"];
  const { task, nodes, edges, events } = build();
  return { ...state, mode: "sample", task, nodes, edges, events };
}

export function appendEvent(state, { type, text, node = null, edge = null }) {
  const event = { id: uid("ev"), at: new Date().toISOString(), type, text };
  const next = {
    ...state,
    events: [...(state.events || []), event].slice(-MAX_EVENTS),
  };
  if (node) next.nodes = [...(state.nodes || []), { ...node, id: node.id || uid(), createdAt: event.at }];
  if (edge) next.edges = [...(state.edges || []), { ...edge, id: edge.id || uid("e") }];
  return next;
}
