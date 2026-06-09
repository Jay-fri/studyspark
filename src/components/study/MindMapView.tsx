import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ZoomIn, ZoomOut, RotateCcw, Download, Maximize2, Minimize2 } from "lucide-react";
import type { MindMapNode } from "@/types";

// ── Colors ────────────────────────────────────────────────────────────────────
const PALETTE = [
  "#6366f1","#10b981","#f59e0b","#ec4899",
  "#14b8a6","#8b5cf6","#ef4444","#3b82f6",
];

// ── Per-depth config ──────────────────────────────────────────────────────────
const DEP = {
  0: { h: 42, fs: 13, px: 22, maxC: 22 },
  1: { h: 34, fs: 11, px: 18, maxC: 22 },
  2: { h: 30, fs: 10, px: 14, maxC: 28 },
} as const;

const CW = [7.5, 6.4, 5.7];   // approx char-width per depth
const DX = [-340, 20, 360];    // x-center per depth (root, topics, subtopics)
const VG = 10;                  // gap between siblings
const TG = 20;                  // extra gap between topic blocks

function nw(lbl: string, d: 0 | 1 | 2) {
  return Math.min(lbl.length * CW[d] + DEP[d].px * 2, d === 0 ? 215 : 195);
}
function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
// Cubic bezier from right edge of node1 → left edge of node2
function bpath(x1: number, y1: number, x2: number, y2: number, w1: number, w2: number) {
  const sx = x1 + w1 / 2, ex = x2 - w2 / 2, cp = (ex - sx) * 0.45;
  const f = (v: number) => v.toFixed(1);
  return `M${f(sx)},${f(y1)} C${f(sx+cp)},${f(y1)} ${f(ex-cp)},${f(y2)} ${f(ex)},${f(y2)}`;
}

// ── Layout types ──────────────────────────────────────────────────────────────
interface LNode {
  id: string; lbl: string; disp: string;
  x: number; y: number; d: 0 | 1 | 2;
  col: string; hasKids: boolean; isOpen: boolean;
  w: number; h: number; tid: string;
}
interface LEdge {
  id: string; path: string; col: string;
  dyn: boolean; tid: string;
}

// ── Layout fn ─────────────────────────────────────────────────────────────────
function computeLayout(root: MindMapNode, expanded: Set<string>) {
  const topics = root.children ?? [];
  const rDisp  = trunc(root.label, DEP[0].maxC);
  const rW     = nw(rDisp, 0);

  const blocks = topics.map((t, i) => {
    const subs   = t.children ?? [];
    const isOpen = expanded.has(t.id);
    const disp   = trunc(t.label, DEP[1].maxC);
    const tw     = nw(disp, 1);
    const col    = PALETTE[i % PALETTE.length];
    const bh     = isOpen && subs.length
      ? subs.length * DEP[2].h + (subs.length - 1) * VG
      : DEP[1].h;
    return { t, subs, isOpen, disp, tw, col, bh };
  });

  const totalH = blocks.reduce((s, b) => s + b.bh, 0) + (blocks.length - 1) * TG;
  let curY = -totalH / 2;

  const nodes: LNode[] = [];
  const edges: LEdge[] = [];
  const tys: number[]  = [];

  blocks.forEach(({ t, subs, isOpen, disp, tw, col, bh }) => {
    const ty = isOpen && subs.length ? curY + bh / 2 : curY + DEP[1].h / 2;
    tys.push(ty);

    nodes.push({
      id: t.id, lbl: t.label, disp,
      x: DX[1], y: ty, d: 1, col,
      hasKids: subs.length > 0, isOpen,
      w: tw, h: DEP[1].h, tid: t.id,
    });

    if (isOpen) {
      subs.forEach((s, j) => {
        const sd = trunc(s.label, DEP[2].maxC);
        const sw = nw(sd, 2);
        const sy = curY + j * (DEP[2].h + VG) + DEP[2].h / 2;
        nodes.push({
          id: s.id, lbl: s.label, disp: sd,
          x: DX[2], y: sy, d: 2, col,
          hasKids: false, isOpen: false,
          w: sw, h: DEP[2].h, tid: t.id,
        });
        edges.push({
          id: `${t.id}→${s.id}`,
          path: bpath(DX[1], ty, DX[2], sy, tw, sw),
          col, dyn: true, tid: t.id,
        });
      });
    }

    curY += bh + TG;
  });

  const ry = tys.length ? (tys[0] + tys[tys.length - 1]) / 2 : 0;

  nodes.unshift({
    id: root.id, lbl: root.label, disp: rDisp,
    x: DX[0], y: ry, d: 0, col: PALETTE[0],
    hasKids: topics.length > 0, isOpen: false,
    w: rW, h: DEP[0].h, tid: root.id,
  });

  // Root → topic edges (paths depend on ry, so computed after)
  topics.forEach((t) => {
    const tn = nodes.find((n) => n.id === t.id)!;
    edges.push({
      id: `root→${t.id}`,
      path: bpath(DX[0], ry, tn.x, tn.y, rW, tn.w),
      col: tn.col, dyn: false, tid: t.id,
    });
  });

  return { nodes, edges };
}

// ── Node component (drawn centred at 0,0) ─────────────────────────────────────
function MapNode({ n, onToggle }: { n: LNode; onToggle: (id: string) => void }) {
  const isRoot = n.d === 0;
  const rx     = n.h / 2;
  const btnX   = n.w / 2 + 14;

  return (
    <g
      onClick={() => n.hasKids && n.d < 2 && onToggle(n.id)}
      style={{ cursor: n.hasKids && n.d < 2 ? "pointer" : "default" }}
    >
      {/* pill */}
      <rect
        x={-n.w / 2} y={-n.h / 2} width={n.w} height={n.h} rx={rx}
        style={{
          fill:          isRoot ? n.col : "var(--surface-2)",
          stroke:        n.col,
          strokeWidth:   isRoot ? 0 : 1.5,
          strokeOpacity: 0.65,
        }}
      />
      {/* label */}
      <text
        textAnchor="middle" dominantBaseline="middle"
        fontSize={DEP[n.d].fs} fontWeight={n.d < 2 ? 600 : 500}
        style={{ fill: isRoot ? "#fff" : "var(--text-primary)", pointerEvents: "none", userSelect: "none" }}
      >
        {n.disp}
      </text>
      {/* expand / collapse button */}
      {n.hasKids && n.d < 2 && (
        <g
          transform={`translate(${btnX}, 0)`}
          onClick={(e) => { e.stopPropagation(); onToggle(n.id); }}
          style={{ cursor: "pointer" }}
        >
          <circle
            r={8}
            style={{ fill: n.isOpen ? n.col : `${n.col}30`, stroke: n.col, strokeWidth: 1.5 }}
          />
          <text
            textAnchor="middle" dominantBaseline="middle"
            fontSize={10} fontWeight={700}
            style={{ fill: n.isOpen ? "#fff" : n.col, pointerEvents: "none", userSelect: "none" }}
          >
            {n.isOpen ? "‹" : "›"}
          </text>
        </g>
      )}
    </g>
  );
}

// ── Pan/zoom helpers ──────────────────────────────────────────────────────────
interface Tf { x: number; y: number; scale: number }
function touchDist(t: TouchList) {
  const dx = t[0].clientX - t[1].clientX, dy = t[0].clientY - t[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Public export (guard) ─────────────────────────────────────────────────────
export function MindMapView({ root }: { root: MindMapNode | undefined | null }) {
  if (!root?.id) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-[var(--text-muted)]">
        Mind map could not be rendered — try generating again.
      </div>
    );
  }
  return <MindMapInner root={root} />;
}

// ── Inner component ───────────────────────────────────────────────────────────
function MindMapInner({ root }: { root: MindMapNode }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [tf,       setTf]       = useState<Tf>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const containerRef  = useRef<HTMLDivElement>(null);
  const svgRef        = useRef<SVGSVGElement>(null);
  const lastPt        = useRef({ x: 0, y: 0 });
  const pointerDownPt = useRef({ x: 0, y: 0 });
  const isDragRef     = useRef(false);
  const lastTouch     = useRef<{ x: number; y: number } | null>(null);
  const pinchStart    = useRef<{ dist: number; scale: number } | null>(null);

  const { nodes, edges } = useMemo(() => computeLayout(root, expanded), [root, expanded]);

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

  // Wheel zoom / pan
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

  // Touch
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastTouch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        pinchStart.current = null;
      } else if (e.touches.length === 2) {
        lastTouch.current = null;
        setTf((t) => { pinchStart.current = { dist: touchDist(e.touches), scale: t.scale }; return t; });
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
        const ratio = touchDist(e.touches) / pinchStart.current.dist;
        setTf((t) => ({ ...t, scale: Math.min(Math.max(pinchStart.current!.scale * ratio, 0.2), 5) }));
      }
    };
    const onTouchEnd = () => { lastTouch.current = null; pinchStart.current = null; };
    el.addEventListener("touchstart",  onTouchStart,  { passive: false });
    el.addEventListener("touchmove",   onTouchMove,   { passive: false });
    el.addEventListener("touchend",    onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart",  onTouchStart);
      el.removeEventListener("touchmove",   onTouchMove);
      el.removeEventListener("touchend",    onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  // Mouse drag — defer pointer capture until movement exceeds threshold so
  // click events on SVG buttons are not swallowed by the container.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    pointerDownPt.current = { x: e.clientX, y: e.clientY };
    lastPt.current = { x: e.clientX, y: e.clientY };
    isDragRef.current = false;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !e.buttons) return;
    const dx = e.clientX - pointerDownPt.current.x;
    const dy = e.clientY - pointerDownPt.current.y;
    if (!isDragRef.current) {
      if (Math.sqrt(dx * dx + dy * dy) < 5) return;
      isDragRef.current = true;
      setDragging(true);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const mdx = e.clientX - lastPt.current.x;
    const mdy = e.clientY - lastPt.current.y;
    lastPt.current = { x: e.clientX, y: e.clientY };
    setTf((t) => ({ ...t, x: t.x + mdx, y: t.y + mdy }));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    isDragRef.current = false;
    setDragging(false);
  };

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

  const staticEdges  = edges.filter((e) => !e.dyn);
  const dynamicEdges = edges.filter((e) => e.dyn);
  const staticNodes  = nodes.filter((n) => n.d <= 1);
  const dynNodes     = nodes.filter((n) => n.d === 2);

  const spring = { type: "spring" as const, stiffness: 380, damping: 30 };

  return (
    <div className="flex flex-col h-full select-none">

      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--surface-1)] shrink-0">
        <button onClick={zoomIn}  className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]" title="Zoom in"><ZoomIn  className="w-3.5 h-3.5"/></button>
        <button onClick={zoomOut} className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]" title="Zoom out"><ZoomOut className="w-3.5 h-3.5"/></button>
        <button onClick={reset}   className="p-1.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]" title="Reset"><RotateCcw className="w-3.5 h-3.5"/></button>
        <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-9">{Math.round(tf.scale * 100)}%</span>

        <div className="w-px h-4 bg-[var(--border)] mx-1"/>

        <button
          onClick={allExpanded ? collapseAll : expandAll}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]"
        >
          {allExpanded ? <Minimize2 className="w-3 h-3"/> : <Maximize2 className="w-3 h-3"/>}
          {allExpanded ? "Collapse all" : "Expand all"}
        </button>

        <div className="flex-1"/>

        <span className="text-[10px] text-[var(--text-muted)] hidden sm:block mr-2">
          Click › to expand · Drag to pan · Ctrl+scroll to zoom
        </span>

        <button
          onClick={exportSVG}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] border border-[var(--border)] hover:bg-[var(--surface-2)] transition-colors text-[var(--text-muted)]"
        >
          <Download className="w-3 h-3"/>SVG
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden"
        style={{ background: "var(--surface-0)", cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div
          style={{
            position: "absolute", top: "50%", left: "50%",
            transform: `translate(calc(-50% + ${tf.x}px), calc(-50% + ${tf.y}px)) scale(${tf.scale})`,
            transformOrigin: "center center",
            transition: dragging ? "none" : "transform 0.1s ease-out",
          }}
        >
          <svg
            ref={svgRef}
            viewBox="-560 -700 1280 1400"
            width={1280} height={1400}
            style={{ display: "block", overflow: "visible" }}
          >
            <defs>
              <pattern id="mm-grid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="var(--border)" opacity="0.5"/>
              </pattern>
            </defs>
            <rect x="-560" y="-700" width="1280" height="1400" fill="url(#mm-grid)"/>

            {/* Root → topic edges: animate path changes on layout shift */}
            {staticEdges.map((e) => (
              <motion.path
                key={e.id}
                initial={false}
                animate={{ d: e.path } as never}
                transition={{ type: "tween", duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                stroke={e.col} strokeWidth={1.5} strokeOpacity={0.4} fill="none"
              />
            ))}

            {/* Topic → subtopic edges */}
            <AnimatePresence>
              {dynamicEdges.map((e) => (
                <motion.path
                  key={e.id}
                  d={e.path}
                  stroke={e.col} strokeWidth={1.5} strokeOpacity={0.35} fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  exit={{    pathLength: 0, opacity: 0 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                />
              ))}
            </AnimatePresence>

            {/* Root + topic nodes — CSS transition handles repositioning */}
            {staticNodes.map((n) => (
              <g
                key={n.id}
                style={{
                  transform: `translate(${n.x}px, ${n.y}px)`,
                  transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
                }}
              >
                <MapNode n={n} onToggle={toggle}/>
              </g>
            ))}

            {/* Subtopic nodes — fade + scale in/out */}
            <AnimatePresence>
              {dynNodes.map((n) => (
                <g
                  key={n.id}
                  style={{ transform: `translate(${n.x}px, ${n.y}px)` }}
                >
                  <motion.g
                    style={{ transformBox: "fill-box", transformOrigin: "50% 50%" } as React.CSSProperties}
                    initial={{ opacity: 0, scale: 0.65 }}
                    animate={{ opacity: 1, scale: 1   }}
                    exit={{    opacity: 0, scale: 0.65 }}
                    transition={spring}
                  >
                    <MapNode n={n} onToggle={toggle}/>
                  </motion.g>
                </g>
              ))}
            </AnimatePresence>
          </svg>
        </div>
      </div>
    </div>
  );
}
