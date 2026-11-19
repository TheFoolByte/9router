import { NextResponse } from "next/server";
import { saveState, seedSampleState } from "@/lib/secondBrain/store";

// POST /api/second-brain/reset — back to the default sample state.
export async function POST() {
  try {
    const seeded = seedSampleState();
    await saveState(seeded);
    return NextResponse.json({ success: true, state: seeded });
  } catch (error) {
    console.log("Error resetting second-brain state:", error);
    return NextResponse.json({ error: "Failed to reset state" }, { status: 500 });
  }
}
