import type { Stroke } from '@doodlio/shared';

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function floodFillOnCanvas(
  ctx: CanvasRenderingContext2D,
  normX: number,
  normY: number,
  hexColor: string,
  opacity = 1
) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  if (w === 0 || h === 0) return;

  const startX = Math.min(w - 1, Math.max(0, Math.round(normX * w)));
  const startY = Math.min(h - 1, Math.max(0, Math.round(normY * h)));

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;

  const startIdx = (startY * w + startX) * 4;
  const sr = data[startIdx]!;
  const sg = data[startIdx + 1]!;
  const sb = data[startIdx + 2]!;
  const sa = data[startIdx + 3]!;

  const [fr, fg, fb] = parseHexColor(hexColor);
  const alpha = Math.max(0.1, Math.min(1, opacity));
  const tr = Math.round(sr * (1 - alpha) + fr * alpha);
  const tg = Math.round(sg * (1 - alpha) + fg * alpha);
  const tb = Math.round(sb * (1 - alpha) + fb * alpha);

  if (
    Math.abs(sr - tr) <= 2 &&
    Math.abs(sg - tg) <= 2 &&
    Math.abs(sb - tb) <= 2 &&
    sa >= 250
  ) {
    return;
  }

  const tolerance = 34;
  const visited = new Uint8Array(w * h);

  const matches = (pixelPos: number): boolean => {
    if (visited[pixelPos]) return false;
    const idx = pixelPos * 4;
    return (
      Math.abs(data[idx]! - sr) <= tolerance &&
      Math.abs(data[idx + 1]! - sg) <= tolerance &&
      Math.abs(data[idx + 2]! - sb) <= tolerance &&
      Math.abs(data[idx + 3]! - sa) <= tolerance
    );
  };

  const paint = (pixelPos: number) => {
    visited[pixelPos] = 1;
    const idx = pixelPos * 4;
    data[idx] = tr;
    data[idx + 1] = tg;
    data[idx + 2] = tb;
    data[idx + 3] = 255;
  };

  const stack: number[] = [startX, startY];
  while (stack.length > 0) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    let lx = x;
    while (lx >= 0 && matches(y * w + lx)) {
      lx--;
    }
    lx++;

    let spanAbove = false;
    let spanBelow = false;
    while (lx < w && matches(y * w + lx)) {
      paint(y * w + lx);

      if (y > 0) {
        const aboveMatches = matches((y - 1) * w + lx);
        if (!spanAbove && aboveMatches) {
          stack.push(lx, y - 1);
          spanAbove = true;
        } else if (spanAbove && !aboveMatches) {
          spanAbove = false;
        }
      }

      if (y < h - 1) {
        const belowMatches = matches((y + 1) * w + lx);
        if (!spanBelow && belowMatches) {
          stack.push(lx, y + 1);
          spanBelow = true;
        } else if (spanBelow && !belowMatches) {
          spanBelow = false;
        }
      }

      lx++;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Renders a single stroke onto a 2D canvas context.
 * Expects ctx to already be scaled by DPR for vector tools;
 * flood-fill operates directly on the physical pixel buffer.
 */
export function drawStrokeOnCtx(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number
) {
  if (stroke.points.length === 0 || width <= 0 || height <= 0) return;

  if (stroke.tool === 'fill') {
    const p = stroke.points[0]!;
    floodFillOnCanvas(ctx, p.x, p.y, stroke.color, stroke.opacity ?? 1);
    return;
  }

  ctx.save();
  ctx.globalAlpha = stroke.opacity ?? 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const strokeColor = stroke.tool === 'eraser' ? '#FFFFFF' : stroke.color;
  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  const lineWidth = Math.max(1.5, (stroke.size * width) / 800);
  ctx.lineWidth = lineWidth;

  const pts = stroke.points;

  if (stroke.tool === 'spray') {
    const baseSeed = hashString(stroke.id);
    const radius = Math.max(6, lineWidth * 1.6);
    const dotsPerPoint = Math.max(10, Math.min(28, Math.round(stroke.size * 1.1)));
    const dotRadius = Math.max(0.8, lineWidth * 0.08);

    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]!;
      const cx = p.x * width;
      const cy = p.y * height;
      let s = (baseSeed ^ Math.imul(i + 1, 2654435761)) >>> 0;
      for (let j = 0; j < dotsPerPoint; j++) {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        const angle = ((s & 0xffff) / 0xffff) * Math.PI * 2;
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        const r = Math.sqrt((s & 0xffff) / 0xffff) * radius;
        const dx = cx + Math.cos(angle) * r;
        const dy = cy + Math.sin(angle) * r;
        ctx.fillRect(dx - dotRadius, dy - dotRadius, dotRadius * 2, dotRadius * 2);
      }
    }
    ctx.restore();
    return;
  }

  if (stroke.tool === 'line') {
    const start = pts[0]!;
    const end = pts[pts.length - 1]!;
    ctx.beginPath();
    ctx.moveTo(start.x * width, start.y * height);
    ctx.lineTo(end.x * width, end.y * height);
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (stroke.tool === 'rect') {
    const start = pts[0]!;
    const end = pts[pts.length - 1]!;
    const x = Math.min(start.x, end.x) * width;
    const y = Math.min(start.y, end.y) * height;
    const rw = Math.abs(end.x - start.x) * width;
    const rh = Math.abs(end.y - start.y) * height;
    if (stroke.filled) {
      ctx.fillRect(x, y, rw, rh);
    } else {
      ctx.strokeRect(x, y, rw, rh);
    }
    ctx.restore();
    return;
  }

  if (stroke.tool === 'circle') {
    const start = pts[0]!;
    const end = pts[pts.length - 1]!;
    const cx = ((start.x + end.x) / 2) * width;
    const cy = ((start.y + end.y) / 2) * height;
    const rx = Math.max(0.5, (Math.abs(end.x - start.x) / 2) * width);
    const ry = Math.max(0.5, (Math.abs(end.y - start.y) / 2) * height);
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (stroke.filled) {
      ctx.fill();
    } else {
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Pencil or Eraser
  if (pts.length === 1) {
    const p = pts[0]!;
    ctx.beginPath();
    ctx.arc(p.x * width, p.y * height, lineWidth / 2, 0, Math.PI * 2);
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
