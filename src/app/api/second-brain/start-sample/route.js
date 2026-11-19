import { NextResponse } from "next/server";
import { loadState, saveState, startSampleTask } from "@/lib/secondBrain/store";

// POST /api/second-brain/start-sample — start a sample task (demo data).
//   { task: "second-brain" | "models" }
export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const state = await loadState();
    const next = startSampleTask(state, body?.task);
    await saveState(next);
    return NextResponse.json({ success: true, state: next });
  } catch (error) {
    console.log("Error starting sample task:", error);
    return NextResponse.json({ error: "Failed to start sample task" }, { status: 500 });
  }
}
