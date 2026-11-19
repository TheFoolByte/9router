import { NextResponse } from "next/server";
import { loadState, saveState, checkOne } from "@/lib/secondBrain/monitor";

// POST /api/second-brain/monitor/check — chat-ping one monitored model.
//   { "model": "<id>" }
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const model = body?.model;
    if (typeof model !== "string" || !model.trim()) {
      return NextResponse.json({ error: "Need a model id" }, { status: 400 });
    }
    const state = await loadState();
    const next = await checkOne(state, model.trim());
    await saveState(next);
    return NextResponse.json({ success: true, state: next });
  } catch (error) {
    console.log("Error checking model:", error);
    const status = /not monitored/i.test(error?.message || "") ? 400 : 500;
    return NextResponse.json({ error: error?.message || "Failed to check model" }, { status });
  }
}
