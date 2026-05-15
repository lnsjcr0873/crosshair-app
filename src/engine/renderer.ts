import type { CrosshairConfig, TickMark } from './types'

const SELECTED_COLOR = '#ff4444'

export function renderCrosshair(
  ctx: CanvasRenderingContext2D,
  config: CrosshairConfig,
  width: number,
  height: number,
  scale: number = 1,
  selectedTickId?: string | null,
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

  ctx.restore()
}

function drawTick(ctx: CanvasRenderingContext2D, tick: TickMark, selected: boolean = false) {
  const dir = tick.direction ?? (tick.axis === 'horizontal' ? -1 : 1)
  const color = selected ? SELECTED_COLOR : tick.color
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = selected ? tick.lineWidth + 1 : tick.lineWidth

  let x: number, y: number, dx: number, dy: number

  if (tick.axis === 'horizontal') {
    x = tick.distance
    y = 0
    dx = 0
    dy = dir * tick.lineLength
  } else {
    x = 0
    y = tick.distance
    dx = dir * tick.lineLength
    dy = 0
  }

  // draw tick line
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + dx, y + dy)
  ctx.stroke()

  // draw label
  if (tick.label) {
    ctx.font = `${tick.fontSize}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    let lx: number, ly: number
    if (tick.axis === 'horizontal') {
      lx = tick.distance
      ly = dir * (tick.lineLength + tick.fontSize / 2 + 4)
    } else {
      lx = dir * (tick.lineLength + tick.fontSize * 0.3 + 4)
      ly = tick.distance
    }

    ctx.fillText(tick.label, lx + tick.labelOffsetX, ly + tick.labelOffsetY)
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
    let tx = 0
    let ty = 0
    let endX = 0
    let endY = 0

    if (tick.axis === 'horizontal') {
      tx = tick.distance
      ty = 0
      endX = tick.distance
      endY = dir * tick.lineLength
    } else {
      tx = 0
      ty = tick.distance
      endX = dir * tick.lineLength
      endY = tick.distance
    }

    tx *= scale
    ty *= scale
    endX *= scale
    endY *= scale

    const dist = pointToSegmentDist(mx, my, tx, ty, endX, endY)
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
