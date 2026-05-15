import { useState, useEffect, useCallback } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'
import { DEFAULT_HOTKEYS } from '../engine/types'

const ACTION_LABELS: Record<string, string> = {
  toggleOverlay: '切换 Overlay',
  toggleVisibility: '切换可见性',
  prevTick: '上一刻度',
  nextTick: '下一刻度',
  incDistance: '增加距离',
  decDistance: '减小距离',
  incLineLength: '增加线长',
  decLineLength: '减小线长',
}

export default function SettingsPanel({ onClose }: { onClose: () => void }) {
  const hotkeys = useCrosshairStore((s) => s.hotkeys)
  const updateHotkeys = useCrosshairStore((s) => s.updateHotkeys)
  const resetHotkeys = useCrosshairStore((s) => s.resetHotkeys)
  const [recording, setRecording] = useState<string | null>(null)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!recording) return
    e.preventDefault()
    e.stopPropagation()
    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.shiftKey) parts.push('Shift')
    if (e.altKey) parts.push('Alt')
    let key = e.code
    // normalize common keys
    if (key.startsWith('Key')) key = key.slice(3)
    else if (key.startsWith('Digit')) key = key.slice(5)
    else if (key === 'BracketLeft') key = '['
    else if (key === 'BracketRight') key = ']'
    parts.push(key)
    updateHotkeys(recording, parts.join('+'))
    setRecording(null)
  }, [recording, updateHotkeys])

  useEffect(() => {
    if (!recording) return
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [recording, handleKeyDown])

  const entries = Object.keys(DEFAULT_HOTKEYS).filter((k) => !k.startsWith('switchConfig')).map((k) => ({
    key: k,
    label: ACTION_LABELS[k] || k,
  }))

  const switchEntries = Object.keys(DEFAULT_HOTKEYS).filter((k) => k.startsWith('switchConfig')).map((k) => ({
    key: k,
    label: `配置 ${k.replace('switchConfig', '')}`,
  }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-5 w-[380px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-semibold mb-4">快捷键设置</h2>
        <div className="space-y-2 text-sm">
          {[...entries, ...switchEntries].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-zinc-300">{label}</span>
              <button
                onClick={() => setRecording(recording === key ? null : key)}
                className={`px-3 py-1 rounded border text-xs font-mono min-w-[120px] text-center
                  ${recording === key ? 'bg-yellow-700 border-yellow-500 text-white animate-pulse' : 'bg-zinc-700 border-zinc-500 text-zinc-300 hover:border-zinc-400'}`}
              >
                {recording === key ? '按下按键...' : hotkeys[key] || '-'}
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={resetHotkeys} className="btn-secondary text-xs">恢复默认</button>
          <button onClick={onClose} className="btn-primary text-xs ml-auto">关闭</button>
        </div>
      </div>
    </div>
  )
}
