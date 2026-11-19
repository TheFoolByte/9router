"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/shared/components";
import { CATEGORIES, categoryOf, categoryLabel } from "@/lib/secondBrain/categories";

const STATUS_META = {
  online: { label: "Online", color: "#22C55E", text: "#0A0A0A" },
  gangguan: { label: "Gangguan", color: "#FFDC58", text: "#0A0A0A" },
  dead: { label: "Dead", color: "#EF4444", text: "#FFFFFF" },
};

// No catalog-status tab: untested models show no status pill and only
// appear under "Semua".
const TABS = [
  { value: "all", label: "Semua" },
  { value: "online", label: "Online" },
  { value: "gangguan", label: "Gangguan" },
  { value: "dead", label: "Dead" },
];

// Slim button shared by CEK KATALOG, PING YANG TAMPIL, status tabs and TES.
const SLIM_BTN =
  "px-2 py-[2px] text-[10px] font-extrabold uppercase border-2 border-black shadow-[1px_1px_0_#0A0A0A] min-h-[23px] leading-none";

async function postJson(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

function Ticker({ count }) {
  const text = `LIVE OR NOT /// ${count} MODEL TERDAFTAR DI KATALOG /v1/models /// SARING BERDASARKAN KATEGORI UNTUK MEMANTAU MODEL TERTENTU SAJA /// `;
  return (
    <div className="overflow-hidden bg-black border-[3px] border-black">
      <style>{`@keyframes live-ticker-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
      <div
        className="flex w-max whitespace-nowrap"
        style={{ animation: "live-ticker-scroll 30s linear infinite" }}
      >
        <span className="text-[#FFDC58] text-xs font-extrabold tracking-wide py-1.5 pr-2">{text}</span>
        <span className="text-[#FFDC58] text-xs font-extrabold tracking-wide py-1.5 pr-2">{text}</span>
      </div>
    </div>
  );
}

export default function MonitorClient() {
  const [state, setState] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [checking, setChecking] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/second-brain/monitor/state");
      if (!res.ok) throw new Error("API monitor tidak menjawab");
      setState(await res.json());
      setError("");
    } catch (e) {
      setError("Tidak bisa memuat status model — API /api/second-brain/monitor/state tidak menjawab.");
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  const runRound = async (mode, models) => {
    setBusy(mode);
    try {
      const data = await postJson(
        "/api/second-brain/monitor/round",
        models ? { mode, models } : { mode }
      );
      if (data?.state) setState(data.state);
      else await load();
    } catch (e) {
      setError(e.message || "Round gagal.");
    } finally {
      setBusy("");
    }
  };

  const checkOne = async (model) => {
    setChecking(model);
    try {
      const data = await postJson("/api/second-brain/monitor/check", { model });
      if (data?.state) setState(data.state);
      else await load();
    } catch (e) {
      setError(e.message || "Ping gagal.");
    } finally {
      setChecking("");
    }
  };

  const records = useMemo(
    () => (state ? state.monitored.map((id) => state.models[id] || { id, status: "unknown" }) : []),
    [state]
  );

  const catCounts = useMemo(() => {
    const c = {};
    for (const r of records) {
      const k = categoryOf(r.id);
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [records]);

  const count = useCallback((s) => records.filter((r) => r.status === s).length, [records]);

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (tab !== "all" && r.status !== tab) return false;
        if (category !== "all" && categoryOf(r.id) !== category) return false;
        if (search && !r.id.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [records, tab, category, search]
  );

  if (!state) {
    return <div className="text-text-muted text-sm px-1">{error || "Memuat monitor model…"}</div>;
  }

  const pingVisible = () => {
    if (filtered.length === 0) return;
    if (!window.confirm(`Ping ${filtered.length} model yang tampil via chat? 1 ping ≈ 2.862 token.`)) return;
    runRound("chat", filtered.map((r) => r.id));
  };

  return (
    <div className="flex min-w-0 flex-col gap-4 px-1 sm:px-0">
      <h1 className="text-2xl">Live or Not</h1>

      <Ticker count={state.catalogCount ?? records.length} />

      {error && (
        <Card padding="sm">
          <p className="text-sm text-danger font-bold">{error}</p>
        </Card>
      )}

      {/* Slim stat cards: one line each */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Model", value: records.length, cls: "bg-surface" },
          { label: "Online", value: count("online"), cls: "bg-[#22C55E]" },
          { label: "Dead", value: count("dead"), cls: "bg-[#EF4444] text-white" },
        ].map((s) => (
          <div
            key={s.label}
            className={`flex items-baseline gap-1.5 px-2 py-1 border-2 border-border shadow-[2px_2px_0_#0A0A0A] ${s.cls}`}
          >
            <b className="text-lg font-extrabold leading-none">{s.value}</b>
            <span className="text-[11px] font-extrabold uppercase whitespace-nowrap">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="border-[3px] border-border bg-surface p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-black text-white text-[11px] font-extrabold px-1.5 py-0.5">01</span>
          <span className="text-xs font-extrabold uppercase tracking-wide">
            Pantau kategori model ini saja
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => {
            const n = c.id === "all" ? records.length : catCounts[c.id] || 0;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`px-2.5 py-1.5 text-xs font-extrabold uppercase border-2 border-border ${
                  category === c.id ? "bg-ink text-bg" : "bg-surface-2"
                }`}
              >
                {c.label}{" "}
                <span className="ml-0.5 px-1 py-px bg-[#FFDC58] text-black border border-black text-[10px]">
                  {n}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tools row: search + slim buttons + status tabs */}
      <div className="flex gap-2 flex-wrap items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari model… misal deepseek, gpt, claude"
          className="flex-1 min-w-[180px] py-2 px-3 text-sm bg-surface-2 border-2 border-border rounded-none focus:outline-none focus:border-brand-600"
        />
        <button
          onClick={() => runRound("list")}
          disabled={!!busy}
          className={`${SLIM_BTN} bg-[#FFDC58] hover:bg-[#ffd21f] disabled:opacity-50`}
        >
          {busy === "list" ? "…" : "Cek Katalog"}
        </button>
        <button
          onClick={pingVisible}
          disabled={!!busy}
          className={`${SLIM_BTN} bg-[#FF5C00] text-white hover:bg-[#e65100] disabled:opacity-50`}
        >
          {busy === "chat" ? "…" : "Ping yang Tampil"}
        </button>
        <div className="flex gap-1.5 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`${SLIM_BTN} ${
                tab === t.value ? "bg-ink text-bg" : "bg-surface-2"
              }`}
            >
              {t.label} ({t.value === "all" ? records.length : count(t.value)})
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs font-bold -mt-1">
        Menampilkan {filtered.length} dari {records.length} model
        {category !== "all" ? ` — kategori ${categoryLabel(category)}` : ""}
      </p>

      {filtered.length === 0 ? (
        <Card padding="sm">
          <p className="text-sm text-text-muted">Tidak ada model yang cocok dengan filter ini.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {filtered.map((r) => {
            const meta = STATUS_META[r.status] || null;
            return (
              <div
                key={r.id}
                className="border-2 border-border bg-surface p-2.5 shadow-[2px_2px_0_#0A0A0A] flex flex-col gap-1.5"
              >
                {meta && (
                  <span
                    className="self-start text-[10px] font-extrabold uppercase px-1.5 py-0.5 border-2 border-black"
                    style={{ backgroundColor: meta.color, color: meta.text }}
                  >
                    {meta.label}
                  </span>
                )}
                <div className="font-extrabold text-[13px] leading-snug break-all">{r.id}</div>
                {r.latencyMs != null && (
                  <div className="text-[11px] text-text-muted">
                    Latency <b className="text-text-main">{r.latencyMs} ms</b> · HTTP{" "}
                    <b className="text-text-main">{r.httpStatus ?? "—"}</b>
                  </div>
                )}
                {r.error && r.status === "dead" && (
                  <p className="text-[11px] text-danger font-bold break-words">{r.error}</p>
                )}
                <div className="mt-auto pt-0.5">
                  <button
                    onClick={() => checkOne(r.id)}
                    disabled={!!checking}
                    className={`${SLIM_BTN} bg-surface hover:bg-surface-3 disabled:opacity-50`}
                  >
                    {checking === r.id ? "…" : "TES"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
