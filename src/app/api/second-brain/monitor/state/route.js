import { NextResponse } from "next/server";
import { loadState, saveState, runListRound, LIST_STALE_MS, withRoundLock } from "@/lib/secondBrain/monitor";

// GET /api/second-brain/monitor/state — monitored models + last statuses.
// Lazily refreshes the catalog list (0 tokens) when the last list check is
// older than 60s; chat pings are never automatic — use POST /round or /check.
export async function GET() {
  try {
    let state = await loadState();
    const stale = !state.lastListAt || Date.now() - new Date(state.lastListAt).getTime() > LIST_STALE_MS;
    if (stale) {
      try {
        state = await withRoundLock(async () => {
          const fresh = await loadState();
          const next = await runListRound(fresh);
          await saveState(next);
          return next;
        });
      } catch (e) {
        console.log("Monitor list refresh failed, serving cached state:", e?.message);
        return NextResponse.json({ ...state, listError: String(e?.message || e) });
      }
    }
    return NextResponse.json(state);
  } catch (error) {
    console.log("Error loading monitor state:", error);
    return NextResponse.json({ error: "Failed to load monitor state" }, { status: 500 });
  }
}
