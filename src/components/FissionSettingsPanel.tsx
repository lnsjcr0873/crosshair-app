import { useRef, useEffect, useCallback } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'
import { defaultFissionConfig } from '../engine/types'
import type { FissionConfig } from '../engine/types'

function SliderInput({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  const valueRef = useRef(value)
  valueRef.current = value
  const ref = useRef<HTMLDivElement>(null)

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const cur = valueRef.current
    const dir = e.deltaY > 0 ? -1 : 1
    const raw = cur + dir * step
    const snapped = Math.round(raw / step) * step
    const clamped = Math.min(max, Math.max(min, snapped))
    if (clamped !== cur) onChange(clamped)
  }, [min, max, step, onChange])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel, { passive: false } as any)
  }, [handleWheel])

  const fmt = (v: number) => step < 1 ? v.toFixed(1) : String(v)

  return (
    <div ref={ref} className="flex items-center gap-1 flex-1">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <input type="number" value={fmt(value)} onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))) }} className="input-field w-14 text-center" step={step} />
    </div>
  )
}

export default function FissionSettingsPanel({ onClose }: { onClose: () => void }) {
  const config = useCrosshairStore((s) => s.config)
  const updateConfig = useCrosshairStore((s) => s.updateConfig)
  const fc: FissionConfig = config.fissionConfig ?? defaultFissionConfig()

  const set = (partial: Partial<FissionConfig>) => updateConfig({ fissionConfig: { ...fc, ...partial } })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-5 w-[380px] max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-semibold mb-4">刻度裂变设置</h2>
        <div className="space-y-3 text-sm">
          <PropRow label="分组">
            <select value={fc.groupMode} onChange={(e) => set({ groupMode: e.target.value as any })} className="input-field flex-1 text-xs">
              <option value="by-distance">按距离（忽略方向）</option>
              <option value="by-direction">按方向（单点跳过）</option>
            </select>
          </PropRow>

          <PropRow label="属性">
            <select value={fc.inheritFrom} onChange={(e) => set({ inheritFrom: e.target.value as any })} className="input-field flex-1 text-xs">
              <option value="uniform">统一设定</option>
              <option value="previous">跟随前一个</option>
              <option value="next">跟随后一个</option>
            </select>
          </PropRow>

          {fc.inheritFrom === 'uniform' && (<>
            <PropRow label="线长"><SliderInput value={fc.lineLength} min={0.1} max={80} step={0.1} onChange={(v) => set({ lineLength: v })} /></PropRow>
            <PropRow label="线宽"><SliderInput value={fc.lineWidth} min={0.1} max={10} step={0.1} onChange={(v) => set({ lineWidth: v })} /></PropRow>
            <PropRow label="颜色">
              <input type="color" value={fc.color} onChange={(e) => set({ color: e.target.value })} className="w-10 h-8 bg-transparent border-0 cursor-pointer" />
            </PropRow>
            <PropRow label="字号"><SliderInput value={fc.fontSize} min={6} max={40} step={1} onChange={(v) => set({ fontSize: v })} /></PropRow>
          </>)}

          <PropRow label="方向">
            <select value={fc.direction} onChange={(e) => set({ direction: e.target.value as any })} className="input-field flex-1 text-xs">
              <option value="inherit">跟随相邻</option>
              <option value="1">{'→ / ↓'}</option>
              <option value="-1">{'← / ↑'}</option>
            </select>
          </PropRow>

          <label className="flex items-center gap-2 text-zinc-300 text-xs cursor-pointer">
            <input type="checkbox" checked={fc.symmetric} onChange={() => set({ symmetric: !fc.symmetric })} className="accent-green-500" />
            同时创建对称侧
          </label>

          <label className="flex items-center gap-2 text-zinc-300 text-xs cursor-pointer">
            <input type="checkbox" checked={fc.markGenerated} onChange={() => set({ markGenerated: !fc.markGenerated })} className="accent-green-500" />
            标记为「裂变刻度」（支持批量清除）
          </label>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => updateConfig({ fissionConfig: defaultFissionConfig() })} className="btn-secondary text-xs">恢复默认</button>
          <button onClick={onClose} className="btn-primary text-xs ml-auto">关闭</button>
        </div>
      </div>
    </div>
  )
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="flex items-center gap-2"><span className="text-zinc-400 w-12 shrink-0">{label}</span>{children}</div>
}
