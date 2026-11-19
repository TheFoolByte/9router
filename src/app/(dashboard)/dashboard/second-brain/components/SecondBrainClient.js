"use client";

import { useState, useEffect, useCallback } from "react";
import { Button, Card, Badge } from "@/shared/components";
import { fetchState, postAction } from "../api";
import GraphView, { KIND_META } from "./components/GraphView";

const KIND_ORDER = ["goal", "step", "fact", "file", "tool", "decision"];

const EVENT_STYLE = {
  thought: { label: "Thought", color: "#7FBCFF" },
  action: { label: "Action", color: "#FF5C00" },
  tool: { label: "Tool", color: "#FF90E8" },
  observation: { label: "Seen", color: "#A6F750" },
  done: { label: "Done", color: "#22C55E" },
};

function fmtTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "—";
  }
}

function ago(iso) {
  if (!iso) return "";
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} mnt lalu`;
  const h = Math.floor(mins / 60);
  return `${h} jam ${mins % 60} mnt lalu`;
}

export default function SecondBrainClient() {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await fetchState();
      setState(data);
      setError("");
    } catch (e) {
      setError("Tidak bisa memuat otak agent — API /api/second-brain/state tidak menjawab.");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const run = async (label, path, body) => {
    setBusy(label);
    try {
      const data = await postAction(path, body);
      if (data?.state) setState(data.state);
      else await load();
    } catch (e) {
      setError(e.message || "Aksi gagal.");
    } finally {
      setBusy("");
    }
  };

  const completeTask = () => {
    if (!window.confirm("Selesaikan tugas ini? Seluruh isi otak agent (simpul, hubungan, jejak) akan DIHAPUS — hanya judul tugas yang tersisa di riwayat.")) return;
    setSelectedId(null);
    run("complete", "complete");
  };

  if (error && !state) {
    return (
      <div className="flex flex-col gap-4 px-1 sm:px-0">
        <Card title="Second Brain — otak agent">
          <p className="text-sm text-text-muted">{error}</p>
          <div className="mt-3"><Button onClick={load}>Coba lagi</Button></div>
        </Card>
      </div>
    );
  }

  if (!state) {
    return <div className="text-text-muted text-sm px-1">Memuat otak agent…</div>;
  }

  const { agent, task, nodes, edges, events, completedTasks } = state;
  const selected = nodes.find((n) => n.id === selectedId) || null;
  const selectedEdges = selected
    ? edges.filter((e) => e.from === selected.id || e.to === selected.id)
    : [];
  const nodeById = (id) => nodes.find((n) => n.id === id);
  const stepsDone = task ? nodes.filter((n) => n.kind === "step" && n.status === "done").length : 0;
  const stepsTotal = task ? nodes.filter((n) => n.kind === "step").length : 0;

  return (
    <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl">Second Brain</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => run("refresh", "state").catch(() => load())} disabled={!!busy}>
            Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => { if (window.confirm("Reset ke data contoh awal?")) run("reset", "reset"); }} disabled={!!busy}>
            Reset sample
          </Button>
        </div>
      </div>

      {error && (
        <Card padding="sm">
          <p className="text-sm text-danger font-bold">{error}</p>
        </Card>
      )}

      {/* Agent + task status */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Agent yang terkoneksi" subtitle={agent.note}>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-extrabold">{agent.name}</span>
            <Badge variant={agent.connected ? "success" : "warning"}>
              {agent.connected ? "● CONNECTED" : "○ SAMPLE — BELUM TERKONEKSI"}
            </Badge>
            <Badge variant="default">{agent.kind}</Badge>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4 text-center">
            <div className="border-2 border-border bg-surface-2 py-2">
              <div className="text-xl font-extrabold">{nodes.length}</div>
              <div className="text-[11px] font-bold uppercase text-text-muted">Simpul</div>
            </div>
            <div className="border-2 border-border bg-surface-2 py-2">
              <div className="text-xl font-extrabold">{edges.length}</div>
              <div className="text-[11px] font-bold uppercase text-text-muted">Hubungan</div>
            </div>
            <div className="border-2 border-border bg-surface-2 py-2">
              <div className="text-xl font-extrabold">{events.length}</div>
              <div className="text-[11px] font-bold uppercase text-text-muted">Jejak</div>
            </div>
          </div>
          <p className="text-xs text-text-muted mt-3">
            Mode: <b>{state.mode}</b> · Model: {agent.model} · Agent aktif sejak {fmtTime(agent.startedAt)} · Auto-refresh 5 detik
          </p>
        </Card>

        <Card
          title={task ? "Tugas aktif" : "Tidak ada tugas aktif"}
          subtitle={task ? task.goal : "Otak agent kosong — tidak ada yang sedang dikerjakan."}
        >
          {task ? (
            <div>
              <div className="text-lg font-extrabold leading-snug">{task.title}</div>
              <div className="text-xs text-text-muted mt-1">Mulai {fmtTime(task.startedAt)} · {ago(task.startedAt)}</div>
              <div className="mt-3">
                <div className="flex justify-between text-xs font-extrabold uppercase">
                  <span>Progress langkah</span>
                  <span>{stepsDone}/{stepsTotal || task.stepsTotal || 0}</span>
                </div>
                <div className="h-4 mt-1 border-2 border-border bg-surface-2">
                  <div
                    className="h-full bg-neo-yellow border-r-2 border-border transition-all"
                    style={{ width: `${stepsTotal ? Math.round((stepsDone / stepsTotal) * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4 flex-wrap">
                <Button size="sm" variant="danger" onClick={completeTask} disabled={!!busy}>
                  {busy === "complete" ? "…" : "Selesaikan tugas — hapus isi otak"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 items-start">
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={() => run("start", "start-sample", { task: "second-brain" })} disabled={!!busy}>
                  Tugas contoh: Bangun Second Brain
                </Button>
                <Button size="sm" variant="secondary" onClick={() => run("start", "start-sample", { task: "models" })} disabled={!!busy}>
                  Tugas contoh: Cek model 9Router
                </Button>
              </div>
              {completedTasks?.length > 0 && (
                <div className="w-full border-t-2 border-border pt-3">
                  <div className="text-xs font-extrabold uppercase text-text-muted">Tugas selesai (hanya judul yang tersisa)</div>
                  {completedTasks.map((t) => (
                    <div key={t.id} className="text-sm mt-1">
                      ✓ {t.title} <span className="text-text-muted">· {fmtTime(t.finishedAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Graph */}
      <Card title="Graf Pengetahuan — isi kepala agent">
        <div className="flex gap-2 flex-wrap mb-4">
          {KIND_ORDER.map((key) => (
            <Badge key={key} variant="default">
              <span className="inline-block w-2.5 h-2.5 border border-black mr-1" style={{ backgroundColor: KIND_META[key].color }} />
              {KIND_META[key].label} ({nodes.filter((n) => n.kind === key).length})
            </Badge>
          ))}
        </div>
        <GraphView nodes={nodes} edges={edges} selectedId={selectedId} onSelect={setSelectedId} />
        {selected && (
          <div className="mt-4 p-4 border-[3px] border-ink bg-surface-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="primary">{KIND_META[selected.kind]?.label}</Badge>
              <span className="font-extrabold">{selected.label}</span>
              <Badge variant="default">{selected.status}</Badge>
            </div>
            {selected.detail && <p className="text-sm text-text-muted mt-2">{selected.detail}</p>}
            {selectedEdges.length > 0 && (
              <div className="flex flex-col gap-1 mt-3">
                {selectedEdges.map((e) => {
                  const otherId = e.from === selected.id ? e.to : e.from;
                  const other = nodeById(otherId);
                  const dir = e.from === selected.id ? "→" : "←";
                  return (
                    <button
                      key={e.id}
                      onClick={() => other && setSelectedId(other.id)}
                      className="text-left text-sm px-3 py-1.5 border-2 border-border bg-surface hover:bg-surface-3"
                    >
                      {dir} <b>{e.relation.replaceAll("_", " ")}</b> {other ? `· ${other.label}` : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 items-start">
        {/* Working memory */}
        <Card title="Working memory">
          {nodes.length === 0 ? (
            <p className="text-sm text-text-muted">Kosong.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {KIND_ORDER.filter((k) => nodes.some((n) => n.kind === k)).map((kind) => (
                <div key={kind}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-3 h-3 border-2 border-black" style={{ backgroundColor: KIND_META[kind].color }} />
                    <span className="text-xs font-extrabold uppercase">{KIND_META[kind].label}</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {nodes.filter((n) => n.kind === kind).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => setSelectedId(n.id)}
                        className={`text-left px-3 py-2 border-2 text-sm ${selectedId === n.id ? "border-ink bg-neo-yellow text-black" : "border-border bg-surface-2 hover:bg-surface-3"}`}
                      >
                        <span className="font-bold block">{n.label}</span>
                        <span className={`text-xs ${selectedId === n.id ? "text-black/70" : "text-text-muted"}`}>
                          {n.status} · {n.detail ? n.detail.slice(0, 80) : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Live trace */}
        <Card title="Jejak live — apa yang barusan dilakukan agent">
          {events.length === 0 ? (
            <p className="text-sm text-text-muted">Belum ada jejak.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[560px] overflow-y-auto custom-scrollbar pr-1">
              {[...events].reverse().map((ev) => {
                const s = EVENT_STYLE[ev.type] || EVENT_STYLE.thought;
                return (
                  <div key={ev.id} className="flex gap-2 items-start px-3 py-2 border-2 border-border bg-surface-2">
                    <span
                      className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 border border-black shrink-0 mt-0.5"
                      style={{ backgroundColor: s.color, color: "#0A0A0A" }}
                    >
                      {s.label}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm leading-snug">{ev.text}</div>
                      <div className="text-[11px] text-text-muted">{fmtTime(ev.at)} · {ago(ev.at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
