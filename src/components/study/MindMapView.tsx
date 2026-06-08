import { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, Download, RotateCcw } from "lucide-react";
import type { MindMapNode } from "@/types";

interface MindMapViewProps {
  root: MindMapNode;
}

const COLORS = [
  "#E07B1A", "#6366f1", "#10b981", "#f59e0b",
  "#ec4899", "#14b8a6", "#8b5cf6", "#ef4444",
];

interface LayoutNode {
  node: MindMapNode;
  x: number;
  y: number;
  color: string;
  depth: number;
}

function buildLayout(root: MindMapNode): {
  nodes: LayoutNode[];
  edges: { x1: number; y1: number; x2: number; y2: number }[];
} {
  const nodes: LayoutNode[] = [];
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = [];
  const CX = 400, CY = 300;

  nodes.push({ node: root, x: CX, y: CY, color: COLORS[0], depth: 0 });

  const children1 = root.children ?? [];
  children1.forEach((child, i) => {
    const angle = (i / children1.length) * 2 * Math.PI - Math.PI / 2;
    const r = 160;
    const cx = CX + r * Math.cos(angle);
    const cy = CY + r * Math.sin(angle);
    const color = COLORS[(i + 1) % COLORS.length];
    nodes.push({ node: child, x: cx, y: cy, color, depth: 1 });
    edges.push({ x1: CX, y1: CY, x2: cx, y2: cy });

    const children2 = child.children ?? [];
    children2.forEach((grandchild, j) => {
      const spread = Math.PI / 3;
      const base = angle - spread / 2 + (spread / Math.max(children2.length - 1, 1)) * j;
      const r2 = 110;
      const gx = cx + r2 * Math.cos(base);
      const gy = cy + r2 * Math.sin(base);
      nodes.push({ node: grandchild, x: gx, y: gy, color, depth: 2 });
      edges.push({ x1: cx, y1: cy, x2: gx, y2: gy });
    });
  });

  return { nodes, edges };
}

interface Transform { x: number; y: number; scale: number }

function getTouchDist(touches: TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function MindMapView({ root }: MindMapViewProps) {
  const [tf, setTf]         = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDrag] = useState(false);
  const containerRef        = useRef<HTMLDivElement>(null);
  const svgRef              = useRef<SVGSVGElement>(null);

  // Mouse drag tracking
  const lastPt = useRef({ x: 0, y: 0 });

  // Touch tracking
  const lastTouch  = useRef<{ x: number; y: number } | null>(null);
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);

  const { nodes, edges } = buildLayout(root);

  // ── Desktop: wheel = pinch-zoom (ctrl) or two-finger pan ──────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        setTf((t) => ({
          ...t,
          scale: Math.min(Math.max(t.scale * (1 - e.deltaY * 0.008), 0.25), 5),
        }));
      } else {
        setTf((t) => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Mobile: 1-finger pan, 2-finger pinch zoom ──────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastTouch.current  = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        pinchStart.current = null;
      } else if (e.touches.length === 2) {
        lastTouch.current = null;
        const dist = getTouchDist(e.touches);
        // Capture current scale at pinch start
        setTf((t) => {
          pinchStart.current = { dist, scale: t.scale };
          return t;
        });
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && lastTouch.current) {
        const dx = e.touches[0].clientX - lastTouch.current.x;
        const dy = e.touches[0].clientY - lastTouch.current.y;
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        setTf((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
      } else if (e.touches.length === 2 && pinchStart.current) {
        const dist  = getTouchDist(e.touches);
        const ratio = dist / pinchStart.current.dist;
        const newScale = Math.min(Math.max(pinchStart.current.scale * ratio, 0.25), 5);
        setTf((t) => ({ ...t, scale: newScale }));
      }
    };

    const onTouchEnd = () => {
      lastTouch.current  = null;
      pinchStart.current = null;
    };

    el.addEventListener("touchstart",  onTouchStart, { passive: false });
    el.addEventListener("touchmove",   onTouchMove,  { passive: false });
    el.addEventListener("touchend",    onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart",  onTouchStart);
      el.removeEventListener("touchmove",   onTouchMove);
      el.removeEventListener("touchend",    onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // ── Mouse-only pointer drag ────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    setDrag(true);
    lastPt.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !dragging) return;
    const dx = e.clientX - lastPt.current.x;
    const dy = e.clientY - lastPt.current.y;
    lastPt.current = { x: e.clientX, y: e.clientY };
    setTf((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    setDrag(false);
  };

  const zoomIn  = () => setTf((t) => ({ ...t, scale: Math.min(t.scale + 0.2, 5) }));
  const zoomOut = () => setTf((t) => ({ ...t, scale: Math.max(t.scale - 0.2, 0.25) }));
  const reset   = () => setTf({ x: 0, y: 0, scale: 1 });

  const exportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const blob = new Blob([svgRef.current.outerHTML], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "mindmap.svg"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <div className="flex flex-col h-full select-none">
      {/* toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-2)] shrink-0">
        <button onClick={zoomIn}  title="Zoom in"  className="p-1.5 rounded hover:bg-[var(--surface-3)] transition-colors text-[var(--text-muted)]"><ZoomIn  className="w-3.5 h-3.5" /></button>
        <button onClick={zoomOut} title="Zoom out" className="p-1.5 rounded hover:bg-[var(--surface-3)] transition-colors text-[var(--text-muted)]"><ZoomOut className="w-3.5 h-3.5" /></button>
        <button onClick={reset}   title="Reset"    className="p-1.5 rounded hover:bg-[var(--surface-3)] transition-colors text-[var(--text-muted)]"><RotateCcw className="w-3.5 h-3.5" /></button>
        <span className="text-xs text-[var(--text-muted)] ml-1 tabular-nums">{Math.round(tf.scale * 100)}%</span>
        <p className="text-[10px] text-[var(--text-muted)] ml-2 hidden sm:block">Pinch to zoom · Drag to pan</p>
        <p className="text-[10px] text-[var(--text-muted)] ml-2 sm:hidden">2 fingers zoom · 1 finger pan</p>
        <div className="flex-1" />
        <button
          onClick={exportSVG}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs border border-[var(--border)] hover:bg-[var(--surface-3)] transition-colors text-[var(--text-muted)]"
        >
          <Download className="w-3 h-3" />Export
        </button>
      </div>

      {/* canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-[var(--surface-1)]"
        style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(calc(-50% + ${tf.x}px), calc(-50% + ${tf.y}px)) scale(${tf.scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.12s ease-out",
          }}
        >
          <svg
            ref={svgRef}
            viewBox="0 0 800 600"
            width={800}
            height={600}
            style={{ display: "block" }}
          >
            {edges.map((e, i) => (
              <line
                key={i}
                x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                stroke="var(--border)"
                strokeWidth="1.5"
                strokeDasharray={e.x1 === 400 ? "0" : "4 3"}
              />
            ))}
            {nodes.map(({ node, x, y, color, depth }) => {
              const fontSize = depth === 0 ? 12 : depth === 1 ? 10 : 9;
              const label    = node.label.length > 20 ? node.label.slice(0, 18) + "…" : node.label;
              const rx       = depth === 0 ? 40 : depth === 1 ? 30 : 24;
              const ry       = depth === 0 ? 20 : depth === 1 ? 16 : 13;
              return (
                <g key={node.id} transform={`translate(${x},${y})`}>
                  <ellipse
                    rx={rx} ry={ry}
                    fill={`${color}22`}
                    stroke={color}
                    strokeWidth={depth === 0 ? 2 : 1.5}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight={depth === 0 ? "700" : "500"}
                    fill={color}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
