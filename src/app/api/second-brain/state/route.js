import { NextResponse } from "next/server";
import { loadState } from "@/lib/secondBrain/store";

// GET /api/second-brain/state — the agent's whole working memory right now.
export async function GET() {
  try {
    const state = await loadState();
    return NextResponse.json(state);
  } catch (error) {
    console.log("Error loading second-brain state:", error);
    return NextResponse.json({ error: "Failed to load second-brain state" }, { status: 500 });
  }
}
