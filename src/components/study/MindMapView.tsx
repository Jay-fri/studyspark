import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Minimize2 } from "lucide-react";
import type { MindMapNode } from "@/types";

// ── Branch colours (index 0 = root orange, 1-7 = topics) ─────────────────────
const COLORS = [
  "#F97316", "#6366f1", "#10b981", "#f59e0b",
  "#ec4899", "#14b8a6", "#8b5cf6", "#ef4444",
];

// ── Per-depth geometry constants ───────────────────────────────────────────────
const NODE = {
  0: { h: 46, maxW: 180, font: 13, cw: 7.8, pad: 32, maxChars: 20 },
  1: { h: 36, maxW: 150, font: 11, cw: 6.5, pad: 28, maxChars: 20 },
  2: { h: 28, maxW: 134, font: 10, cw: 5.8, pad: 24, maxChars: 22 },
} as const;

const BTN_R = 9;   // expand toggle button radius

// ── Utility helpers ────────────────────────────────────────────────────────────
function trunc(s: string, max: number) {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

function nw(label: string, d: 0 | 1 | 2) {
  const g = NODE[d];
  return Math.min(label.length * g.cw + g.pad, g.maxW);
}

function edgeClip(x1: number, y1: number, d1: 0 | 1 | 2,
                  x2: number, y2: number, d2: 0 | 1 | 2) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const o1 = NODE[d1].h / 2 + 4;
  const o2 = NODE[d2].h / 2 + 4;
  return {
    sx: x1 + o1 * Math.cos(a), sy: y1 + o1 * Math.sin(a),
    tx: x2 - o2 * Math.cos(a), ty: y2 - o2 * Math.sin(a),
  };
}

// ── Layout types ───────────────────────────────────────────────────────────────
interface LNode {
  id: string; label: string; display: string;
  x: number; y: number;
  px: number; py: number;         // parent x/y (for spring origin)
  depth: 0 | 1 | 2; color: string;
  hasKids: boolean; w: number; h: number;
}
interface LEdge {
  id: string; sx: number; sy: number; tx: number; ty: number;
  color: string; topicId: string; isStatic: boolean;
}

function computeLayout(root: MindMapNode, expanded: Set<string>) {
  const topics = root.children ?? [];
  const n = topics.length;
  // Scale radius so topics don't crowd; minimum 190
  const R1 = Math.max(190, n * 38 + 60);
  const R2 = 165;

  const staticNodes: LNode[] = [];
  const dynamicNodes: LNode[] = [];
  const staticEdges: LEdge[] = [];
  const dynamicEdges: LEdge[] = [];

  // Root
  const rLabel = trunc(root.label, NODE[0].maxChars);
  staticNodes.push({
    id: root.id, label: root.label, display: rLabel,
    x: 0, y: 0, px: 0, py: 0,
    depth: 0, color: COLORS[0],
    hasKids: n > 0, w: nw(rLabel, 0), h: NODE[0].h,
  });

  topics.forEach((topic, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const tx = R1 * Math.cos(angle);
    const ty = R1 * Math.sin(angle);
    const col = COLORS[(i % (COLORS.length - 1)) + 1];
    const tLabel = trunc(topic.label, NODE[1].maxChars);
    const tw = nw(tLabel, 1);
    const kids = topic.children ?? [];

    staticNodes.push({
      id: topic.id, label: topic.label, display: tLabel,
      x: tx, y: ty, px: 0, py: 0,
      depth: 1, color: col,
      hasKids: kids.length > 0, w: tw, h: NODE[1].h,
    });

    // Root → topic edge
    const ep = edgeClip(0, 0, 0, tx, ty, 1);
    staticEdges.push({
      id: `${root.id}→${topic.id}`,
      sx: ep.sx, sy: ep.sy, tx: ep.tx, ty: ep.ty,
      color: col, topicId: topic.id, isStatic: true,
    });

    // Subtopics (only when topic is expanded)
    if (expanded.has(topic.id)) {
      const ns = kids.length;
      const spreadMax = Math.PI * 0.72;
      const spread = ns <= 1 ? 0 : Math.min(spreadMax, ns * 0.32);
      kids.forEach((sub, j) => {
        const subA = angle + (ns === 1 ? 0 : -spread / 2 + (spread / (ns - 1)) * j);
        const sx = tx + R2 * Math.cos(subA);
        const sy = ty + R2 * Math.sin(subA);
        const sLabel = trunc(sub.label, NODE[2].maxChars);
        const sw = nw(sLabel, 2);

        dynamicNodes.push({
          id: sub.id, label: sub.label, display: sLabel,
          x: sx, y: sy, px: tx, py: ty,
          depth: 2, color: col,
          hasKids: false, w: sw, h: NODE[2].h,
        });

        const ep2 = edgeClip(tx, ty, 1, sx, sy, 2);
        dynamicEdges.push({
          id: `${topic.id}→${sub.id}`,
          sx: ep2.sx, sy: ep2.sy, tx: ep2.tx, ty: ep2.ty,
          color: col, topicId: topic.id, isStatic: false,
        });
      });
    }
  });

  return { staticNodes, dynamicNodes, staticEdges, dynamicEdges };
}

// ── Single node rendered inside a <motion.g> ──────────────────────────────────
function MapNode({
  n, expanded, onToggle,
}: { n: LNode; expanded: boolean; onToggle: (id: string) => void }) {
  const { display, depth, color, hasKids, w, h } = n;
  const rx = h / 2;
  const font = NODE[depth].font;
  const btnX = w / 2 + 16;

  return (
    <g style={{ cursor: hasKids && depth < 2 ? "pointer" : "default" }}
       onClick={() => hasKids && depth < 2 && onToggle(n.id)}>

      {/* pill */}
      <rect
        x={-w / 2} y={-h / 2} width={w} height={h} rx={rx}
        fill={depth === 0 ? color : color + "18"}
        stroke={depth === 0 ? "none" : color}
        strokeWidth={1.5}
      />

      {/* label */}
      <text
        x={0} y={0}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={font}
        fontWeight={depth < 2 ? 600 : 500}
        fill={depth === 0 ? "#fff" : color}
        style={{ pointerEvents: "none", userSelect: "none" }}
      >
        {display}
      </text>

      {/* expand / collapse toggle */}
      {hasKids && depth < 2 && (
        <g
          transform={`translate(${btnX}, 0)`}
          style={{ cursor: "pointer" }}
          onClick={(e) => { e.stopPropagation(); onToggle(n.id); }}
        >
          <motion.circle
            r={BTN_R}
            animate={{ fill: expanded ? color : color + "28" }}
            stroke={color} strokeWidth={1.5}
            transition={{ duration: 0.18 }}
          />
          {/* "+" rotates to "×" when open */}
          <motion.line
            x1="-4" y1="0" x2="4" y2="0"
            stroke={expanded ? "#fff" : color}
            strokeWidth={2} strokeLinecap="round"
          />
          <motion.line
            x1="0" y1="-4" x2="0" y2="4"
            animate={{ opacity: expanded ? 0 : 1 }}
            stroke={color}
            strokeWidth={2} strokeLinecap="round"
            transition={{ duration: 0.15 }}
          />
        </g>
      )}
    </g>
  );
}

// ── Pan / zoom state ──────────────────────────────────────────────────────────
interface Tf { x: number; y: number; scale: number }
function getTouchDist(t: TouchList) {
  const dx = t[0].clientX - t[1].clientX;
  const dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Main export ───────────────────────────────────────────────────────────────
export function MindMapView({ root }: { root: MindMapNode }) {
  const [expanded,  setExpanded]  = useState<Set<string>>(new Set());
  const [tf,        setTf]        = useState<Tf>({ x: 0, y: 0, scale: 1 });
  const [dragging,  setDragging]  = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);
  const lastPt       = useRef({ x: 0, y: 0 });
  const lastTouch    = useRef<{ x: number; y: number } | null>(null);
  const pinchStart   = useRef<{ dist: number; scale: number } | null>(null);

  const { staticNodes, dynamicNodes, staticEdges, dynamicEdges } = useMemo(
    () => computeLayout(root, expanded),
    [root, expanded]
  );

  const toggle = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const ids = new Set<string>();
    (root.children ?? []).forEach((c) => { if ((c.children ?? []).length) ids.add(c.id); });
    setExpanded(ids);
  }, [root]);

  const collapseAll = useCallback(() => setExpanded(new Set()), []);
  const allExpanded = (root.children ?? [])
    .filter((c) => (c.children ?? []).length > 0)
    .every((c) => expanded.has(c.id));

  // ── Wheel zoom / pan ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setTf((t) => ({ ...t, scale: Math.min(Math.max(t.scale * (1 - e.deltaY * 0.007), 0.2), 5) }));
      } else {
        setTf((t) => ({ ...t, x: t.x - e.deltaX, y: t.y - e.deltaY }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Touch ─────────────────────────────────────────────────────────────────
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
        setTf((t) => { pinchStart.current = { dist, scale: t.scale }; return t; });
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
        const ratio = getTouchDist(e.touches) / pinchStart.current.dist;
        setTf((t) => ({ ...t, scale: Math.min(Math.max(pinchStart.current!.scale * ratio, 0.2), 5) }));
      }
    };
    const onTouchEnd = () => { lastTouch.current = null; pinchStart.current = null; };
    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove",  onTouchMove,  { passive: false });
    el.addEventListener("touchend",   onTouchEnd);
    el.addEventListener("touchcancel",onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove",  onTouchMove);
      el.removeEventListener("touchend",   onTouchEnd);
      el.removeEventListener("touchcancel",onTouchEnd);
    };
  }, []);

  // ── Mouse drag ────────────────────────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    setDragging(true);
    lastPt.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !dragging) return;
    const dx = e.clientX - lastPt.current.x;
    const dy = e.clientY - lastPt.current.y;
    lastPt.current = { x: e.clientX, y: e.clientY };
    setTf((t) => ({ ...t, x: t.x + dx, y: t.y + dy }));
  };
  const onPointerUp = (e: React.PointerEvent) => { if (e.pointerType === "mouse") setDragging(false); };

  const zoomIn  = () => setTf((t) => ({ ...t, scale: Math.min(t.scale * 1.25, 5) }));
  const zoomOut = () => setTf((t) => ({ ...t, scale: Math.max(t.scale * 0.8, 0.2) }));
  const reset   = () => setTf({ x: 0, y: 0, scale: 1 });

  const exportSVG = useCallback(() => {
    if (!svgRef.current) return;
    const blob = new Blob([svgRef.current.outerHTML], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "mindmap.svg"; a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Spring config for node appearance
  const spring = { type: "spring" as const, stiffness: 360, damping: 28 };

  return (
    <div className="flex flex-col h-full select-none">

      {/* ── Toolbar ── */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-1)] shrink-0">
        <button onClick={zoomIn}  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]" title="Zoom in"><ZoomIn  className="w-3.5 h-3.5" /></button>
        <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
        <button onClick={reset}   className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]" title="Reset view"><RotateCcw className="w-3.5 h-3.5" /></button>
        <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-9">{Math.round(tf.scale * 100)}%</span>

        <div className="w-px h-4 bg-[var(--border)] mx-1" />

        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]"
        >
          {allExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>

        <div className="flex-1" />

        <span className="text-[10px] text-[var(--text-muted)] hidden sm:block mr-2">
          Click node to expand · Drag to pan · Ctrl+scroll to zoom
        </span>

        <button
          onClick={exportSVG}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]"
        >
          <Download className="w-3 h-3" />SVG
        </button>
      </div>

      {/* ── Canvas ── */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{
          background: "var(--surface-0)",
          cursor: dragging ? "grabbing" : "grab",
          touchAction: "none",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        {/* Animated transform wrapper */}
        <div
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: `translate(calc(-50% + ${tf.x}px), calc(-50% + ${tf.y}px)) scale(${tf.scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          <svg
            ref={svgRef}
            viewBox="-700 -600 1400 1200"
            width={1400} height={1200}
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              {/* dot-grid background */}
              <pattern id="mm-grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="var(--border)" opacity="0.6" />
              </pattern>

              {/* arrowhead markers per colour */}
              {COLORS.slice(1).map((c) => (
                <marker
                  key={c}
                  id={`arr-${c.replace("#","")}`}
                  markerWidth="8" markerHeight="8"
                  refX="6" refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L8,3 z" fill={c} opacity={0.55} />
                </marker>
              ))}
            </defs>

            {/* dot grid fills entire SVG */}
            <rect x="-700" y="-600" width="1400" height="1200" fill="url(#mm-grid)" />

            {/* ── Static edges (root → topics) ──────────────────────────── */}
            {staticEdges.map((e) => (
              <g key={e.id}>
                {/* invisible wide hit area so clicking the edge also toggles */}
                <line
                  x1={e.sx} y1={e.sy} x2={e.tx} y2={e.ty}
                  stroke="transparent" strokeWidth={18}
                  style={{ cursor: "pointer" }}
                  onClick={() => toggle(e.topicId)}
                />
                <line
                  x1={e.sx} y1={e.sy} x2={e.tx} y2={e.ty}
                  stroke={e.color} strokeWidth={2} strokeOpacity={0.45}
                  markerEnd={`url(#arr-${e.color.replace("#","")})`}
                />
              </g>
            ))}

            {/* ── Dynamic edges (topic → subtopics, animate in/out) ──────── */}
            <AnimatePresence>
              {dynamicEdges.map((e) => (
                <motion.path
                  key={e.id}
                  d={`M ${e.sx} ${e.sy} L ${e.tx} ${e.ty}`}
                  stroke={e.color} strokeWidth={1.5} strokeOpacity={0.35}
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{ pathLength: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>

            {/* ── Static nodes (root + all topics — always visible) ────────── */}
            {staticNodes.map((n) => (
              <motion.g
                key={n.id}
                animate={{ x: n.x, y: n.y }}
                transition={spring}
              >
                <MapNode n={n} expanded={expanded.has(n.id)} onToggle={toggle} />
              </motion.g>
            ))}

            {/* ── Dynamic nodes (subtopics — animate in from parent) ────────── */}
            <AnimatePresence>
              {dynamicNodes.map((n) => (
                <motion.g
                  key={n.id}
                  initial={{ opacity: 0, scale: 0.35, x: n.px, y: n.py }}
                  animate={{ opacity: 1, scale: 1,   x: n.x,  y: n.y  }}
                  exit={{    opacity: 0, scale: 0.35, x: n.px, y: n.py }}
                  transition={spring}
                >
                  <MapNode n={n} expanded={false} onToggle={toggle} />
                </motion.g>
              ))}
            </AnimatePresence>
          </svg>
        </div>
      </div>
    </div>
  );
}
