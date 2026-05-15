import { useRef, useEffect, useCallback } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'
import { renderCrosshair, pickTickAtPoint } from '../engine/renderer'

export default function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const config = useCrosshairStore((s) => s.config)
  const scale = useCrosshairStore((s) => s.scale)
  const selectedTickId = useCrosshairStore((s) => s.selectedTickId)
  const overlayMode = useCrosshairStore((s) => s.overlayMode)
  const selectTick = useCrosshairStore((s) => s.selectTick)
  const moveTick = useCrosshairStore((s) => s.moveTick)
  const draggingRef = useRef<{ id: string; startX: number; startY: number; origDist: number } | null>(null)

  // draw
  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!canvas || !container) return

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const dpr = window.devicePixelRatio || 1
      const rect = container.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      ctx.scale(dpr, dpr)
      renderCrosshair(ctx, config, rect.width, rect.height, scale, selectedTickId)
    }

    draw()

    const ro = new ResizeObserver(() => draw())
    ro.observe(container)
    return () => ro.disconnect()
  })

  // click to select
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const found = pickTickAtPoint(config.ticks, px, py, scale, rect.width, rect.height)
      selectTick(found ? found.id : null)
    },
    [config.ticks, scale, selectTick],
  )

  // mouse drag to move tick
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const found = pickTickAtPoint(config.ticks, px, py, scale, rect.width, rect.height)
      if (found) {
        selectTick(found.id)
        draggingRef.current = {
          id: found.id,
          startX: e.clientX,
          startY: e.clientY,
          origDist: found.distance,
        }
      }
    },
    [config.ticks, scale, selectTick],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!draggingRef.current) return
      const d = draggingRef.current
      const tick = config.ticks.find((t) => t.id === d.id)
      if (!tick) return

      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()

      let newDist: number
      if (tick.axis === 'horizontal') {
        const dx = (e.clientX - d.startX) / scale
        newDist = d.origDist + dx
      } else {
        const dy = (e.clientY - d.startY) / scale
        newDist = d.origDist + dy
      }

      const snapped = Math.round(newDist)
      moveTick(d.id, snapped)
      draggingRef.current = { ...d, origDist: snapped }
    },
    [config.ticks, scale, moveTick],
  )

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null
  }, [])

  const scrollState = useRef({ step: 1, acc: 0, timer: 0 })
  const SCROLL_THRESHOLD = 10
  const MAX_STEP = 81

  // use native wheel listener with passive:false
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const sid = useCrosshairStore.getState().selectedTickId
      if (!sid) {
        const curScale = useCrosshairStore.getState().scale
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        useCrosshairStore.getState().setScale(Math.max(0.2, Math.min(5, curScale + delta)))
        return
      }
      const curConfig = useCrosshairStore.getState().config
      const tick = curConfig.ticks.find((t) => t.id === sid)
      if (!tick) return
      const s = scrollState.current
      clearTimeout(s.timer)
      const dir = e.deltaY > 0 ? 1 : -1
      s.acc += 1
      if (s.acc >= SCROLL_THRESHOLD) { s.step = Math.min(s.step * 3, MAX_STEP); s.acc = 0 }
      useCrosshairStore.getState().moveTick(sid, tick.distance + dir * s.step)
      s.timer = window.setTimeout(() => { s.step = 1; s.acc = 0 }, 1000)
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => {
      canvas.removeEventListener('wheel', handler)
      clearTimeout(scrollState.current.timer)
      scrollState.current.step = 1; scrollState.current.acc = 0
    }
  }, [])

  return (
    <div ref={containerRef} className={`flex-1 relative ${overlayMode ? 'bg-transparent' : 'bg-zinc-900'} overflow-hidden`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {!overlayMode && (
        <div className="absolute bottom-2 left-2 text-zinc-500 text-xs font-mono">
          Scale: {scale.toFixed(1)}x | Ticks: {config.ticks.filter((t) => t.visible).length}
        </div>
      )}
    </div>
  )
}
