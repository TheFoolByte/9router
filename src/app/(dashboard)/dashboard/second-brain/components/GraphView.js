"use client";

import { useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import { ReactFlow, Handle, Position, Panel, useReactFlow, useViewport } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

// Node kinds in the agent's working memory — NOT note categories.
export const KIND_META = {
  goal: { label: "Goal", color: "#FF5C00" },
  step: { label: "Step", color: "#FFDC58" },
  fact: { label: "Fact", color: "#7FBCFF" },
  file: { label: "File", color: "#A6F750" },
  tool: { label: "Tool", color: "#FF90E8" },
  decision: { label: "Decision", color: "#C084FC" },
};

// Circle diameters per kind (px). Goal is the biggest, in the centre.
const NODE_SIZE = {
  goal: 150,
  step: 112,
  fact: 96,
  file: 96,
  tool: 96,
  decision: 96,
};

const LAYOUTS = [
  { id: "orbit", label: "Orbit" },
  { id: "pohon", label: "Pohon" },
  { id: "sebar", label: "Sebar" },
];

// Deterministic hash so Sebar positions are stable across renders.
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function BrainNode({ data }) {
  const meta = KIND_META[data.kind] || KIND_META.fact;
  const size = NODE_SIZE[data.kind] || 96;
  const selected = !!data.selected;
  return (
    <div
      className="flex items-center justify-center text-center cursor-pointer"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        backgroundColor: meta.color,
        border: "3px solid #0A0A0A",
        boxShadow: "4px 4px 0 #0A0A0A",
        outline: selected ? "3px dashed #FF5C00" : "none",
        outlineOffset: 4,
        position: "relative",
      }}
      onClick={() => data.onSelect?.(data.id)}
      title={data.label}
    >
      <Handle type="target" position={Position.Top} id="top" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Bottom} id="bottom" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Left} id="left" className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="source" position={Position.Right} id="right" className="!bg-transparent !border-0 !w-0 !h-0" />
      {/* kind label on top of the circle */}
      <span
        className="absolute left-1/2 -translate-x-1/2 -top-6 text-[9px] font-extrabold uppercase tracking-wide px-1.5 py-px border-2 border-black whitespace-nowrap"
        style={{ backgroundColor: meta.color, color: "#0A0A0A" }}
      >
        {meta.label}
      </span>
      {/* connection-count badge */}
      <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-black text-white text-[10px] font-extrabold flex items-center justify-center border border-black">
        {data.degree ?? 0}
      </span>
      {/* title inside the circle */}
      <span
        className="px-2 font-extrabold leading-tight line-clamp-3 break-words"
        style={{ color: "#0A0A0A", fontSize: data.kind === "goal" ? 11 : 10 }}
      >
        {data.label}
      </span>
    </div>
  );
}

BrainNode.propTypes = { data: PropTypes.object.isRequired };

const nodeTypes = { brain: BrainNode };

// All layouts return centre positions (Map id -> {x, y}); the node
// top-left is centre minus half its circle diameter.
function layoutOrbit(nodes) {
  const goal = nodes.find((n) => n.kind === "goal");
  const steps = nodes.filter((n) => n.kind === "step");
  const rest = nodes.filter((n) => n.kind !== "goal" && n.kind !== "step");
  const placed = new Map();
  if (goal) placed.set(goal.id, { x: 0, y: 0 });
  const ring = (list, rx, ry, offset = 0) => {
    list.forEach((n, i) => {
      const angle = -Math.PI / 2 + offset + (2 * Math.PI * i) / Math.max(1, list.length);
      placed.set(n.id, { x: rx * Math.cos(angle), y: ry * Math.sin(angle) });
    });
  };
  ring(steps, 270, 170);
  ring(rest, 480, 280, 0.35);
  return placed;
}

function layoutPohon(nodes) {
  const goal = nodes.find((n) => n.kind === "goal");
  const steps = nodes.filter((n) => n.kind === "step");
  const rest = nodes.filter((n) => n.kind !== "goal" && n.kind !== "step");
  const placed = new Map();
  const row = (list, y, spacing) => {
    list.forEach((n, i) => {
      placed.set(n.id, { x: (i - (list.length - 1) / 2) * spacing, y });
    });
  };
  if (goal) placed.set(goal.id, { x: 0, y: 0 });
  row(steps, 250, 190);
  row(rest.slice(0, 6), 500, 190);
  row(rest.slice(6), 740, 190);
  return placed;
}

function layoutSebar(nodes) {
  const placed = new Map();
  nodes.forEach((n) => {
    const h = hashStr(n.id);
    placed.set(n.id, {
      x: ((h % 1000) / 1000) * 980 - 490,
      y: (((h >> 10) % 1000) / 1000) * 640 - 320,
    });
  });
  return placed;
}

// Bottom-left zoom pill: plain + / − / fullscreen buttons plus a zoom-% strip.
// Icon sizing is scoped to these buttons only — no broad svg rule anywhere.
function ZoomPill() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  return (
    <Panel position="bottom-left">
      <div className="flex flex-col items-center gap-1.5">
        <div className="flex flex-col bg-white border-[3px] border-black shadow-[3px_3px_0_#0A0A0A]">
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => zoomIn({ duration: 200 })}
            className="w-9 h-9 flex items-center justify-center text-xl font-black leading-none border-b-2 border-black hover:bg-[#FFDC58]"
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => zoomOut({ duration: 200 })}
            className="w-9 h-9 flex items-center justify-center text-xl font-black leading-none border-b-2 border-black hover:bg-[#FFDC58]"
          >
            −
          </button>
          <button
            type="button"
            aria-label="Fit view"
            onClick={() => fitView({ padding: 0.2, duration: 200 })}
            className="w-9 h-9 flex items-center justify-center hover:bg-[#FFDC58]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, lineHeight: 1 }}>
              fullscreen
            </span>
          </button>
        </div>
        <div className="bg-black text-white text-[10px] font-extrabold px-1.5 py-0.5 leading-none">
          {Math.round(zoom * 100)}%
        </div>
      </div>
    </Panel>
  );
}

function FitOnLayoutChange({ layout }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    fitView({ padding: 0.2, duration: 200 });
  }, [layout, fitView]);
  return null;
}

FitOnLayoutChange.propTypes = { layout: PropTypes.string.isRequired };

export default function GraphView({ nodes, edges, selectedId, onSelect }) {
  const [layout, setLayout] = useState("orbit");

  const degree = useMemo(() => {
    const d = {};
    for (const e of edges) {
      d[e.from] = (d[e.from] || 0) + 1;
      d[e.to] = (d[e.to] || 0) + 1;
    }
    return d;
  }, [edges]);

  const rfNodes = useMemo(() => {
    const placed =
      layout === "pohon" ? layoutPohon(nodes) : layout === "sebar" ? layoutSebar(nodes) : layoutOrbit(nodes);
    return nodes.map((node) => {
      const size = NODE_SIZE[node.kind] || 96;
      const c = placed.get(node.id) || { x: 0, y: 0 };
      return {
        id: node.id,
        type: "brain",
        position: { x: c.x - size / 2, y: c.y - size / 2 },
        draggable: true,
        data: {
          id: node.id,
          label: node.label,
          kind: node.kind,
          status: node.status,
          degree: degree[node.id] || 0,
          selected: node.id === selectedId,
          onSelect,
        },
      };
    });
  }, [nodes, selectedId, onSelect, layout, degree]);

  const rfEdges = useMemo(
    () =>
      edges.map((e) => {
        const isSelected = !!selectedId && (e.from === selectedId || e.to === selectedId);
        return {
          id: e.id,
          source: e.from,
          target: e.to,
          type: "smoothstep",
          // Relation labels only for the selected node's edges.
          label: isSelected ? e.relation.replaceAll("_", " ") : undefined,
          labelStyle: { fontSize: 10, fontWeight: 800, fill: "var(--color-text-muted)" },
          labelBgStyle: { fill: "var(--color-surface)", fillOpacity: 0.95 },
          labelBgPadding: [4, 2],
          labelBgBorderRadius: 0,
          style: { stroke: isSelected ? "#FF5C00" : "var(--color-border)", strokeWidth: isSelected ? 2.5 : 2 },
        };
      }),
    [edges, selectedId]
  );

  if (nodes.length === 0) {
    return (
      <div className="h-[420px] flex items-center justify-center border-[3px] border-border bg-surface text-text-muted text-sm">
        Otak agent kosong — tidak ada tugas aktif.
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3">
        {LAYOUTS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLayout(l.id)}
            className={`px-3 py-1.5 text-xs font-extrabold uppercase border-2 border-border ${
              layout === l.id ? "bg-ink text-bg" : "bg-surface-2"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
      <div className="h-[520px] w-full min-w-0 border-[3px] border-border bg-bg">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.15}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          panOnDrag
          zoomOnScroll
          nodesConnectable={false}
        >
          <ZoomPill />
          <FitOnLayoutChange layout={layout} />
        </ReactFlow>
      </div>
    </div>
  );
}

GraphView.propTypes = {
  nodes: PropTypes.array.isRequired,
  edges: PropTypes.array.isRequired,
  selectedId: PropTypes.string,
  onSelect: PropTypes.func,
};
