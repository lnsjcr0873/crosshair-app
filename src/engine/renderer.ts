import type { CrosshairConfig, TickMark, DrawingElement } from './types'

const SELECTED_COLOR = '#ff4444'
const imageCache = new Map<string, HTMLImageElement>()

function getRefImage(dataUrl: string): HTMLImageElement | null {
  const cached = imageCache.get(dataUrl)
  if (cached) return cached
  const img = new Image()
  img.src = dataUrl
  imageCache.set(dataUrl, img)
  return img
}

export function renderCrosshair(
  ctx: CanvasRenderingContext2D,
  config: CrosshairConfig,
  width: number,
  height: number,
  scale: number = 1,
  selectedTickId?: string | null,
  selectedElementId?: string | null,
) {
  const cx = width / 2
  const cy = height / 2

  ctx.clearRect(0, 0, width, height)

  // background (uses its own alpha)
  if (config.bgAlpha > 0) {
    ctx.globalAlpha = config.bgAlpha
    ctx.fillStyle = config.bgColor
    ctx.fillRect(0, 0, width, height)
    ctx.globalAlpha = 1
  }

  // reference image
  const ref = config.referenceImage
  if (ref?.dataUrl) {
    const img = getRefImage(ref.dataUrl)
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save()
      ctx.globalAlpha = ref.opacity
      ctx.translate(cx + ref.offsetX, cy + ref.offsetY)
      ctx.scale(ref.scale, ref.scale)
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
      ctx.restore()
    }
  }

  // main content (uses mainAlpha)
  ctx.save()
  ctx.globalAlpha = config.mainAlpha
  ctx.translate(cx, cy)
  ctx.scale(scale, scale)

  ctx.strokeStyle = config.mainColor
  ctx.fillStyle = config.mainColor
  ctx.lineWidth = config.mainLineWidth

  // draw horizontal main line (with center gap)
  const gap = config.centerGap
  const hLen = config.horizontalLineLength
  ctx.beginPath()
  if (config.showLeftLine) {
    ctx.moveTo(-hLen, 0)
    ctx.lineTo(-gap, 0)
  }
  if (config.showRightLine) {
    ctx.moveTo(gap, 0)
    ctx.lineTo(hLen, 0)
  }
  ctx.stroke()

  // draw bottom vertical post (downward from center)
  if (config.showBottomLine) {
    ctx.beginPath()
    ctx.moveTo(0, gap)
    ctx.lineTo(0, config.verticalLineLength)
    ctx.stroke()
  }

  // draw top vertical post (upward from center)
  if (config.showTopLine) {
    ctx.beginPath()
    ctx.moveTo(0, -gap)
    ctx.lineTo(0, -config.topPostLength)
    ctx.stroke()
  }

  // draw ticks
  for (const tick of config.ticks) {
    if (!tick.visible) continue
    if (tick.axis === 'vertical' && tick.distance < 0 && !config.showTopTicks) continue
    if (tick.axis === 'vertical' && tick.distance >= 0 && !config.showBottomTicks) continue
    if (tick.axis === 'horizontal') {
      if (tick.distance < 0 && !config.showLeftTicks) continue
      if (tick.distance > 0 && !config.showRightTicks) continue
    }
    drawTick(ctx, tick, tick.id === selectedTickId)
  }

  // draw drawing elements (on top of ticks)
  for (const el of (config.drawingElements || [])) {
    if (!el.visible) continue
    const isSelected = el.id === selectedElementId
    drawElement(ctx, el, isSelected)
  }

  // center dot (topmost)
  if (config.showCenterDot) {
    ctx.save()
    ctx.globalAlpha = config.centerDotAlpha
    ctx.fillStyle = config.centerDotColor
    ctx.beginPath()
    ctx.arc(0, 0, config.centerDotSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  ctx.restore()
}

function drawElement(ctx: CanvasRenderingContext2D, el: DrawingElement, selected: boolean = false) {
  ctx.save()
  ctx.translate(el.x, el.y)
  ctx.rotate(el.rotation)
  const color = selected ? '#4488ff' : el.color
  ctx.strokeStyle = color
  ctx.fillStyle = el.fill || (selected ? 'rgba(68,136,255,0.15)' : 'transparent')
  ctx.lineWidth = selected ? el.strokeWidth + 1 : el.strokeWidth

  switch (el.type) {
    case 'line': {
      ctx.beginPath()
      ctx.moveTo(-el.width / 2, 0)
      ctx.lineTo(el.width / 2, 0)
      ctx.stroke()
      break
    }
    case 'rect': {
      ctx.fillRect(-el.width / 2, -el.height / 2, el.width, el.height)
      ctx.strokeRect(-el.width / 2, -el.height / 2, el.width, el.height)
      break
    }
    case 'ellipse': {
      ctx.beginPath()
      ctx.ellipse(0, 0, el.width / 2, el.height / 2, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      break
    }
    case 'text': {
      ctx.font = `${el.fontSize || 14}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = el.color
      ctx.fillText(el.text || '', 0, 0)
      break
    }
  }

  ctx.restore()
}

function drawTick(ctx: CanvasRenderingContext2D, tick: TickMark, selected: boolean = false) {
  const dir = tick.direction ?? (tick.axis === 'horizontal' ? -1 : 1)
  const color = selected ? SELECTED_COLOR : tick.color
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = selected ? tick.lineWidth + 1 : tick.lineWidth

  const ox = tick.offsetX || 0
  const oy = tick.offsetY || 0

  if (tick.axis === 'horizontal') {
    const x = tick.distance + ox
    const y = oy
    const ex = x
    const ey = y + dir * tick.lineLength
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    if (tick.label) {
      ctx.font = `${tick.fontSize}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(tick.label, x + tick.labelOffsetX, ey + dir * (tick.fontSize / 2 + 4) + tick.labelOffsetY)
    }
  } else {
    const x = ox
    const y = tick.distance + oy
    const ex = x + dir * tick.lineLength
    const ey = y
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    if (tick.label) {
      ctx.font = `${tick.fontSize}px monospace`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(tick.label, ex + dir * (tick.fontSize * 0.3 + 4) + tick.labelOffsetX, y + tick.labelOffsetY)
    }
  }
}

export function pickTickAtPoint(
  ticks: TickMark[],
  px: number,
  py: number,
  scale: number,
  width: number,
  height: number,
  threshold: number = 8,
): TickMark | null {
  const cx = width / 2
  const cy = height / 2
  const mx = px - cx
  const my = py - cy

  for (const tick of ticks) {
    if (!tick.visible) continue

    const dir = tick.direction ?? (tick.axis === 'horizontal' ? -1 : 1)
    const ox = tick.offsetX || 0
    const oy = tick.offsetY || 0
    let tx = 0, ty = 0, ex = 0, ey = 0

    if (tick.axis === 'horizontal') {
      tx = tick.distance + ox
      ty = oy
      ex = tx
      ey = ty + dir * tick.lineLength
    } else {
      tx = ox
      ty = tick.distance + oy
      ex = tx + dir * tick.lineLength
      ey = ty
    }

    tx *= scale
    ty *= scale
    ex *= scale
    ey *= scale

    const dist = pointToSegmentDist(mx, my, tx, ty, ex, ey)
    if (dist < threshold) return tick
  }
  return null
}

function pointToSegmentDist(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax
  const dy = by - ay
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - ax, py - ay)
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

export function pickElementAtPoint(
  elements: DrawingElement[],
  px: number,
  py: number,
  scale: number,
  width: number,
  height: number,
  threshold: number = 12,
): DrawingElement | null {
  const cx = width / 2
  const cy = height / 2
  const mx = (px - cx) / scale
  const my = (py - cy) / scale

  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i]
    if (!el.visible) continue
    const halfW = el.width / 2
    const halfH = el.height / 2

    let hit = false
    switch (el.type) {
      case 'line':
        hit = pointToSegmentDist(mx, my, el.x - halfW, el.y, el.x + halfW, el.y) < threshold / scale
        break
      case 'rect':
        hit = mx >= el.x - halfW && mx <= el.x + halfW && my >= el.y - halfH && my <= el.y + halfH
        break
      case 'ellipse': {
        const rx = halfW, ry = halfH
        if (rx <= 0 || ry <= 0) { hit = false; break }
        const dx = (mx - el.x) / rx, dy = (my - el.y) / ry
        hit = (dx * dx + dy * dy) <= 1
        break
      }
      case 'text':
        hit = Math.hypot(mx - el.x, my - el.y) < threshold / scale
        break
    }
    if (hit) return el
  }
  return null
}
