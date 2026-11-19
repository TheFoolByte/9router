import { NextResponse } from "next/server";
import { loadState, saveState, appendEvent } from "@/lib/secondBrain/store";

// POST /api/second-brain/event — the ingestion point for a real agent.
// A connected agent reports what it is doing while a task runs:
//   { type: "thought"|"action"|"tool"|"observation"|"done", text, node?, edge? }
// node/edge are optional — the agent can grow its own knowledge graph live.
const EVENT_TYPES = ["thought", "action", "tool", "observation", "done"];

export async function POST(request) {
  try {
    const body = await request.json();
    const { type, text, node, edge } = body || {};
    if (!EVENT_TYPES.includes(type) || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Invalid event: need type + text" }, { status: 400 });
    }
    if (node && (typeof node.label !== "string" || !node.label.trim())) {
      return NextResponse.json({ error: "Invalid node: need label" }, { status: 400 });
    }
    const state = await loadState();
    const next = appendEvent(state, { type, text: text.trim(), node, edge });
    await saveState(next);
    return NextResponse.json({ success: true, events: next.events.length, nodes: next.nodes.length });
  } catch (error) {
    console.log("Error appending second-brain event:", error);
    return NextResponse.json({ error: "Failed to append event" }, { status: 500 });
  }
}
