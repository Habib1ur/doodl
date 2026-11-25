'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Eraser,
  Maximize2,
  Minimize2,
  Pencil,
  Redo2,
  Trash2,
  Undo2,
} from 'lucide-react';
import {
  BRUSH_SIZES,
  DRAWING_PALETTE,
  REACTION_EMOJIS,
  type DrawingTool,
  type Point,
  type Stroke,
} from '@doodlio/shared';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/useGameStore';

interface DrawingCanvasProps {
  canDraw: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

function drawStrokeOnCtx(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number
) {
  if (stroke.points.length === 0) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
  // Scale brush size relative to a 800px reference width
  ctx.lineWidth = Math.max(1.5, (stroke.size * width) / 800);

  const pts = stroke.points;
  if (pts.length === 1) {
    const p = pts[0]!;
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0]!.x * width, pts[0]!.y * height);

  for (let i = 1; i < pts.length - 1; i++) {
    const curr = pts[i]!;
    const next = pts[i + 1]!;
    const midX = ((curr.x + next.x) / 2) * width;
    const midY = ((curr.y + next.y) / 2) * height;
    ctx.quadraticCurveTo(curr.x * width, curr.y * height, midX, midY);
  }

  const last = pts[pts.length - 1]!;
  ctx.lineTo(last.x * width, last.y * height);
  ctx.stroke();
  ctx.restore();
}

export function DrawingCanvas({
  canDraw,
  isFullscreen = false,
  onToggleFullscreen,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { strokes, reactions } = useGameStore();

  const [tool, setTool] = useState<DrawingTool>('pencil');
  const [color, setColor] = useState<string>(DRAWING_PALETTE[0].hex);
  const [brushSize, setBrushSize] = useState<number>(BRUSH_SIZES[1]);

  const activeStrokeIdRef = useRef<string | null>(null);
  const pendingPointsRef = useRef<Point[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);

    for (const stroke of strokes) {
      drawStrokeOnCtx(ctx, stroke, rect.width, rect.height);
    }
    ctx.restore();
  }, [strokes]);

  useEffect(() => {
    redrawAll();
  }, [redrawAll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      redrawAll();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawAll]);

  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) };
  };

  const flushPendingPoints = useCallback(() => {
    const strokeId = activeStrokeIdRef.current;
    if (!strokeId || pendingPointsRef.current.length === 0) return;
    const batch = pendingPointsRef.current.splice(0, 100);
    getSocket().emit('drawing:move', { strokeId, points: batch });
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const point = getNormalizedPoint(e);
    const strokeId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    activeStrokeIdRef.current = strokeId;
    pendingPointsRef.current = [];

    getSocket().emit('drawing:start', {
      strokeId,
      tool,
      color,
      size: brushSize,
      point,
    });

    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    flushTimerRef.current = setInterval(flushPendingPoints, 30);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw || !activeStrokeIdRef.current) return;
    e.preventDefault();
    const point = getNormalizedPoint(e);
    pendingPointsRef.current.push(point);
    if (pendingPointsRef.current.length >= 12) {
      flushPendingPoints();
    }
  };

  const handlePointerEnd = () => {
    if (!activeStrokeIdRef.current) return;
    flushPendingPoints();
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const strokeId = activeStrokeIdRef.current;
    activeStrokeIdRef.current = null;
    getSocket().emit('drawing:end', { strokeId });
  };

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-card border border-surface-border bg-white shadow-soft ${
          isFullscreen ? 'h-[62vh] sm:h-[70vh]' : 'aspect-[4/3] sm:aspect-[16/11]'
        }`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className={`w-full h-full block canvas-touch-lock ${
            canDraw ? 'cursor-crosshair' : 'cursor-default'
          }`}
        />

        {/* Fullscreen toggle button */}
        {onToggleFullscreen && (
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen canvas' : 'Fullscreen canvas'}
            className="absolute top-2.5 right-2.5 min-h-[38px] min-w-[38px] rounded-control bg-white/90 hover:bg-white text-slate-700 border border-slate-200 shadow-sm inline-flex items-center justify-center transition"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        )}

        {/* Floating Emoji Reactions */}
        <div className="pointer-events-none absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          <AnimatePresence>
            {reactions.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12, scale: 0.7 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                className="px-2.5 py-1 rounded-full bg-white/95 border border-slate-200 shadow-soft text-xs font-semibold text-slate-800 flex items-center gap-1"
              >
                <span className="text-base">{r.emoji}</span>
                <span>{r.playerName}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Drawing Toolbar (Drawer only) or Reaction Bar (Guessers) */}
      {canDraw ? (
        <div className="rounded-card border border-surface-border bg-surface-card p-2.5 sm:p-3 shadow-soft flex flex-wrap items-center justify-between gap-2.5">
          {/* Colors */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Color palette">
            {DRAWING_PALETTE.map((c) => {
              const selected = tool === 'pencil' && color === c.hex;
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    setTool('pencil');
                    setColor(c.hex);
                  }}
                  aria-label={`Color ${c.name}`}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border transition ${
                    selected
                      ? 'ring-2 ring-brand-blue ring-offset-2 ring-offset-surface-card scale-110 border-transparent'
                      : 'border-black/15 hover:scale-105'
                  }`}
                />
              );
            })}
            <label
              title="Custom color"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-surface-border overflow-hidden cursor-pointer flex items-center justify-center bg-surface-bg text-[10px] font-bold"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  setTool('pencil');
                  setColor(e.target.value);
                }}
                aria-label="Custom color picker"
                className="opacity-0 w-0 h-0 absolute"
              />
              🎨
            </label>
          </div>

          {/* Brush Sizes + Actions */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Sizes */}
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-input bg-surface-bg border border-surface-border">
              {BRUSH_SIZES.map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setBrushSize(size)}
                  aria-label={`Brush size ${size}`}
                  className={`w-7 h-7 rounded-control flex items-center justify-center transition ${
                    brushSize === size
                      ? 'bg-brand-green text-white'
                      : 'text-ink-secondary hover:bg-surface-elevated'
                  }`}
                >
                  <span
                    className="rounded-full bg-current"
                    style={{
                      width: Math.min(18, Math.max(4, size * 0.55)),
                      height: Math.min(18, Math.max(4, size * 0.55)),
                    }}
                  />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setTool('pencil')}
              aria-label="Pencil tool"
              className={`min-h-[40px] min-w-[40px] rounded-control border inline-flex items-center justify-center transition ${
                tool === 'pencil'
                  ? 'bg-brand-green text-white border-brand-green'
                  : 'bg-surface-bg border-surface-border text-ink-secondary hover:text-ink-main'
              }`}
            >
              <Pencil className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => setTool('eraser')}
              aria-label="Eraser tool"
              className={`min-h-[40px] min-w-[40px] rounded-control border inline-flex items-center justify-center transition ${
                tool === 'eraser'
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-surface-bg border-surface-border text-ink-secondary hover:text-ink-main'
              }`}
            >
              <Eraser className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => getSocket().emit('drawing:undo')}
              aria-label="Undo stroke"
              className="min-h-[40px] min-w-[40px] rounded-control border border-surface-border bg-surface-bg text-ink-secondary hover:text-ink-main hover:bg-surface-elevated inline-flex items-center justify-center transition"
            >
              <Undo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => getSocket().emit('drawing:redo')}
              aria-label="Redo stroke"
              className="min-h-[40px] min-w-[40px] rounded-control border border-surface-border bg-surface-bg text-ink-secondary hover:text-ink-main hover:bg-surface-elevated inline-flex items-center justify-center transition"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => getSocket().emit('drawing:clear')}
              aria-label="Clear canvas"
              className="min-h-[40px] min-w-[40px] rounded-control border border-semantic-danger/30 bg-semantic-danger/10 text-semantic-danger hover:bg-semantic-danger hover:text-white inline-flex items-center justify-center transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 rounded-card border border-surface-border bg-surface-card px-3 py-2 shadow-soft">
          <span className="text-xs font-medium text-ink-secondary">React to drawing:</span>
          <div className="flex items-center gap-1.5">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => getSocket().emit('reaction:send', { emoji })}
                className="min-h-[36px] min-w-[36px] rounded-full hover:bg-surface-elevated active:scale-90 transition text-lg flex items-center justify-center"
                aria-label={`Send reaction ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
