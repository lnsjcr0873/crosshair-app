import { isTauri } from '../engine/tauri'
import { useCrosshairStore } from '../store/crosshairStore'

export default function TitleBar() {
  const overlayMode = useCrosshairStore((s) => s.overlayMode)
  if (overlayMode) return null

  const handleMinimize = async () => {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().minimize()
  }

  const handleClose = async () => {
    if (!isTauri()) return
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    await getCurrentWindow().close()
  }

  return (
    <div data-tauri-drag-region className="flex items-center h-9 bg-zinc-800 border-b border-zinc-700 select-none shrink-0">
      <span className="text-xs text-zinc-400 ml-3 mr-auto">准星刻度绘制</span>
      <div className="flex h-full">
        <button
          onClick={handleMinimize}
          className="px-3 h-full text-zinc-400 hover:bg-zinc-600 text-xs"
        >
          ─
        </button>
        <button
          onClick={handleClose}
          className="px-3 h-full text-zinc-400 hover:bg-red-600 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
