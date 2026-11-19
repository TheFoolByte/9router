// Client-side API for the agent Second Brain backend.
export async function fetchState() {
  const res = await fetch("/api/second-brain/state");
  if (!res.ok) throw new Error("Failed to load second-brain state");
  return res.json();
}

export async function postAction(path, body) {
  const res = await fetch(`/api/second-brain/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}
