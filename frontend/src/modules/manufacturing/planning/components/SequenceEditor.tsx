'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { mastersApi, type EngineeringMaster, type Operation } from '@/modules/manufacturing/planning/api';
import { ApiError } from '@/shared/lib/api/client';

type Edge = { from: string; to: string };
type Drag = { fromId: string; x: number; y: number };
type PanDrag = { startX: number; startY: number; originX: number; originY: number };

const NODE_W = 156;
const NODE_H = 56;
const H_GAP = 88;
const V_GAP = 26;
const MARGIN = 44;
const ZOOM_MIN = 0.2;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 1.2;

// ── Graph helpers ───────────────────────────────────────────────────────────────

/** Longest-path layering: an op's column = 1 + the deepest column among its predecessors. */
function computeColumns(ids: string[], edges: Edge[]): Map<string, number> {
  const valid = new Set(ids);
  const adj = new Map<string, string[]>(ids.map((id) => [id, []]));
  const indeg = new Map<string, number>(ids.map((id) => [id, 0]));
  for (const e of edges) {
    if (!valid.has(e.from) || !valid.has(e.to)) continue;
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }
  const depth = new Map<string, number>(ids.map((id) => [id, 0]));
  const queue = ids.filter((id) => (indeg.get(id) ?? 0) === 0);
  while (queue.length) {
    const node = queue.shift()!;
    for (const next of adj.get(node)!) {
      depth.set(next, Math.max(depth.get(next)!, depth.get(node)! + 1));
      indeg.set(next, indeg.get(next)! - 1);
      if (indeg.get(next) === 0) queue.push(next);
    }
  }
  return depth;
}

/** True if `target` is already reachable from `start` by following edges. */
function reachable(edges: Edge[], start: string, target: string): boolean {
  const adj = new Map<string, string[]>();
  for (const e of edges) (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
  const stack = [start];
  const seen = new Set<string>();
  while (stack.length) {
    const n = stack.pop()!;
    if (n === target) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    for (const next of adj.get(n) ?? []) stack.push(next);
  }
  return false;
}

// ── Component ────────────────────────────────────────────────────────────────────

export function SequenceEditor({ master, onClose }: { master: EngineeringMaster; onClose: () => void }) {
  const router = useRouter();
  const svgRef = useRef<SVGSVGElement>(null);

  const ops = useMemo(
    () => [...master.operations].sort((a, b) => a.sequence - b.sequence),
    [master.operations],
  );

  const [edges, setEdges] = useState<Edge[]>(
    () => master.dependencies.map((d) => ({ from: d.predecessorId, to: d.successorId })),
  );
  const [drag, setDrag] = useState<Drag | null>(null);
  const [hoverEdge, setHoverEdge] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Viewport state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDrag, setPanDrag] = useState<PanDrag | null>(null);

  // Refs so closures in effects always read the latest values
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;
  const dragRef = useRef(drag);
  dragRef.current = drag;

  // Layout: column from dependency depth, row = order within the column.
  const layout = useMemo(() => {
    const ids = ops.map((o) => o.id);
    const depth = computeColumns(ids, edges);
    const byCol = new Map<number, Operation[]>();
    for (const op of ops) {
      const c = depth.get(op.id) ?? 0;
      (byCol.get(c) ?? byCol.set(c, []).get(c)!).push(op);
    }
    const pos = new Map<string, { x: number; y: number }>();
    let maxCol = 0;
    let maxRows = 0;
    for (const [col, colOps] of byCol) {
      colOps.sort((a, b) => a.sequence - b.sequence);
      maxCol = Math.max(maxCol, col);
      maxRows = Math.max(maxRows, colOps.length);
      colOps.forEach((op, row) => {
        pos.set(op.id, {
          x: MARGIN + col * (NODE_W + H_GAP),
          y: MARGIN + row * (NODE_H + V_GAP),
        });
      });
    }
    const width = MARGIN * 2 + (maxCol + 1) * NODE_W + maxCol * H_GAP;
    const height = MARGIN * 2 + Math.max(1, maxRows) * (NODE_H + V_GAP) - V_GAP;
    return { pos, width, height };
  }, [ops, edges]);

  // Convert screen coords → canvas coords (accounting for pan + zoom).
  function toCanvas(clientX: number, clientY: number) {
    const rect = svgRef.current!.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
      y: (clientY - rect.top - panRef.current.y) / zoomRef.current,
    };
  }

  // Non-passive wheel listener so we can prevent page scroll while zooming.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRef.current * factor));
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const ratio = newZoom / zoomRef.current;
      setPan({ x: cx - (cx - panRef.current.x) * ratio, y: cy - (cy - panRef.current.y) * ratio });
      setZoom(newZoom);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  // Global mouse listeners for link dragging.
  useEffect(() => {
    if (!drag) return;
    const move = (e: MouseEvent) => {
      const p = toCanvas(e.clientX, e.clientY);
      setDrag((d) => (d ? { ...d, x: p.x, y: p.y } : d));
    };
    const up = () => setDrag(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [drag?.fromId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Global mouse listeners for canvas panning.
  useEffect(() => {
    if (!panDrag) return;
    const move = (e: MouseEvent) => {
      setPan({
        x: panDrag.originX + (e.clientX - panDrag.startX),
        y: panDrag.originY + (e.clientY - panDrag.startY),
      });
    };
    const up = () => setPanDrag(null);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [panDrag]);

  function startLink(opId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const p = toCanvas(e.clientX, e.clientY);
    setError(null);
    setDrag({ fromId: opId, x: p.x, y: p.y });
  }

  function finishLink(toId: string) {
    if (drag && drag.fromId !== toId) tryAddEdge(drag.fromId, toId);
    setDrag(null);
  }

  function tryAddEdge(from: string, to: string) {
    if (edges.some((e) => e.from === from && e.to === to)) {
      setError('That link already exists.');
      return;
    }
    if (from === to || reachable(edges, to, from)) {
      setError('That link would create a cycle.');
      return;
    }
    setError(null);
    setEdges((es) => [...es, { from, to }]);
  }

  function removeEdge(i: number) {
    setEdges((es) => es.filter((_, idx) => idx !== i));
    setHoverEdge(null);
  }

  function handleSvgMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    // Only pan when not mid-link-drag and not clicking a child element
    // (handle circles stop propagation, so we only reach here for background clicks)
    if (!dragRef.current) {
      setPanDrag({ startX: e.clientX, startY: e.clientY, originX: pan.x, originY: pan.y });
    }
  }

  function adjustZoom(factor: number) {
    const el = svgRef.current;
    if (!el) return;
    const newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom * factor));
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const ratio = newZoom / zoom;
    setPan({ x: cx - (cx - pan.x) * ratio, y: cy - (cy - pan.y) * ratio });
    setZoom(newZoom);
  }

  function resetView() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await mastersApi.updateSequence(
        master.id,
        edges.map((e) => ({ predecessorId: e.from, successorId: e.to })),
      );
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to save sequence.');
      setSaving(false);
    }
  }

  function edgePath(from: string, to: string) {
    const a = layout.pos.get(from);
    const b = layout.pos.get(to);
    if (!a || !b) return '';
    const sx = a.x + NODE_W;
    const sy = a.y + NODE_H / 2;
    const tx = b.x;
    const ty = b.y + NODE_H / 2;
    const dx = Math.max(40, Math.abs(tx - sx) / 2);
    return `M ${sx},${sy} C ${sx + dx},${sy} ${tx - dx},${ty} ${tx},${ty}`;
  }

  const cursor = panDrag ? 'grabbing' : drag ? 'crosshair' : 'grab';

  return (
    <div className="fixed inset-0 z-50 bg-ink-950/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="surface border hairline rounded-md w-full max-w-5xl h-[82vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b hairline bg-ink-900/60 shrink-0">
          <div className="flex-1 min-w-0">
            <div className="text-sm uppercase tracking-widest text-ink-200">Operation Sequence</div>
            <div className="text-xs text-ink-400 font-mono truncate">{master.partNumber}</div>
          </div>
          {error && <span className="text-xs text-signal-alert font-mono">{error}</span>}
          <button
            onClick={() => { setEdges([]); setError(null); }}
            disabled={saving || edges.length === 0}
            className="h-8 px-3 text-xs uppercase tracking-wider border hairline text-ink-300 rounded-sm hover:border-ink-500 disabled:opacity-40">
            Clear
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="h-8 px-3 text-xs uppercase tracking-wider border hairline text-ink-300 rounded-sm hover:border-ink-500 disabled:opacity-40">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="h-8 px-4 text-xs uppercase tracking-wider bg-accent/15 text-accent border border-accent/30 rounded-sm hover:bg-accent/25 disabled:opacity-40">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        {/* Hint */}
        <div className="px-5 py-2 text-[11px] text-ink-500 border-b hairline shrink-0">
          Scroll to zoom &middot; Drag canvas to pan &middot; Drag from one operation to another to set &ldquo;must finish before&rdquo; &middot; Click a link to remove it.
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-hidden bg-ink-950/40 relative">
          {ops.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-ink-500">
              This master has no operations yet.
            </div>
          ) : (
            <>
              <svg
                ref={svgRef}
                width="100%"
                height="100%"
                className="select-none"
                style={{ cursor }}
                onMouseDown={handleSvgMouseDown}
                onMouseUp={() => setDrag(null)}
              >
                <defs>
                  <marker id="seq-arrow" markerWidth="9" markerHeight="9" refX="7.5" refY="4"
                    orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#7c879b" />
                  </marker>
                  <marker id="seq-arrow-danger" markerWidth="9" markerHeight="9" refX="7.5" refY="4"
                    orient="auto" markerUnits="userSpaceOnUse">
                    <path d="M0,0 L8,4 L0,8 Z" fill="#f87171" />
                  </marker>
                </defs>

                <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
                  {/* Edges */}
                  {edges.map((e, i) => {
                    const d = edgePath(e.from, e.to);
                    if (!d) return null;
                    const danger = hoverEdge === i;
                    return (
                      <g key={`${e.from}-${e.to}`}>
                        <path d={d} fill="none" stroke={danger ? '#f87171' : '#7c879b'} strokeWidth={2}
                          markerEnd={`url(#${danger ? 'seq-arrow-danger' : 'seq-arrow'})`} />
                        {/* Fat invisible hit-target for easy clicking */}
                        <path d={d} fill="none" stroke="transparent" strokeWidth={14}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoverEdge(i)}
                          onMouseLeave={() => setHoverEdge((h) => (h === i ? null : h))}
                          onClick={() => removeEdge(i)}>
                          <title>Click to remove this link</title>
                        </path>
                      </g>
                    );
                  })}

                  {/* Rubber-band while dragging */}
                  {drag && (() => {
                    const a = layout.pos.get(drag.fromId);
                    if (!a) return null;
                    const sx = a.x + NODE_W;
                    const sy = a.y + NODE_H / 2;
                    return (
                      <path d={`M ${sx},${sy} C ${sx + 50},${sy} ${drag.x - 50},${drag.y} ${drag.x},${drag.y}`}
                        fill="none" stroke="#4f9eff" strokeWidth={2} strokeDasharray="5 4"
                        markerEnd="url(#seq-arrow)" pointerEvents="none" />
                    );
                  })()}

                  {/* Nodes */}
                  {ops.map((op) => {
                    const p = layout.pos.get(op.id)!;
                    const isSource = drag?.fromId === op.id;
                    const isDropTarget = drag && drag.fromId !== op.id;
                    return (
                      <g key={op.id} transform={`translate(${p.x},${p.y})`}
                        onMouseUp={() => finishLink(op.id)}>
                        <rect
                          width={NODE_W} height={NODE_H} rx={6}
                          className="fill-ink-900 cursor-crosshair"
                          stroke={isDropTarget ? '#4f9eff' : isSource ? '#4f9eff' : '#2c333f'}
                          strokeWidth={isDropTarget ? 2 : 1}
                          strokeDasharray={isDropTarget ? '5 4' : undefined}
                          onMouseDown={(e) => startLink(op.id, e)}>
                          <title>Drag to link to another operation</title>
                        </rect>
                        {/* Labels (pointer-events none so rect handles all mouse events) */}
                        <text x={NODE_W / 2} y={22} textAnchor="middle" className="fill-ink-100" fontSize={15} fontWeight={600}
                          fontFamily="ui-monospace, monospace" pointerEvents="none">
                          Op {op.sequence}
                        </text>
                        <text x={NODE_W / 2} y={40} textAnchor="middle" className="fill-ink-400" fontSize={12} pointerEvents="none">
                          {op.name.length > 20 ? `${op.name.slice(0, 19)}…` : op.name}
                        </text>
                      </g>
                    );
                  })}
                </g>
              </svg>

              {/* Zoom controls */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1">
                <button
                  onClick={() => adjustZoom(1 / ZOOM_STEP)}
                  className="w-7 h-7 flex items-center justify-center border hairline bg-ink-900/90 text-ink-300 rounded-sm hover:border-ink-500 text-sm font-mono leading-none">
                  −
                </button>
                <button
                  onClick={resetView}
                  className="h-7 px-2 flex items-center justify-center border hairline bg-ink-900/90 text-ink-400 rounded-sm hover:border-ink-500 text-[11px] font-mono tabular-nums min-w-[3.5rem]">
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  onClick={() => adjustZoom(ZOOM_STEP)}
                  className="w-7 h-7 flex items-center justify-center border hairline bg-ink-900/90 text-ink-300 rounded-sm hover:border-ink-500 text-sm font-mono leading-none">
                  +
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
