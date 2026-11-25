'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Circle,
  Download,
  Eraser,
  Maximize2,
  Minimize2,
  Minus,
  PaintBucket,
  Pencil,
  Redo2,
  SprayCan,
  Square,
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
import { drawStrokeOnCtx } from '@/lib/canvasRenderer';
import { getSocket } from '@/lib/socket';
import { useGameStore } from '@/stores/useGameStore';

interface DrawingCanvasProps {
  canDraw: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const OPACITY_OPTIONS = [
  { label: '100%', value: 1 },
  { label: '60%', value: 0.6 },
  { label: '30%', value: 0.3 },
] as const;

const TOOL_BUTTONS: {
  id: DrawingTool;
  label: string;
  shortcut: string;
  icon: typeof Pencil;
}[] = [
  { id: 'pencil', label: 'Pencil', shortcut: 'P', icon: Pencil },
  { id: 'spray', label: 'Spray', shortcut: 'S', icon: SprayCan },
  { id: 'fill', label: 'Fill', shortcut: 'G', icon: PaintBucket },
  { id: 'line', label: 'Line', shortcut: 'L', icon: Minus },
  { id: 'rect', label: 'Rectangle', shortcut: 'R', icon: Square },
  { id: 'circle', label: 'Circle', shortcut: 'C', icon: Circle },
  { id: 'eraser', label: 'Eraser', shortcut: 'E', icon: Eraser },
];

const isShapeTool = (t: DrawingTool) => t === 'line' || t === 'rect' || t === 'circle';

export function DrawingCanvas({
  canDraw,
  isFullscreen = false,
  onToggleFullscreen,
}: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const strokes = useGameStore((s) => s.strokes);
  const activeStrokes = useGameStore((s) => s.activeStrokes);
  const reactions = useGameStore((s) => s.reactions);
  const playerId = useGameStore((s) => s.playerId);

  const [tool, setTool] = useState<DrawingTool>('pencil');
  const [color, setColor] = useState<string>(DRAWING_PALETTE[0].hex);
  const [brushSize, setBrushSize] = useState<number>(BRUSH_SIZES[1]);
  const [shapeFilled, setShapeFilled] = useState<boolean>(false);
  const [opacity, setOpacity] = useState<number>(1);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; w: number } | null>(null);

  const activeLocalStrokeRef = useRef<Stroke | null>(null);
  const pendingPointsRef = useRef<Point[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number | null>(null);

  const renderedStrokesRef = useRef<Stroke[]>([]);
  const canvasDimsRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });

  const syncCanvasDimensions = useCallback((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    const resized = canvas.width !== targetW || canvas.height !== targetH;
    if (resized) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    return { rect, dpr, resized };
  }, []);

  // Committed layer: incremental when appending strokes, full redraw only on reset/undo/resize
  const redrawCommitted = useCallback(
    (forceFull = false) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      const { rect, dpr, resized } = syncCanvasDimensions(canvas);
      if (rect.width === 0 || rect.height === 0) return;

      const prev = renderedStrokesRef.current;
      const canAppendOnly =
        !forceFull &&
        !resized &&
        canvasDimsRef.current.w === rect.width &&
        canvasDimsRef.current.h === rect.height &&
        strokes.length >= prev.length &&
        prev.every((s, idx) => strokes[idx] === s);

      if (canAppendOnly) {
        if (strokes.length === prev.length) return;
        ctx.save();
        ctx.scale(dpr, dpr);
        for (let i = prev.length; i < strokes.length; i++) {
          drawStrokeOnCtx(ctx, strokes[i]!, rect.width, rect.height);
        }
        ctx.restore();
        renderedStrokesRef.current = strokes.slice();
        return;
      }

      canvasDimsRef.current = { w: rect.width, h: rect.height, dpr };
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
      for (const stroke of strokes) {
        drawStrokeOnCtx(ctx, stroke, rect.width, rect.height);
      }
      ctx.restore();
      renderedStrokesRef.current = strokes.slice();
    },
    [strokes, syncCanvasDimensions]
  );

  // Preview layer: draws only active in-progress strokes at 60fps
  const renderPreviewNow = useCallback(() => {
    rafRef.current = null;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { rect, dpr } = syncCanvasDimensions(canvas);
    if (rect.width === 0 || rect.height === 0) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const localStroke = activeLocalStrokeRef.current;
    const remoteList = Object.values(activeStrokes);
    if (!localStroke && remoteList.length === 0) return;

    ctx.save();
    ctx.scale(dpr, dpr);
    for (const s of remoteList) {
      drawStrokeOnCtx(ctx, s, rect.width, rect.height);
    }
    if (localStroke) {
      drawStrokeOnCtx(ctx, localStroke, rect.width, rect.height);
    }
    ctx.restore();
  }, [activeStrokes, syncCanvasDimensions]);

  const schedulePreviewRender = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(renderPreviewNow);
  }, [renderPreviewNow]);

  useEffect(() => {
    redrawCommitted();
  }, [redrawCommitted]);

  useEffect(() => {
    schedulePreviewRender();
  }, [activeStrokes, schedulePreviewRender]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      redrawCommitted(true);
      schedulePreviewRender();
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [redrawCommitted, schedulePreviewRender]);

  // Keyboard shortcuts while drawing
  useEffect(() => {
    if (!canDraw) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          getSocket().emit('drawing:redo');
        } else {
          getSocket().emit('drawing:undo');
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        getSocket().emit('drawing:redo');
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'p' || k === 'b') setTool('pencil');
      else if (k === 's') setTool('spray');
      else if (k === 'g') setTool('fill');
      else if (k === 'l') setTool('line');
      else if (k === 'r') setTool('rect');
      else if (k === 'c') setTool('circle');
      else if (k === 'e') setTool('eraser');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canDraw]);

  const getNormalizedPoint = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    return { x: Number(x.toFixed(4)), y: Number(y.toFixed(4)) };
  };

  const flushPendingPoints = useCallback(() => {
    const local = activeLocalStrokeRef.current;
    if (!local || pendingPointsRef.current.length === 0) return;
    const batch = pendingPointsRef.current.splice(0, 100);
    getSocket().emit('drawing:move', { strokeId: local.id, points: batch });
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    e.preventDefault();
    const point = getNormalizedPoint(e);
    const strokeId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Instant bucket fill: single click, commit locally & emit
    if (tool === 'fill') {
      const fillStroke: Stroke = {
        id: strokeId,
        playerId: playerId ?? 'local',
        tool: 'fill',
        color,
        size: brushSize,
        points: [point],
        opacity,
      };
      useGameStore.getState().appendStroke(fillStroke);
      getSocket().emit('drawing:start', {
        strokeId,
        tool: 'fill',
        color,
        size: brushSize,
        point,
        opacity,
      });
      getSocket().emit('drawing:end', { strokeId });
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);

    const newStroke: Stroke = {
      id: strokeId,
      playerId: playerId ?? 'local',
      tool,
      color,
      size: brushSize,
      points: [point],
      ...(isShapeTool(tool) ? { filled: shapeFilled } : {}),
      ...(tool !== 'eraser' && opacity < 1 ? { opacity } : {}),
    };

    activeLocalStrokeRef.current = newStroke;
    pendingPointsRef.current = [];
    schedulePreviewRender();

    getSocket().emit('drawing:start', {
      strokeId,
      tool,
      color,
      size: brushSize,
      point,
      ...(isShapeTool(tool) ? { filled: shapeFilled } : {}),
      ...(tool !== 'eraser' && opacity < 1 ? { opacity } : {}),
    });

    if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    flushTimerRef.current = setInterval(flushPendingPoints, isShapeTool(tool) ? 75 : 24);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (canDraw && e.pointerType === 'mouse') {
      const rect = e.currentTarget.getBoundingClientRect();
      setCursorPos({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        w: rect.width,
      });
    }

    const local = activeLocalStrokeRef.current;
    if (!canDraw || !local) return;
    e.preventDefault();
    const point = getNormalizedPoint(e);

    if (isShapeTool(local.tool)) {
      local.points = [local.points[0]!, point];
      pendingPointsRef.current = [point];
      schedulePreviewRender();
      return;
    }

    const last = local.points[local.points.length - 1];
    if (last) {
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      if (dx * dx + dy * dy < 0.00000225) return;
    }

    local.points.push(point);
    pendingPointsRef.current.push(point);
    schedulePreviewRender();

    if (pendingPointsRef.current.length >= 10) {
      flushPendingPoints();
    }
  };

  const handlePointerEnd = () => {
    const local = activeLocalStrokeRef.current;
    if (!local) return;
    flushPendingPoints();
    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    const finishedStroke: Stroke = {
      ...local,
      points: local.points.slice(),
    };
    activeLocalStrokeRef.current = null;
    schedulePreviewRender();

    useGameStore.getState().appendStroke(finishedStroke);
    getSocket().emit('drawing:end', { strokeId: finishedStroke.id });
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `doodl-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  useEffect(() => {
    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const previewCursorSize =
    cursorPos && cursorPos.w > 0
      ? Math.max(4, (brushSize * cursorPos.w) / 800)
      : brushSize;

  return (
    <div className="flex flex-col gap-2.5 w-full">
      {/* Canvas Container */}
      <div
        ref={containerRef}
        className={`relative w-full overflow-hidden rounded-card border border-surface-border bg-white shadow-soft ${
          isFullscreen ? 'h-[62vh] sm:h-[70vh]' : 'aspect-[4/3] sm:aspect-[16/11]'
        }`}
      >
        {/* Committed Strokes Layer */}
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onPointerLeave={() => setCursorPos(null)}
          className={`w-full h-full block canvas-touch-lock ${
            canDraw ? 'cursor-crosshair' : 'cursor-default'
          }`}
        />

        {/* Active Stroke Preview Layer */}
        <canvas
          ref={previewCanvasRef}
          className="pointer-events-none absolute inset-0 w-full h-full block"
        />

        {/* Brush Size Cursor Ring */}
        {canDraw && cursorPos && tool !== 'fill' && (
          <div
            className="pointer-events-none absolute rounded-full border border-slate-700/70 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]"
            style={{
              width: previewCursorSize,
              height: previewCursorSize,
              left: cursorPos.x - previewCursorSize / 2,
              top: cursorPos.y - previewCursorSize / 2,
            }}
          />
        )}

        {/* Top-right Canvas Controls */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleDownload}
            aria-label="Download drawing as PNG"
            title="Download PNG"
            className="min-h-[38px] min-w-[38px] rounded-control bg-white/90 hover:bg-white text-slate-700 border border-slate-200 shadow-sm inline-flex items-center justify-center transition"
          >
            <Download className="w-4 h-4" />
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? 'Exit fullscreen canvas' : 'Fullscreen canvas'}
              className="min-h-[38px] min-w-[38px] rounded-control bg-white/90 hover:bg-white text-slate-700 border border-slate-200 shadow-sm inline-flex items-center justify-center transition"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>

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
        <div className="rounded-card border border-surface-border bg-surface-card p-2.5 sm:p-3 shadow-soft flex flex-col gap-2.5">
          {/* Row 1: 24-Color Palette + Custom Color */}
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Color palette">
            {DRAWING_PALETTE.map((c) => {
              const selected = tool !== 'eraser' && color.toLowerCase() === c.hex.toLowerCase();
              return (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => {
                    if (tool === 'eraser') setTool('pencil');
                    setColor(c.hex);
                  }}
                  title={c.name}
                  aria-label={`Color ${c.name}`}
                  style={{ backgroundColor: c.hex }}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border transition ${
                    selected
                      ? 'ring-2 ring-brand-blue ring-offset-2 ring-offset-surface-card scale-110 border-transparent'
                      : 'border-black/15 hover:scale-105'
                  }`}
                />
              );
            })}
            <label
              title="Custom color"
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-surface-border overflow-hidden cursor-pointer flex items-center justify-center bg-surface-bg text-[11px] font-bold"
            >
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  if (tool === 'eraser') setTool('pencil');
                  setColor(e.target.value);
                }}
                aria-label="Custom color picker"
                className="opacity-0 w-0 h-0 absolute"
              />
              🎨
            </label>
          </div>

          {/* Row 2: Tools, Shape Fill, Brush Sizes, Opacity, Undo/Redo/Clear */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Drawing Tools */}
            <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Drawing tools">
              {TOOL_BUTTONS.map(({ id, label, shortcut, icon: Icon }) => {
                const active = tool === id;
                const activeClass =
                  id === 'eraser'
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'bg-brand-green text-white border-brand-green';
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTool(id)}
                    title={`${label} (${shortcut})`}
                    aria-label={`${label} tool`}
                    className={`min-h-[36px] min-w-[36px] rounded-control border inline-flex items-center justify-center transition ${
                      active
                        ? activeClass
                        : 'bg-surface-bg border-surface-border text-ink-secondary hover:text-ink-main hover:bg-surface-elevated'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}

              {(tool === 'rect' || tool === 'circle') && (
                <button
                  type="button"
                  onClick={() => setShapeFilled((v) => !v)}
                  className={`min-h-[36px] px-2.5 rounded-control border text-xs font-semibold transition ${
                    shapeFilled
                      ? 'bg-brand-blue/15 border-brand-blue text-brand-blue'
                      : 'bg-surface-bg border-surface-border text-ink-secondary hover:text-ink-main'
                  }`}
                >
                  {shapeFilled ? 'Filled' : 'Outline'}
                </button>
              )}
            </div>

            {/* Sizes + Opacity + History Actions */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Brush Sizes */}
              <div className="flex items-center gap-1 px-1.5 py-1 rounded-input bg-surface-bg border border-surface-border">
                {BRUSH_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setBrushSize(size)}
                    aria-label={`Brush size ${size}`}
                    className={`w-6 h-6 rounded-control flex items-center justify-center transition ${
                      brushSize === size
                        ? 'bg-brand-green text-white'
                        : 'text-ink-secondary hover:bg-surface-elevated'
                    }`}
                  >
                    <span
                      className="rounded-full bg-current"
                      style={{
                        width: Math.min(16, Math.max(4, size * 0.5)),
                        height: Math.min(16, Math.max(4, size * 0.5)),
                      }}
                    />
                  </button>
                ))}
              </div>

              {/* Opacity */}
              {tool !== 'eraser' && (
                <div className="flex items-center gap-0.5 px-1 py-1 rounded-input bg-surface-bg border border-surface-border">
                  {OPACITY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setOpacity(opt.value)}
                      className={`px-1.5 h-6 rounded-control text-[11px] font-semibold transition ${
                        opacity === opt.value
                          ? 'bg-brand-blue text-white'
                          : 'text-ink-secondary hover:bg-surface-elevated'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Undo / Redo / Clear */}
              <button
                type="button"
                onClick={() => getSocket().emit('drawing:undo')}
                title="Undo (Ctrl+Z)"
                aria-label="Undo stroke"
                className="min-h-[36px] min-w-[36px] rounded-control border border-surface-border bg-surface-bg text-ink-secondary hover:text-ink-main hover:bg-surface-elevated inline-flex items-center justify-center transition"
              >
                <Undo2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => getSocket().emit('drawing:redo')}
                title="Redo (Ctrl+Y)"
                aria-label="Redo stroke"
                className="min-h-[36px] min-w-[36px] rounded-control border border-surface-border bg-surface-bg text-ink-secondary hover:text-ink-main hover:bg-surface-elevated inline-flex items-center justify-center transition"
              >
                <Redo2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => getSocket().emit('drawing:clear')}
                title="Clear canvas"
                aria-label="Clear canvas"
                className="min-h-[36px] min-w-[36px] rounded-control border border-semantic-danger/30 bg-semantic-danger/10 text-semantic-danger hover:bg-semantic-danger hover:text-white inline-flex items-center justify-center transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
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
