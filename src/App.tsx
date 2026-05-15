import { useEffect } from 'react'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import CanvasPreview from './components/CanvasPreview'
import TickList from './components/TickList'
import TickPropertyPanel from './components/TickPropertyPanel'
import { useCrosshairStore } from './store/crosshairStore'
import { exportPng, savePreset } from './engine/actions'
import { isTauri, setOverlayWindow, registerShortcut, unregisterShortcut } from './engine/tauri'

const OVERLAY_SHORTCUTS: [string, (st: ReturnType<typeof useCrosshairStore.getState>) => void][] = [
  ['Ctrl+Shift+2', (st) => st.setOverlayMode(false)],
  ['Ctrl+Shift+H', (st) => st.updateConfig({ mainAlpha: st.config.mainAlpha > 0 ? 0 : 1 })],
  ['PageUp', (st) => {
    const sorted = [...st.config.ticks].sort((a, b) => a.distance - b.distance)
    if (sorted.length === 0) return
    const idx = sorted.findIndex((t) => t.id === st.selectedTickId)
    st.selectTick(idx < sorted.length - 1 ? sorted[idx + 1].id : sorted[0].id)
  }],
  ['PageDown', (st) => {
    const sorted = [...st.config.ticks].sort((a, b) => b.distance - a.distance)
    if (sorted.length === 0) return
    const idx = sorted.findIndex((t) => t.id === st.selectedTickId)
    st.selectTick(idx < sorted.length - 1 ? sorted[idx + 1].id : sorted[0].id)
  }],
  ['ArrowUp', (st) => {
    if (!st.selectedTickId) return
    const tick = st.config.ticks.find((t) => t.id === st.selectedTickId)
    if (tick) st.moveTick(st.selectedTickId, tick.distance + 1)
  }],
  ['ArrowDown', (st) => {
    if (!st.selectedTickId) return
    const tick = st.config.ticks.find((t) => t.id === st.selectedTickId)
    if (tick) st.moveTick(st.selectedTickId, tick.distance - 1)
  }],
  [']', (st) => {
    if (!st.selectedTickId) return
    const tick = st.config.ticks.find((t) => t.id === st.selectedTickId)
    if (tick) st.updateTick(st.selectedTickId, { lineLength: Math.min(80, tick.lineLength + 1) })
  }],
  ['[', (st) => {
    if (!st.selectedTickId) return
    const tick = st.config.ticks.find((t) => t.id === st.selectedTickId)
    if (tick) st.updateTick(st.selectedTickId, { lineLength: Math.max(2, tick.lineLength - 1) })
  }],
]

export default function App() {
  const overlayMode = useCrosshairStore((s) => s.overlayMode)

  // window management
  useEffect(() => {
    const timer = setTimeout(() => { setOverlayWindow(overlayMode) }, 300)
    return () => clearTimeout(timer)
  }, [overlayMode])

  // global shortcuts for overlay mode (works even when game has focus)
  useEffect(() => {
    if (!isTauri()) return
    if (!overlayMode) return
    const keys = OVERLAY_SHORTCUTS.map(([k]) => k)
    Promise.all(keys.map((k) => registerShortcut(k, () => {
      const entry = OVERLAY_SHORTCUTS.find(([sk]) => sk === k)
      if (entry) entry[1](useCrosshairStore.getState())
    }))).then(() => {
      // cleanup on unmount
    })
    return () => { keys.forEach((k) => unregisterShortcut(k)) }
  }, [overlayMode])

  // keyboard handler (editor mode + browser fallback for overlay)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const st = useCrosshairStore.getState()

      if (ctrl && (e.code === 'KeyZ' || e.key === 'z')) {
        if (e.shiftKey) { e.preventDefault(); st.redo() }
        else { e.preventDefault(); st.undo() }
        return
      }
      if (ctrl && (e.code === 'KeyY' || e.key === 'y')) { e.preventDefault(); st.redo(); return }
      if (ctrl && (e.code === 'KeyS' || e.key === 's')) { e.preventDefault(); savePreset(st.config); return }
      if (ctrl && (e.code === 'KeyE' || e.key === 'e')) { e.preventDefault(); exportPng(st.config); return }
      if (ctrl && e.shiftKey && e.code === 'Digit2') { e.preventDefault(); st.setOverlayMode(!st.overlayMode); return }
      if (ctrl && e.shiftKey && e.code === 'KeyH') { e.preventDefault(); st.updateConfig({ mainAlpha: st.config.mainAlpha > 0 ? 0 : 1 }); return }

      if (!st.overlayMode) return

      // overlay keyboard shortcuts (fallback when not in Tauri)
      if (isTauri()) return // Tauri uses global shortcuts, skip here
      const tick = st.selectedTickId ? st.config.ticks.find((t) => t.id === st.selectedTickId) : null
      if (e.code === 'PageUp') {
        e.preventDefault()
        const sorted = [...st.config.ticks].sort((a, b) => a.distance - b.distance)
        if (sorted.length === 0) return
        const idx = sorted.findIndex((t) => t.id === st.selectedTickId)
        st.selectTick(idx < sorted.length - 1 ? sorted[idx + 1].id : sorted[0].id)
        return
      }
      if (e.code === 'PageDown') {
        e.preventDefault()
        const sorted = [...st.config.ticks].sort((a, b) => b.distance - a.distance)
        if (sorted.length === 0) return
        const idx = sorted.findIndex((t) => t.id === st.selectedTickId)
        st.selectTick(idx < sorted.length - 1 ? sorted[idx + 1].id : sorted[0].id)
        return
      }
      if (!tick) return
      if (e.code === 'ArrowDown') { e.preventDefault(); st.moveTick(st.selectedTickId!, tick.distance - 1); return }
      if (e.code === 'ArrowUp') { e.preventDefault(); st.moveTick(st.selectedTickId!, tick.distance + 1); return }
      if (e.code === 'BracketLeft') { e.preventDefault(); st.updateTick(st.selectedTickId!, { lineLength: Math.max(2, tick.lineLength - 1) }); return }
      if (e.code === 'BracketRight') { e.preventDefault(); st.updateTick(st.selectedTickId!, { lineLength: Math.min(80, tick.lineLength + 1) }); return }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className={`h-screen flex flex-col ${overlayMode ? 'bg-transparent' : 'bg-zinc-900'}`}>
      {overlayMode ? (
        <CanvasPreview />
      ) : (
        <>
          <TitleBar />
          <Toolbar />
          <div className="flex flex-1 overflow-hidden">
            <div className="w-56 bg-zinc-800 border-r border-zinc-700 overflow-y-auto flex flex-col">
              <TickList />
            </div>
            <CanvasPreview />
            <div className="w-64 bg-zinc-800 border-l border-zinc-700 overflow-y-auto">
              <TickPropertyPanel />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
