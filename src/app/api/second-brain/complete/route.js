import { NextResponse } from "next/server";
import { loadState, saveState, completeTask } from "@/lib/secondBrain/store";

// POST /api/second-brain/complete — the active task is done.
// Its working memory is WIPED: nodes, edges and trace disappear.
// Only the finished task's title + time remain in completedTasks.
export async function POST() {
  try {
    const state = await loadState();
    if (!state.task) {
      return NextResponse.json({ success: true, message: "No active task", state });
    }
    const next = completeTask(state);
    await saveState(next);
    return NextResponse.json({ success: true, state: next });
  } catch (error) {
    console.log("Error completing second-brain task:", error);
    return NextResponse.json({ error: "Failed to complete task" }, { status: 500 });
  }
}
