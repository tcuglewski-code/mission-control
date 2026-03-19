"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  NodeProps,
  Handle,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import * as dagre from "@dagrejs/dagre";
import { X, Box, Database as DbIcon, Wrench, FolderKanban } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  color: string;
  status: string;
  description: string | null;
}

interface DbEntry {
  id: string;
  name: string;
  type: string;
  status: string;
  projectId: string | null;
}

interface DiagramClientProps {
  projects: Project[];
  databases: DbEntry[];
}

interface NodeData {
  label: string;
  type: "project" | "database" | "tool";
  color?: string;
  status?: string;
  description?: string;
  dbType?: string;
  toolDescription?: string;
}

// ─── Hardcoded Tools ──────────────────────────────────────────────────────────

const TOOLS = [
  { id: "tool-github",    label: "GitHub",     description: "Source Control & CI/CD", color: "#6e7681" },
  { id: "tool-vercel",    label: "Vercel",     description: "Deployment & Hosting",   color: "#000000" },
  { id: "tool-hostinger", label: "Hostinger",  description: "Web Hosting",            color: "#673de6" },
  { id: "tool-wordpress", label: "WordPress",  description: "CMS",                    color: "#21759b" },
];

// Project → Tool mappings (hardcoded for now)
const PROJECT_TOOL_EDGES = [
  { projectKey: "Koch Website",    toolId: "tool-wordpress" },
  { projectKey: "Koch Website",    toolId: "tool-hostinger" },
  { projectKey: "Mission Control", toolId: "tool-vercel" },
  { projectKey: "Mission Control", toolId: "tool-github" },
];

// ─── Auto Layout ──────────────────────────────────────────────────────────────

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80 });

  nodes.forEach((node) => g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  return nodes.map((node) => {
    const n = g.node(node.id);
    return {
      ...node,
      position: { x: n.x - NODE_WIDTH / 2, y: n.y - NODE_HEIGHT / 2 },
    };
  });
}

// ─── Custom Node: Project ─────────────────────────────────────────────────────

function ProjectNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div
      className={`rounded-xl border-2 px-4 py-2.5 shadow-lg cursor-pointer transition-all min-w-[160px] ${
        selected ? "ring-2 ring-white/30" : ""
      }`}
      style={{ borderColor: data.color ?? "#10b981", background: `${data.color ?? "#10b981"}18` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-emerald-500 !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2">
        <FolderKanban className="w-4 h-4 shrink-0" style={{ color: data.color ?? "#10b981" }} />
        <div>
          <p className="text-white text-xs font-semibold leading-tight">{data.label}</p>
          {data.status && (
            <p className="text-xs mt-0.5" style={{ color: data.color ?? "#10b981", opacity: 0.8 }}>
              {data.status}
            </p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-emerald-500 !w-2 !h-2 !border-0" />
    </div>
  );
}

// ─── Custom Node: Database ────────────────────────────────────────────────────

const DB_COLORS: Record<string, string> = {
  postgresql: "#336791",
  neon: "#00e599",
  mysql: "#4479a1",
  mongodb: "#47a248",
  watermelondb: "#f43f5e",
  sqlite: "#8c8c8c",
  redis: "#dc382d",
};

function DatabaseNode({ data, selected }: NodeProps<NodeData>) {
  const color = DB_COLORS[data.dbType ?? ""] ?? "#3b82f6";
  return (
    <div
      className={`rounded-xl border-2 px-4 py-2.5 shadow-lg cursor-pointer min-w-[160px] ${
        selected ? "ring-2 ring-white/30" : ""
      }`}
      style={{ borderColor: color, background: `${color}18` }}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2">
        <DbIcon className="w-4 h-4 shrink-0" style={{ color }} />
        <div>
          <p className="text-white text-xs font-semibold leading-tight">{data.label}</p>
          <p className="text-xs mt-0.5" style={{ color, opacity: 0.8 }}>{data.dbType}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500 !w-2 !h-2 !border-0" />
    </div>
  );
}

// ─── Custom Node: Tool ────────────────────────────────────────────────────────

function ToolNode({ data, selected }: NodeProps<NodeData>) {
  return (
    <div
      className={`rounded-xl border-2 border-zinc-600 bg-zinc-800/50 px-4 py-2.5 shadow-lg cursor-pointer min-w-[140px] ${
        selected ? "ring-2 ring-white/30" : ""
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-500 !w-2 !h-2 !border-0" />
      <div className="flex items-center gap-2">
        <Wrench className="w-4 h-4 shrink-0 text-zinc-400" />
        <div>
          <p className="text-white text-xs font-semibold leading-tight">{data.label}</p>
          {data.toolDescription && (
            <p className="text-zinc-400 text-xs mt-0.5">{data.toolDescription}</p>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-500 !w-2 !h-2 !border-0" />
    </div>
  );
}

const NODE_TYPES = {
  project: ProjectNode,
  database: DatabaseNode,
  tool: ToolNode,
};

// ─── Info Panel ───────────────────────────────────────────────────────────────

function InfoPanel({ node, onClose }: { node: Node<NodeData>; onClose: () => void }) {
  return (
    <div className="absolute top-4 right-4 z-10 bg-[#1a1a1a] border border-zinc-700 rounded-xl shadow-2xl w-64 p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-0.5">
            {node.data.type === "project" ? "Projekt" : node.data.type === "database" ? "Datenbank" : "Tool"}
          </p>
          <h3 className="text-white font-semibold text-sm">{node.data.label}</h3>
        </div>
        <button onClick={onClose} className="text-zinc-400 hover:text-white ml-2">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {node.data.status && (
          <div className="flex justify-between">
            <span className="text-zinc-400">Status</span>
            <span className="text-zinc-200">{node.data.status}</span>
          </div>
        )}
        {node.data.dbType && (
          <div className="flex justify-between">
            <span className="text-zinc-400">Typ</span>
            <span className="text-zinc-200">{node.data.dbType}</span>
          </div>
        )}
        {node.data.description && (
          <div>
            <span className="text-zinc-400 block mb-1">Beschreibung</span>
            <p className="text-zinc-300 text-xs leading-relaxed">{node.data.description}</p>
          </div>
        )}
        {node.data.toolDescription && (
          <div>
            <span className="text-zinc-400 block mb-1">Beschreibung</span>
            <p className="text-zinc-300 text-xs">{node.data.toolDescription}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DiagramClient({ projects, databases }: DiagramClientProps) {
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);

  const { initialNodes, initialEdges } = useMemo(() => {
    const rawNodes: Node<NodeData>[] = [];
    const rawEdges: Edge[] = [];

    // Project nodes
    projects.forEach((p) => {
      rawNodes.push({
        id: `proj-${p.id}`,
        type: "project",
        data: { label: p.name, type: "project", color: p.color, status: p.status, description: p.description ?? undefined },
        position: { x: 0, y: 0 },
      });
    });

    // Database nodes
    databases.forEach((db) => {
      rawNodes.push({
        id: `db-${db.id}`,
        type: "database",
        data: { label: db.name, type: "database", dbType: db.type, status: db.status },
        position: { x: 0, y: 0 },
      });

      // Project → DB edge
      if (db.projectId) {
        rawEdges.push({
          id: `e-proj-${db.projectId}-db-${db.id}`,
          source: `proj-${db.projectId}`,
          target: `db-${db.id}`,
          style: { stroke: "#3b82f6", strokeWidth: 1.5 },
          animated: false,
        });
      }
    });

    // Tool nodes
    TOOLS.forEach((tool) => {
      rawNodes.push({
        id: tool.id,
        type: "tool",
        data: { label: tool.label, type: "tool", toolDescription: tool.description },
        position: { x: 0, y: 0 },
      });
    });

    // Project → Tool edges
    PROJECT_TOOL_EDGES.forEach(({ projectKey, toolId }, i) => {
      const proj = projects.find((p) => p.name.includes(projectKey));
      if (proj) {
        rawEdges.push({
          id: `e-tool-${i}`,
          source: `proj-${proj.id}`,
          target: toolId,
          style: { stroke: "#71717a", strokeWidth: 1, strokeDasharray: "4 3" },
          animated: false,
        });
      }
    });

    // Auto-layout
    const layouted = getLayoutedElements(rawNodes, rawEdges);
    return { initialNodes: layouted, initialEdges: rawEdges };
  }, [projects, databases]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  return (
    <div className="relative w-full h-full" style={{ background: "#0f0f0f" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#27272a" />
        <Controls className="!bg-zinc-900 !border-zinc-700 !rounded-xl" />
        <MiniMap
          className="!bg-zinc-900 !border-zinc-700 !rounded-xl"
          nodeColor={(n) => {
            const d = n.data as NodeData;
            if (d.type === "project") return d.color ?? "#10b981";
            if (d.type === "database") return DB_COLORS[d.dbType ?? ""] ?? "#3b82f6";
            return "#52525b";
          }}
        />
      </ReactFlow>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 text-xs space-y-1.5">
        <p className="text-zinc-400 font-medium mb-1">Legende</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-emerald-500 bg-emerald-500/10" />
          <span className="text-zinc-300">Projekt</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-500/10" />
          <span className="text-zinc-300">Datenbank</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded border-2 border-zinc-600 bg-zinc-800/50" />
          <span className="text-zinc-300">Tool</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <div className="w-6 h-0.5 bg-blue-500" />
          <span className="text-zinc-300">DB-Verbindung</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 border-t border-dashed border-zinc-500" />
          <span className="text-zinc-300">Tool-Verbindung</span>
        </div>
      </div>

      {/* Info Panel */}
      {selectedNode && (
        <InfoPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}
