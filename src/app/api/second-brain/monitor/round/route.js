import { NextResponse } from "next/server";
import { loadState, saveState, runListRound, runChatRound, withRoundLock } from "@/lib/secondBrain/monitor";

// POST /api/second-brain/monitor/round — run a full check round.
//   { "mode": "list" }  — presence in /v1/models, 0 tokens (default);
//                         monitored set becomes the full live catalog
//   { "mode": "chat" }  — real chat ping per model, costs tokens
//                         (~2.862 token/ping measured 2026-11-18)
//   { "mode": "chat", "models": ["<id>", ...] } — ping only these
//                         monitored models (e.g. the ones visible in the UI)
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const mode = body?.mode === "chat" ? "chat" : "list";
    const models = Array.isArray(body?.models)
      ? body.models.filter((m) => typeof m === "string" && m.trim()).map((m) => m.trim())
      : null;
    const next = await withRoundLock(async () => {
      const state = await loadState();
      const updated = mode === "chat" ? await runChatRound(state, models) : await runListRound(state);
      await saveState(updated);
      return updated;
    });
    return NextResponse.json({ success: true, mode, state: next });
  } catch (error) {
    console.log("Error running monitor round:", error);
    return NextResponse.json({ error: "Failed to run monitor round" }, { status: 500 });
  }
}
