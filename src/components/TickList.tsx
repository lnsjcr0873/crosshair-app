import { useState } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'

const MAX_DIST = 1000

export default function TickList() {
  const config = useCrosshairStore((s) => s.config)
  const updateConfig = useCrosshairStore((s) => s.updateConfig)
  const selectedTickId = useCrosshairStore((s) => s.selectedTickId)
  const selectTick = useCrosshairStore((s) => s.selectTick)
  const addTick = useCrosshairStore((s) => s.addTick)
  const removeTick = useCrosshairStore((s) => s.removeTick)

  const configList = useCrosshairStore((s) => s.configList)
  const activeIndex = useCrosshairStore((s) => s.activeIndex)
  const switchConfig = useCrosshairStore((s) => s.switchConfig)
  const newConfig = useCrosshairStore((s) => s.newConfig)
  const deleteConfig = useCrosshairStore((s) => s.deleteConfig)
  const renameConfig = useCrosshairStore((s) => s.renameConfig)

  const [renaming, setRenaming] = useState(false)
  const [nameBuf, setNameBuf] = useState('')
  const [showNewOpts, setShowNewOpts] = useState(false)

  const hUpTicks = config.ticks.filter((t) => t.axis === 'horizontal' && (t.direction ?? -1) === -1)
  const hDownTicks = config.ticks.filter((t) => t.axis === 'horizontal' && (t.direction ?? -1) === 1)
  const topTicks = config.ticks.filter((t) => t.axis === 'vertical' && t.distance < 0)
  const bottomLeftTicks = config.ticks.filter((t) => t.axis === 'vertical' && t.distance >= 0 && (t.direction ?? 1) === -1)
  const bottomRightTicks = config.ticks.filter((t) => t.axis === 'vertical' && t.distance >= 0 && (t.direction ?? 1) === 1)

  const handleAdd = (axis: 'horizontal' | 'vertical', ticks: typeof config.ticks, direction?: 1 | -1) => {
    const last = ticks[ticks.length - 1]
    const step = direction === -1 && axis === 'vertical' ? -40 : 40
    const dist = last ? Math.min(Math.max(last.distance + step, -MAX_DIST), MAX_DIST) : 30
    addTick(axis, dist, direction)
  }

  const startRename = () => {
    setNameBuf(configList[activeIndex]?.name || '')
    setRenaming(true)
  }
  const commitRename = () => {
    if (nameBuf.trim()) renameConfig(nameBuf.trim())
    setRenaming(false)
  }

  return (
    <div className="p-4 space-y-4 text-sm">
      {/* 上立柱 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">上立柱</h3>
          <button
            onClick={() => updateConfig({ showTopLine: !config.showTopLine })}
            className={`text-xs px-2 py-0.5 rounded border ${config.showTopLine ? 'bg-green-700 border-green-500 text-white' : 'bg-zinc-700 border-zinc-500 text-zinc-400'}`}
          >
            {config.showTopLine ? 'ON' : 'OFF'}
          </button>
        </div>
        {config.showTopLine && (
          <div className="flex items-center gap-2 text-xs text-zinc-400 pl-1">
            <span>长度</span>
            <input
              type="range"
              min={60}
              max={400}
              value={config.topPostLength}
              onChange={(e) => updateConfig({ topPostLength: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-zinc-500 w-6">{config.topPostLength}</span>
          </div>
        )}
      </div>

      {/* 水平线/刻度开关 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        <label className="flex items-center gap-1 text-zinc-400">
          <input type="checkbox" checked={config.showLeftLine} onChange={() => updateConfig({ showLeftLine: !config.showLeftLine })} />
          左线
        </label>
        <label className="flex items-center gap-1 text-zinc-400">
          <input type="checkbox" checked={config.showRightLine} onChange={() => updateConfig({ showRightLine: !config.showRightLine })} />
          右线
        </label>
        <label className="flex items-center gap-1 text-zinc-400">
          <input type="checkbox" checked={config.showLeftTicks} onChange={() => updateConfig({ showLeftTicks: !config.showLeftTicks })} />
          左刻度
        </label>
        <label className="flex items-center gap-1 text-zinc-400">
          <input type="checkbox" checked={config.showRightTicks} onChange={() => updateConfig({ showRightTicks: !config.showRightTicks })} />
          右刻度
        </label>
      </div>

      {/* 水平刻度 ↑ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">水平刻度 ↑</h3>
          <button onClick={() => handleAdd('horizontal', hUpTicks, -1)} className="btn-add">+ 添加</button>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {hUpTicks.map((t) => (
            <div key={t.id} onClick={() => selectTick(t.id)} className={`tick-item ${selectedTickId === t.id ? 'tick-item-active' : ''}`}>
              <span className="text-zinc-300 w-14">{t.distance > 0 ? `R${t.distance}` : `L${Math.abs(t.distance)}`}</span>
              <span className="text-zinc-400 flex-1">{t.label || '—'}</span>
              <button onClick={(e) => { e.stopPropagation(); removeTick(t.id) }} className="text-red-500 hover:text-red-400 text-xs">×</button>
            </div>
          ))}
          {hUpTicks.length === 0 && <div className="text-zinc-600 text-xs py-1">暂无刻度</div>}
        </div>
      </div>

      {/* 水平刻度 ↓ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">水平刻度 ↓</h3>
          <button onClick={() => handleAdd('horizontal', hDownTicks, 1)} className="btn-add">+ 添加</button>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {hDownTicks.map((t) => (
            <div key={t.id} onClick={() => selectTick(t.id)} className={`tick-item ${selectedTickId === t.id ? 'tick-item-active' : ''}`}>
              <span className="text-zinc-300 w-14">{t.distance > 0 ? `R${t.distance}` : `L${Math.abs(t.distance)}`}</span>
              <span className="text-zinc-400 flex-1">{t.label || '—'}</span>
              <button onClick={(e) => { e.stopPropagation(); removeTick(t.id) }} className="text-red-500 hover:text-red-400 text-xs">×</button>
            </div>
          ))}
          {hDownTicks.length === 0 && <div className="text-zinc-600 text-xs py-1">暂无刻度</div>}
        </div>
      </div>

      {/* 上立柱刻度 */}
      {config.showTopTicks && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">上立柱</h3>
            <button onClick={() => handleAdd('vertical', topTicks, 1)} className="btn-add">+ 添加</button>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {topTicks.map((t) => (
              <div key={t.id} onClick={() => selectTick(t.id)} className={`tick-item ${selectedTickId === t.id ? 'tick-item-active' : ''}`}>
                <span className="text-zinc-300 w-14">{`U${Math.abs(t.distance)}`}</span>
                <span className="text-zinc-400 flex-1">{t.label || '—'}</span>
                <button onClick={(e) => { e.stopPropagation(); removeTick(t.id) }} className="text-red-500 hover:text-red-400 text-xs">×</button>
              </div>
            ))}
            {topTicks.length === 0 && <div className="text-zinc-600 text-xs py-1">暂无刻度</div>}
          </div>
        </div>
      )}

      {/* 下立柱刻度 → */}
      {config.showBottomTicks && (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">下立柱 →</h3>
          <button onClick={() => handleAdd('vertical', bottomRightTicks, 1)} className="btn-add">+ 添加</button>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {bottomRightTicks.map((t) => (
            <div key={t.id} onClick={() => selectTick(t.id)} className={`tick-item ${selectedTickId === t.id ? 'tick-item-active' : ''}`}>
              <span className="text-zinc-300 w-14">{`D${t.distance}`}</span>
              <span className="text-zinc-400 flex-1">{t.label || '—'}</span>
              <button onClick={(e) => { e.stopPropagation(); removeTick(t.id) }} className="text-red-500 hover:text-red-400 text-xs">×</button>
            </div>
          ))}
          {bottomRightTicks.length === 0 && <div className="text-zinc-600 text-xs py-1">暂无刻度</div>}
        </div>
      </div>
      )}

      {/* 下立柱刻度 ← */}
      {config.showBottomTicks && (
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">下立柱 ←</h3>
          <button onClick={() => handleAdd('vertical', bottomLeftTicks, -1)} className="btn-add">+ 添加</button>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {bottomLeftTicks.map((t) => (
            <div key={t.id} onClick={() => selectTick(t.id)} className={`tick-item ${selectedTickId === t.id ? 'tick-item-active' : ''}`}>
              <span className="text-zinc-300 w-14">{`D${t.distance}`}</span>
              <span className="text-zinc-400 flex-1">{t.label || '—'}</span>
              <button onClick={(e) => { e.stopPropagation(); removeTick(t.id) }} className="text-red-500 hover:text-red-400 text-xs">×</button>
            </div>
          ))}
          {bottomLeftTicks.length === 0 && <div className="text-zinc-600 text-xs py-1">暂无刻度</div>}
        </div>
      </div>
      )}
    </div>
  )
}
