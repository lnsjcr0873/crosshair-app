import { useEffect, useRef, useCallback } from 'react'
import TitleBar from './components/TitleBar'
import Toolbar from './components/Toolbar'
import CanvasPreview from './components/CanvasPreview'
import TickList from './components/TickList'
import TickPropertyPanel from './components/TickPropertyPanel'
import { useCrosshairStore } from './store/crosshairStore'
import { exportPng, savePreset } from './engine/actions'
import { isTauri, setOverlayWindow, registerShortcut, unregisterShortcut } from './engine/tauri'

function visibleTicks(st: any) {
  return st.config.ticks.filter((t: any) => {
    if (!t.visible) return false
    if (t.axis === 'vertical' && t.distance < 0 && !st.config.showTopTicks) return false
    if (t.axis === 'vertical' && t.distance >= 0 && !st.config.showBottomTicks) return false
    if (t.axis === 'horizontal' && t.distance < 0 && !st.config.showLeftTicks) return false
    if (t.axis === 'horizontal' && t.distance > 0 && !st.config.showRightTicks) return false
    return true
  })
}

// Build a map: shortcut-string → handler
function buildActionMap(): Map<string, (st: ReturnType<typeof useCrosshairStore.getState>) => void> {
  const m = new Map()
  const h = useCrosshairStore.getState().hotkeys
  const cfg = (k: string) => h[k] || ''
  m.set(cfg('toggleOverlay'), (st: any) => st.setOverlayMode(!st.overlayMode))
  m.set(cfg('toggleVisibility'), (st: any) => st.updateConfig({ mainAlpha: st.config.mainAlpha > 0 ? 0 : 1 }))
  m.set(cfg('prevTick'), (st: any) => {
    const sorted = visibleTicks(st).sort((a: any, b: any) => a.distance - b.distance)
    if (sorted.length === 0) return
    const idx = sorted.findIndex((t: any) => t.id === st.selectedTickId)
    st.selectTick(idx < sorted.length - 1 ? sorted[idx + 1].id : sorted[0].id)
  })
  m.set(cfg('nextTick'), (st: any) => {
    const sorted = visibleTicks(st).sort((a: any, b: any) => b.distance - a.distance)
    if (sorted.length === 0) return
    const idx = sorted.findIndex((t: any) => t.id === st.selectedTickId)
    st.selectTick(idx < sorted.length - 1 ? sorted[idx + 1].id : sorted[0].id)
  })
  m.set(cfg('decDistance'), (st: any) => {
    if (!st.selectedTickId) return
    const tick = st.config.ticks.find((t: any) => t.id === st.selectedTickId)
    if (tick) st.moveTick(st.selectedTickId, tick.distance - 1)
  })
  m.set(cfg('incDistance'), (st: any) => {
    if (!st.selectedTickId) return
    const tick = st.config.ticks.find((t: any) => t.id === st.selectedTickId)
    if (tick) st.moveTick(st.selectedTickId, tick.distance + 1)
  })
  m.set(cfg('incLineLength'), (st: any) => {
    if (!st.selectedTickId) return
    const tick = st.config.ticks.find((t: any) => t.id === st.selectedTickId)
    if (tick) st.updateTick(st.selectedTickId, { lineLength: Math.min(80, tick.lineLength + 1) })
  })
  m.set(cfg('decLineLength'), (st: any) => {
    if (!st.selectedTickId) return
    const tick = st.config.ticks.find((t: any) => t.id === st.selectedTickId)
    if (tick) st.updateTick(st.selectedTickId, { lineLength: Math.max(2, tick.lineLength - 1) })
  })
  for (let i = 1; i <= 9; i++) {
    const key = cfg(`switchConfig${i}`)
    if (key) {
      const idx = i - 1
      m.set(key, (st: any) => { if (idx < st.configList.length) st.switchConfig(idx) })
    }
  }
  return m
}

function hotkeyToCode(hk: string): string {
  const parts = hk.split('+')
  const key = parts[parts.length - 1]
  if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'PageUp' || key === 'PageDown') return key
  if (key === '[') return 'BracketLeft'
  if (key === ']') return 'BracketRight'
  if (/^\d$/.test(key)) return `Digit${key}`
  if (/^[A-Z]$/.test(key)) return `Key${key}`
  return ''
}

export default function App() {
  const overlayMode = useCrosshairStore((s) => s.overlayMode)
  const arrowCount = useRef<Record<string, number>>({})

  useEffect(() => { setOverlayWindow(overlayMode) }, [overlayMode])

  // overlay focus loss guard: when mouse passes through to game,
  // Windows may reset fullscreen/decorations; restore them instantly
  useEffect(() => {
    if (!overlayMode || !isTauri()) return

    const restore = async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const w = getCurrentWindow()
      await w.setDecorations(false)
      await w.setFullscreen(true)
    }

    // immediate recovery on focus change
    let unlisten: (() => void) | undefined
    ;(async () => {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const w = getCurrentWindow()
      unlisten = await w.onFocusChanged(({ payload: focused }) => {
        if (!focused) {
          w.setDecorations(false)
          w.setFullscreen(true)
        }
      })
    })()

    // browser-level blur fallback
    const onBlur = () => restore()
    window.addEventListener('blur', onBlur)

    // periodic safety net (every 5s) to catch edge cases
    const interval = setInterval(restore, 5000)

    return () => {
      unlisten?.()
      window.removeEventListener('blur', onBlur)
      clearInterval(interval)
    }
  }, [overlayMode])

  // global shortcuts for overlay mode (build from hotkeys)
  useEffect(() => {
    if (!isTauri()) return
    if (!overlayMode) return
    const h = useCrosshairStore.getState().hotkeys
    const entries = Object.entries(h).filter(([k]) => !k.startsWith('switchConfig'))
    Promise.all(entries.map(([, shortcut]) =>
      registerShortcut(shortcut, () => {
        const act = buildActionMap().get(shortcut)
        if (act) act(useCrosshairStore.getState())
      })
    ))
    return () => { entries.forEach(([, s]) => unregisterShortcut(s)) }
  }, [overlayMode])

  // keyboard handler (editor mode + browser fallback for overlay)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      const st = useCrosshairStore.getState()

      // built-in editor shortcuts
      if (ctrl && (e.code === 'KeyZ' || e.key === 'z')) {
        if (e.shiftKey) { e.preventDefault(); st.redo() }
        else { e.preventDefault(); st.undo() }
        return
      }
      if (ctrl && (e.code === 'KeyY' || e.key === 'y')) { e.preventDefault(); st.redo(); return }
      if (ctrl && (e.code === 'KeyS' || e.key === 's')) { e.preventDefault(); savePreset(st.config); return }
      if (ctrl && (e.code === 'KeyE' || e.key === 'e')) { e.preventDefault(); exportPng(st.config); return }

      // Ctrl+1~9 switch config (works in both modes)
      if (ctrl && e.code >= 'Digit1' && e.code <= 'Digit9') {
        e.preventDefault()
        const idx = parseInt(e.code.replace('Digit', '')) - 1
        if (idx < st.configList.length) st.switchConfig(idx)
        return
      }

      // custom hotkey actions
      const parts: string[] = []
      if (ctrl) parts.push('Ctrl')
      if (e.shiftKey) parts.push('Shift')
      if (e.altKey) parts.push('Alt')
      let c = e.code
      if (c.startsWith('Digit') || c.startsWith('Key')) c = c.slice(5)
      else if (c === 'BracketLeft') c = '['
      else if (c === 'BracketRight') c = ']'
      parts.push(c)
      const combo = parts.join('+')
      const action = buildActionMap().get(combo)
      if (action) {
        // toggleOverlay and toggleVisibility and switchConfig work in both modes
        const h = useCrosshairStore.getState().hotkeys
        const isGlobal = combo === h.toggleOverlay || combo === h.toggleVisibility || combo.startsWith('Ctrl+')
        if (isGlobal || st.overlayMode) {
          e.preventDefault()
          action(st)
          return
        }
        if (!st.overlayMode) return
      }

      // arrow acceleration (only when not handled by hotkeys above in overlay fallback)
      if (!st.overlayMode) return
      if (isTauri()) return
      const tick = st.selectedTickId ? st.config.ticks.find((t: any) => t.id === st.selectedTickId) : null
      if (!tick) return
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') {
        e.preventDefault()
        if (!e.repeat) arrowCount.current[e.code] = 0
        arrowCount.current[e.code] = (arrowCount.current[e.code] || 0) + 1
        const count = arrowCount.current[e.code]
        const step = Math.min(Math.floor(count / 5) + 1, 5)
        const dir = e.code === 'ArrowDown' ? 1 : -1
        st.moveTick(st.selectedTickId!, tick.distance + dir * step)
        return
      }
    }
    window.addEventListener('keydown', handler)
    const resetArrow = (e: KeyboardEvent) => {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown') arrowCount.current[e.code] = 0
    }
    window.addEventListener('keyup', resetArrow)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('keyup', resetArrow)
    }
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
