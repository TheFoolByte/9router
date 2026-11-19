// Pure model-category classifier — client-safe (no node imports).
// Groups a model id by substring, mirroring the preview's category
// buttons. User-visible strings always say "kategori".

export const CATEGORIES = [
  { id: "all", label: "Semua" },
  { id: "deepseek", label: "DeepSeek" },
  { id: "claude", label: "Claude" },
  { id: "gpt", label: "GPT" },
  { id: "gemini", label: "Gemini" },
  { id: "qwen", label: "Qwen" },
  { id: "glm", label: "GLM" },
  { id: "kimi", label: "Kimi" },
  { id: "grok", label: "Grok" },
  { id: "minimax", label: "MiniMax" },
  { id: "mistral", label: "Mistral" },
  { id: "gemma", label: "Gemma" },
  { id: "llama", label: "Llama" },
  { id: "mimo", label: "MiMo" },
  { id: "muse", label: "Muse" },
  { id: "lainnya", label: "Lainnya" },
];

// Order matters only for ids containing more than one keyword.
// "stral" covers the whole Mistral line: mistral, magistral, codestral,
// voxtral, devstral. "l3-" catches Llama-3 shorthand ids (e.g. L3-8B).
const RULES = [
  ["deepseek", ["deepseek"]],
  ["claude", ["claude"]],
  ["gemini", ["gemini"]],
  ["gpt", ["gpt"]],
  ["qwen", ["qwen"]],
  ["glm", ["glm"]],
  ["kimi", ["kimi"]],
  ["grok", ["grok"]],
  ["minimax", ["minimax"]],
  ["mistral", ["stral", "voxtral"]],
  ["gemma", ["gemma"]],
  ["llama", ["llama", "l3-"]],
  ["mimo", ["mimo"]],
  ["muse", ["muse"]],
];

export function categoryOf(modelId) {
  const id = String(modelId || "").toLowerCase();
  for (const [key, subs] of RULES) {
    if (subs.some((sub) => id.includes(sub))) return key;
  }
  return "lainnya";
}

export function categoryLabel(id) {
  const found = CATEGORIES.find((c) => c.id === id);
  return found ? found.label : id;
}
