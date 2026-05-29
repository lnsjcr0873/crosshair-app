import { useState, useRef, useEffect, useCallback } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'
import { defaultFissionConfig, defaultFissionLevel } from '../engine/types'
import type { FissionConfig, FissionLevelConfig } from '../engine/types'

const PROP_LABELS: Record<string, string> = {
  lineLength: '线长', lineWidth: '线宽', color: '颜色', fontSize: '字号',
  offsetX: '偏移X', offsetY: '偏移Y', labelOffsetX: '标签X', labelOffsetY: '标签Y',
}
type FissionProp = keyof NonNullable<FissionLevelConfig['inherit']>
const PROP_KEYS: FissionProp[] = ['lineLength', 'lineWidth', 'color', 'fontSize', 'offsetX', 'offsetY', 'labelOffsetX', 'labelOffsetY']

const PROP_RANGE: Record<string, { min: number; max: number; step: number }> = {
  lineLength: { min: 0.1, max: 80, step: 0.1 },
  lineWidth: { min: 0.1, max: 10, step: 0.1 },
  fontSize: { min: 6, max: 40, step: 1 },
  offsetX: { min: -200, max: 200, step: 1 },
  offsetY: { min: -200, max: 200, step: 1 },
  labelOffsetX: { min: -200, max: 200, step: 1 },
  labelOffsetY: { min: -200, max: 200, step: 1 },
}

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
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }
  useEffect(() => { if (editing && inputRef.current) inputRef.current.select() }, [editing])

  return (
    <div ref={ref} className="flex items-center gap-1 flex-1">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      {editing ? (
        <input ref={inputRef} type="text" inputMode="numeric" value={buf} onChange={(e) => setBuf(e.target.value)} onBlur={commit} onKeyDown={handleKey} className="input-field w-14 text-center" />
      ) : (
        <span onClick={startEdit} className="cursor-text hover:bg-zinc-700 rounded px-1.5 py-0.5 min-w-[2.5rem] text-right text-zinc-200 text-xs select-none" title="点击编辑">{fmt(value)}</span>
      )}
    </div>
  )
}

export default function FissionSettingsPanel({ onClose }: { onClose: () => void }) {
  const config = useCrosshairStore((s) => s.config)
  const updateConfig = useCrosshairStore((s) => s.updateConfig)
  const fc: FissionConfig = config.fissionConfig ?? defaultFissionConfig()
  const [currentLevel, setCurrentLevel] = useState(0)

  const setFC = (partial: Partial<FissionConfig>) => updateConfig({ fissionConfig: { ...fc, ...partial } })

  const level: FissionLevelConfig = fc.levels[currentLevel] ?? defaultFissionLevel()
  const setLevel = (partial: Partial<FissionLevelConfig>) => {
    const levels = [...fc.levels]
    levels[currentLevel] = { ...level, ...partial }
    setFC({ levels })
  }

  const setInherit = (prop: FissionProp, mode: 'previous' | 'next' | undefined) => {
    const inherit = { ...level.inherit } as Record<string, 'previous' | 'next'>
    if (mode) inherit[prop] = mode
    else delete inherit[prop]
    setLevel({ inherit: Object.keys(inherit).length > 0 ? inherit as any : undefined })
  }

  const addLevel = () => {
    const src = fc.levels[fc.levels.length - 1] ?? defaultFissionLevel()
    const levels = [...fc.levels, { ...src }]
    setFC({ levels })
    setCurrentLevel(levels.length - 1)
  }

  const removeLevel = () => {
    if (fc.levels.length <= 1) return
    const levels = fc.levels.filter((_, i) => i !== currentLevel)
    setFC({ levels })
    if (currentLevel >= levels.length) setCurrentLevel(levels.length - 1)
  }

  const onlyGroups: ('h-left'|'h-right'|'v-top'|'v-bottom')[] = fc.onlyGroups ?? ['h-left', 'h-right', 'v-top', 'v-bottom']
  const toggleGroup = (g: 'h-left'|'h-right'|'v-top'|'v-bottom') => {
    const next = onlyGroups.includes(g) ? onlyGroups.filter(x => x !== g) : [...onlyGroups, g]
    setFC({ onlyGroups: next.length < 4 ? next : undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-5 w-[420px] max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-semibold mb-3">刻度裂变设置</h2>

        {/* Global */}
        <div className="text-zinc-400 text-xs font-semibold mb-2 border-b border-zinc-700 pb-1">全局</div>
        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 w-12 shrink-0">分组</span>
            <select value={fc.groupMode} onChange={(e) => setFC({ groupMode: e.target.value as any })} className="input-field flex-1 text-xs">
              <option value="by-distance">按距离（忽略方向）</option>
              <option value="by-direction">按方向（单点跳过）</option>
            </select>
            <span className="text-zinc-400 w-10 shrink-0">方向</span>
            <select value={fc.direction} onChange={(e) => setFC({ direction: e.target.value as any })} className="input-field flex-1 text-xs">
              <option value="inherit">跟随相邻</option>
              <option value="1">{'→ / ↓'}</option>
              <option value="-1">{'← / ↑'}</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 w-12 shrink-0">标签</span>
            <select value={fc.labelMode} onChange={(e) => setFC({ labelMode: e.target.value as any })} className="input-field flex-1 text-xs">
              <option value="midpoint">中值</option>
              <option value="left-value">前一个值</option>
              <option value="right-value">后一个值</option>
              <option value="distance">距离值</option>
            </select>
            <span className="text-zinc-400 w-10 shrink-0">迭代</span>
            <SliderInput value={fc.maxIterations} min={1} max={20} step={1} onChange={(v) => setFC({ maxIterations: v })} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <label className="flex items-center gap-1 text-zinc-300"><input type="checkbox" checked={onlyGroups.includes('v-top')} onChange={() => toggleGroup('v-top')} className="accent-green-500" />上立柱</label>
            <label className="flex items-center gap-1 text-zinc-300"><input type="checkbox" checked={onlyGroups.includes('v-bottom')} onChange={() => toggleGroup('v-bottom')} className="accent-green-500" />下立柱</label>
            <label className="flex items-center gap-1 text-zinc-300"><input type="checkbox" checked={onlyGroups.includes('h-left')} onChange={() => toggleGroup('h-left')} className="accent-green-500" />水平左</label>
            <label className="flex items-center gap-1 text-zinc-300"><input type="checkbox" checked={onlyGroups.includes('h-right')} onChange={() => toggleGroup('h-right')} className="accent-green-500" />水平右</label>
          </div>
          <div className="flex gap-4 text-xs">
            <label className="flex items-center gap-1 text-zinc-300"><input type="checkbox" checked={fc.symmetric} onChange={() => setFC({ symmetric: !fc.symmetric })} className="accent-green-500" />对称</label>
            <label className="flex items-center gap-1 text-zinc-300"><input type="checkbox" checked={fc.markGenerated} onChange={() => setFC({ markGenerated: !fc.markGenerated })} className="accent-green-500" />标记裂变刻度</label>
          </div>
        </div>

        {/* Levels */}
        <div className="flex items-center justify-between border-b border-zinc-700 pb-1 mb-2">
          <span className="text-zinc-400 text-xs font-semibold">裂变层</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentLevel(Math.max(0, currentLevel - 1))} disabled={currentLevel <= 0} className="text-zinc-400 hover:text-white disabled:opacity-30 text-xs">◀</button>
            <span className="text-zinc-300 text-xs">{currentLevel + 1}/{fc.levels.length}</span>
            <button onClick={() => setCurrentLevel(Math.min(fc.levels.length - 1, currentLevel + 1))} disabled={currentLevel >= fc.levels.length - 1} className="text-zinc-400 hover:text-white disabled:opacity-30 text-xs">▶</button>
            <button onClick={addLevel} className="text-green-500 hover:text-green-400 text-xs">+新增</button>
            <button onClick={removeLevel} disabled={fc.levels.length <= 1} className="text-red-500 hover:text-red-400 text-xs disabled:opacity-30">−删除</button>
          </div>
        </div>

        <div className="space-y-1.5 text-sm">
          {PROP_KEYS.map((prop) => (
            <LevelPropRow
              key={prop}
              label={PROP_LABELS[prop]}
              inheritMode={level.inherit?.[prop]}
              value={prop === 'color' ? (level[prop] as string) : (level[prop] as number)}
              isColor={prop === 'color'}
              range={PROP_RANGE[prop]}
              onInheritChange={(mode) => setInherit(prop, mode)}
              onValueChange={(v) => setLevel({ [prop]: v })}
            />
          ))}
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={() => updateConfig({ fissionConfig: defaultFissionConfig() })} className="btn-secondary text-xs">恢复默认</button>
          <button onClick={onClose} className="btn-primary text-xs ml-auto">关闭</button>
        </div>
      </div>
    </div>
  )
}

function LevelPropRow({ label, inheritMode, value, isColor, range, onInheritChange, onValueChange }: {
  label: string; inheritMode?: 'previous' | 'next'; value: number | string | undefined; isColor: boolean
  range: { min: number; max: number; step: number }
  onInheritChange: (mode: 'previous' | 'next' | undefined) => void; onValueChange: (v: any) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-400 w-12 shrink-0 text-xs">{label}</span>
      <select
        value={inheritMode ?? 'uniform'}
        onChange={(e) => {
          const v = e.target.value
          onInheritChange(v === 'uniform' ? undefined : v as any)
        }}
        className="input-field w-20 text-xs"
      >
        <option value="uniform">统一</option>
        <option value="previous">前一个</option>
        <option value="next">后一个</option>
      </select>
      <div className="flex-1">
        {inheritMode ? (
          <span className="text-zinc-500 text-xs">（跟随）</span>
        ) : isColor ? (
          <input type="color" value={value as string} onChange={(e) => onValueChange(e.target.value)} className="w-10 h-7 bg-transparent border-0 cursor-pointer" />
        ) : (
          <SliderInput value={value as number} min={range.min} max={range.max} step={range.step} onChange={onValueChange} />
        )}
      </div>
    </div>
  )
}
