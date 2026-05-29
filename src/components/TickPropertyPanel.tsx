import { useRef, useEffect, useCallback, useState } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'

function SliderInput({ value, min, max, step, onChange }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const [buf, setBuf] = useState('')
  const valueRef = useRef(value)
  valueRef.current = value
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

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

  const startEdit = () => { setBuf(fmt(value)); setEditing(true) }

  const commit = () => {
    setEditing(false)
    const v = parseFloat(buf)
    if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.select()
    }
  }, [editing])

  return (
    <div ref={ref} className="flex items-center gap-1 flex-1">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1"
      />
      {editing ? (
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          value={buf}
          onChange={(e) => setBuf(e.target.value)}
          onBlur={commit}
          onKeyDown={handleKey}
          className="input-field w-14 text-center"
        />
      ) : (
        <span
          onClick={startEdit}
          className="cursor-text hover:bg-zinc-700 rounded px-1.5 py-0.5 min-w-[2.5rem] text-right text-zinc-200 text-xs select-none"
          title="点击编辑"
        >
          {fmt(value)}
        </span>
      )}
    </div>
  )
}

export default function TickPropertyPanel() {
  const selectedTickId = useCrosshairStore((s) => s.selectedTickId)
  const config = useCrosshairStore((s) => s.config)
  const updateTick = useCrosshairStore((s) => s.updateTick)
  const removeTick = useCrosshairStore((s) => s.removeTick)
  const duplicateTick = useCrosshairStore((s) => s.duplicateTick)
  const mirrorTick = useCrosshairStore((s) => s.mirrorTick)

  const tick = config.ticks.find((t) => t.id === selectedTickId)

  if (!tick) {
    return (
      <div className="p-4 text-zinc-500 text-sm">
        点击画布上的刻度进行选中
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3 text-sm">
      <h3 className="text-white font-semibold mb-2">
        刻度属性
        <span className="text-zinc-400 ml-2 text-xs">
          ({tick.axis === 'horizontal' ? '水平' : tick.distance < 0 ? '上立柱' : '下立柱'}
          {tick.direction === -1 ? ' ↑' : ' ↓'})
        </span>
      </h3>

      <PropRow label="方向">
        <div className="flex gap-1">
          <button
            onClick={() => updateTick(tick.id, { direction: -1 })}
            className={`text-xs px-2 py-0.5 rounded border ${tick.direction === -1 ? 'bg-green-700 border-green-500 text-white' : 'bg-zinc-700 border-zinc-500 text-zinc-400'}`}
          >
            {tick.axis === 'horizontal' ? '↑' : '←'}
          </button>
          <button
            onClick={() => updateTick(tick.id, { direction: 1 })}
            className={`text-xs px-2 py-0.5 rounded border ${tick.direction === 1 ? 'bg-green-700 border-green-500 text-white' : 'bg-zinc-700 border-zinc-500 text-zinc-400'}`}
          >
            {tick.axis === 'horizontal' ? '↓' : '→'}
          </button>
        </div>
      </PropRow>

      <PropRow label="距离">
        <SliderInput value={tick.distance} min={-200} max={200} step={1} onChange={(v) => updateTick(tick.id, { distance: v })} />
      </PropRow>

      <PropRow label="线长">
        <SliderInput value={tick.lineLength} min={0.1} max={80} step={0.1} onChange={(v) => updateTick(tick.id, { lineLength: v })} />
      </PropRow>

      <PropRow label="线宽">
        <SliderInput value={tick.lineWidth} min={0.1} max={10} step={0.1} onChange={(v) => updateTick(tick.id, { lineWidth: v })} />
      </PropRow>

      <PropRow label="锁定">
        <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
          <input
            type="checkbox"
            checked={!!tick.locked}
            onChange={(e) => updateTick(tick.id, { locked: e.target.checked })}
            className="accent-amber-500"
          />
          调整时保持不动
        </label>
      </PropRow>

      <PropRow label="数值">
        <input
          type="text"
          value={tick.label}
          onChange={(e) => updateTick(tick.id, { label: e.target.value })}
          className="input-field flex-1"
        />
      </PropRow>

      <PropRow label="字号">
        <SliderInput value={tick.fontSize} min={6} max={40} step={1} onChange={(v) => updateTick(tick.id, { fontSize: v })} />
      </PropRow>

      <PropRow label="偏移 X">
        <SliderInput value={tick.offsetX} min={-80} max={80} step={1} onChange={(v) => updateTick(tick.id, { offsetX: v })} />
      </PropRow>

      <PropRow label="偏移 Y">
        <SliderInput value={tick.offsetY} min={-80} max={80} step={1} onChange={(v) => updateTick(tick.id, { offsetY: v })} />
      </PropRow>

      <PropRow label="标签X">
        <SliderInput value={tick.labelOffsetX} min={-80} max={80} step={1} onChange={(v) => updateTick(tick.id, { labelOffsetX: v })} />
      </PropRow>

      <PropRow label="标签Y">
        <SliderInput value={tick.labelOffsetY} min={-80} max={80} step={1} onChange={(v) => updateTick(tick.id, { labelOffsetY: v })} />
      </PropRow>

      <PropRow label="颜色">
        <input
          type="color"
          value={tick.color}
          onChange={(e) => updateTick(tick.id, { color: e.target.value })}
          className="w-10 h-8 bg-transparent border-0 cursor-pointer"
        />
      </PropRow>

      <PropRow label="镜像">
        <label className="flex items-center gap-2 cursor-pointer text-zinc-300">
          <input
            type="checkbox"
            checked={!!tick.mirrorId}
            onChange={() => mirrorTick(tick.id)}
            className="accent-green-500"
          />
          同步对称侧
        </label>
      </PropRow>

      <div className="flex gap-2 pt-2">
        <button onClick={() => removeTick(tick.id)} className="btn-danger flex-1">
          删除
        </button>
        <button onClick={() => duplicateTick(tick.id)} className="btn-secondary flex-1">
          复制
        </button>
        <button
          onClick={() => updateTick(tick.id, { visible: !tick.visible })}
          className={`btn-secondary flex-1 ${tick.visible ? '' : 'opacity-50'}`}
        >
          {tick.visible ? '隐藏' : '显示'}
        </button>
      </div>
    </div>
  )
}

function PropRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-400 w-10 shrink-0">{label}</span>
      <div className="flex items-center gap-1 flex-1">{children}</div>
    </div>
  )
}
