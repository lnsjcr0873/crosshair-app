import { useRef, useEffect, useCallback } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'
import { renderCrosshair, pickTickAtPoint, pickElementAtPoint } from '../engine/renderer'
import { createDrawingElement } from '../engine/types'

export default function CanvasPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const config = useCrosshairStore((s) => s.config)
  const scale = useCrosshairStore((s) => s.scale)
  const selectedTickId = useCrosshairStore((s) => s.selectedTickId)
  const overlayMode = useCrosshairStore((s) => s.overlayMode)
  const toastMsg = useCrosshairStore((s) => s.toastMsg)
  const editMode = useCrosshairStore((s) => s.editMode)
  const activeDrawingTool = useCrosshairStore((s) => s.activeDrawingTool)
  const selectedDrawingElementId = useCrosshairStore((s) => s.selectedDrawingElementId)
  const selectTick = useCrosshairStore((s) => s.selectTick)
  const moveTick = useCrosshairStore((s) => s.moveTick)
  const updateConfig = useCrosshairStore((s) => s.updateConfig)
  const addDrawingElement = useCrosshairStore((s) => s.addDrawingElement)
  const selectDrawingElement = useCrosshairStore((s) => s.selectDrawingElement)
  const moveDrawingElement = useCrosshairStore((s) => s.moveDrawingElement)
  const setEditMode = useCrosshairStore((s) => s.setEditMode)

  const draggingRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const refDragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

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
      renderCrosshair(ctx, config, rect.width, rect.height, scale,
        editMode === 'tick' ? selectedTickId : undefined,
        editMode === 'select' ? selectedDrawingElementId : undefined,
      )
    }

    draw()

    const ro = new ResizeObserver(() => draw())
    ro.observe(container)
    return () => ro.disconnect()
  })

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { px: 0, py: 0, mx: 0, my: 0, width: 0, height: 0 }
    const rect = canvas.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const mx = (px - rect.width / 2) / scale
    const my = (py - rect.height / 2) / scale
    return { px, py, mx, my, width: rect.width, height: rect.height }
  }

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const { px, py, mx, my, width, height } = getCanvasCoords(e)
      const st = useCrosshairStore.getState()

      if (editMode === 'draw') {
        const el = createDrawingElement(activeDrawingTool as any, Math.round(mx), Math.round(my))
        addDrawingElement(el)
        setEditMode('select')
        return
      }

      if (editMode === 'select') {
        const el = pickElementAtPoint(config.drawingElements || [], px, py, scale, width, height)
        if (el) { selectDrawingElement(el.id); return }
      }

      // tick mode or select mode fallback: try selecting a tick
      const found = pickTickAtPoint(config.ticks, px, py, scale, width, height)
      selectTick(found ? found.id : null)
    },
    [config.ticks, config.drawingElements, scale, editMode, activeDrawingTool, addDrawingElement, selectDrawingElement, selectTick, setEditMode],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if ((e.ctrlKey || e.metaKey) && config.referenceImage?.dataUrl) {
        refDragRef.current = {
          startX: e.clientX, startY: e.clientY,
          origX: config.referenceImage.offsetX,
          origY: config.referenceImage.offsetY,
        }
        return
      }
      const canvas = canvasRef.current
      if (!canvas) return
      const { px, py, mx, my, width, height } = getCanvasCoords(e)
      const st = useCrosshairStore.getState()

      // select/draw modes: check drawing elements first
      if (editMode !== 'tick') {
        const el = pickElementAtPoint(config.drawingElements || [], px, py, scale, width, height)
        if (el) {
          selectDrawingElement(el.id)
          draggingRef.current = { id: el.id, startX: mx, startY: my, origX: el.x, origY: el.y }
          return
        }
        // In select mode, if no element found, try tick
        if (editMode === 'select') {
          const found = pickTickAtPoint(config.ticks, px, py, scale, width, height)
          if (found) {
            selectTick(found.id)
            draggingRef.current = {
              id: found.id, startX: mx, startY: my, origX: found.distance, origY: 0,
            }
          }
        }
        return
      }

      // tick mode: existing behavior
      const found = pickTickAtPoint(config.ticks, px, py, scale, width, height)
      if (found) {
        selectTick(found.id)
        draggingRef.current = { id: found.id, startX: mx, startY: my, origX: found.distance, origY: 0 }
      }
    },
    [config.ticks, config.drawingElements, scale, selectTick, selectDrawingElement, config.referenceImage, editMode],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (refDragRef.current) {
        const ref = config.referenceImage
        if (!ref) return
        const dx = e.clientX - refDragRef.current.startX
        const dy = e.clientY - refDragRef.current.startY
        updateConfig({
          referenceImage: { ...ref, offsetX: refDragRef.current.origX + dx, offsetY: refDragRef.current.origY + dy },
        })
        return
      }
      if (!draggingRef.current) return
      const d = draggingRef.current
      const { mx, my } = getCanvasCoords(e)

      if (d.id === useCrosshairStore.getState().selectedDrawingElementId) {
        const dx = mx - d.startX
        const dy = my - d.startY
        moveDrawingElement(d.id, Math.round(d.origX + dx), Math.round(d.origY + dy))
        draggingRef.current = { ...d, startX: mx, startY: my }
        return
      }

      // tick dragging
      const tick = config.ticks.find((t) => t.id === d.id)
      if (!tick) return
      let newDist: number
      if (tick.axis === 'horizontal') {
        newDist = d.origX + (mx - d.startX)
      } else {
        newDist = d.origX + (my - d.startY)
      }
      const snapped = Math.round(newDist)
      moveTick(d.id, snapped)
      draggingRef.current = { ...d, startX: mx, startY: my, origX: snapped }
    },
    [config.ticks, config.drawingElements, scale, moveTick, moveDrawingElement],
  )

  const handleMouseUp = useCallback(() => {
    draggingRef.current = null
    refDragRef.current = null
  }, [])

  const scrollState = useRef({ step: 1, acc: 0, timer: 0 })
  const SCROLL_THRESHOLD = 10
  const MAX_STEP = 81

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const st = useCrosshairStore.getState()
      // In draw/select mode: scroll zooms
      if (st.editMode !== 'tick') {
        const cur = st.scale
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        st.setScale(Math.max(0.2, Math.min(5, cur + delta)))
        return
      }
      const sid = st.selectedTickId
      if (!sid) {
        const cur = st.scale
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        st.setScale(Math.max(0.2, Math.min(5, cur + delta)))
        return
      }
      const curConfig = st.config
      const tick = curConfig.ticks.find((t) => t.id === sid)
      if (!tick) return
      const s = scrollState.current
      clearTimeout(s.timer)
      const dir = e.deltaY > 0 ? 1 : -1
      s.acc += 1
      if (s.acc >= SCROLL_THRESHOLD) { s.step = Math.min(s.step * 3, MAX_STEP); s.acc = 0 }
      st.moveTick(sid, tick.distance + dir * s.step)
      s.timer = window.setTimeout(() => { s.step = 1; s.acc = 0 }, 1000)
    }
    canvas.addEventListener('wheel', handler, { passive: false })
    return () => {
      canvas.removeEventListener('wheel', handler)
      clearTimeout(scrollState.current.timer)
      scrollState.current.step = 1; scrollState.current.acc = 0
    }
  }, [])

  // paste image from clipboard
  useEffect(() => {
    const handler = async (e: ClipboardEvent) => {
      const file = e.clipboardData?.files[0]
      if (file?.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => {
          const st = useCrosshairStore.getState()
          st.updateConfig({
            referenceImage: { dataUrl: reader.result as string, opacity: 0.4, scale: 1, offsetX: 0, offsetY: 0 },
          })
        }
        reader.readAsDataURL(file)
      }
    }
    window.addEventListener('paste', handler)
    return () => window.removeEventListener('paste', handler)
  }, [])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file?.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const st = useCrosshairStore.getState()
      st.updateConfig({
        referenceImage: { dataUrl: reader.result as string, opacity: 0.4, scale: 1, offsetX: 0, offsetY: 0 },
      })
    }
    reader.readAsDataURL(file)
  }

  return (
    <div ref={containerRef} className={`flex-1 relative ${overlayMode ? 'bg-transparent' : 'bg-zinc-900'} overflow-hidden`}
      onDragOver={handleDragOver} onDrop={handleDrop}>
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
          {editMode === 'tick' ? '🎯' : editMode === 'draw' ? '✏️' : '👆'} Scale: {scale.toFixed(1)}x | Ticks: {config.ticks.filter((t) => t.visible).length}
        </div>
      )}
      {toastMsg && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none bg-black/70 text-white text-sm px-4 py-2 rounded-lg whitespace-nowrap animate-fade-out">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
