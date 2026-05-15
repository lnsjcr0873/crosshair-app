import { useState } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'
import BatchAddDialog from './BatchAddDialog'

const MAX_DIST = 1000

export default function TickList() {
  const config = useCrosshairStore((s) => s.config)
  const updateConfig = useCrosshairStore((s) => s.updateConfig)
  const selectedTickId = useCrosshairStore((s) => s.selectedTickId)
  const selectedTickIds = useCrosshairStore((s) => s.selectedTickIds)
  const selectTick = useCrosshairStore((s) => s.selectTick)
  const toggleTickSelection = useCrosshairStore((s) => s.toggleTickSelection)
  const clearSelection = useCrosshairStore((s) => s.clearSelection)
  const addTick = useCrosshairStore((s) => s.addTick)
  const removeTick = useCrosshairStore((s) => s.removeTick)
  const removeTicks = useCrosshairStore((s) => s.removeTicks)

  const configList = useCrosshairStore((s) => s.configList)
  const activeIndex = useCrosshairStore((s) => s.activeIndex)
  const switchConfig = useCrosshairStore((s) => s.switchConfig)
  const newConfig = useCrosshairStore((s) => s.newConfig)
  const deleteConfig = useCrosshairStore((s) => s.deleteConfig)
  const renameConfig = useCrosshairStore((s) => s.renameConfig)

  const [renaming, setRenaming] = useState(false)
  const [nameBuf, setNameBuf] = useState('')
  const [batchAxis, setBatchAxis] = useState<'horizontal' | 'vertical' | null>(null)

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

  const handleTickClick = (e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      toggleTickSelection(id)
    } else {
      selectTick(id)
    }
  }

  const tickClass = (id: string) => `tick-item ${selectedTickIds.has(id) ? 'tick-item-active' : ''}`

  const startRename = () => {
    setNameBuf(configList[activeIndex]?.name || '')
    setRenaming(true)
  }
  const commitRename = () => {
    if (nameBuf.trim()) renameConfig(nameBuf.trim())
    setRenaming(false)
  }

  return (<>
    <div className="p-4 space-y-4 text-sm">
      {/* 配置管理 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <select
            value={activeIndex}
            onChange={(e) => switchConfig(Number(e.target.value))}
            className="input-field text-xs flex-1 mr-2"
          >
            {configList.map((e, i) => (
              <option key={i} value={i}>{e.name}</option>
            ))}
          </select>
        </div>
        {renaming ? (
          <input autoFocus value={nameBuf} onChange={(e) => setNameBuf(e.target.value)} onBlur={commitRename} onKeyDown={(e) => e.key === 'Enter' && commitRename()} className="input-field text-xs mb-2" />
        ) : (
          <div className="text-zinc-300 text-xs mb-2 cursor-pointer hover:text-white" onClick={startRename}>{configList[activeIndex]?.name || '未命名'}</div>
        )}
        <div className="flex gap-2">
          <button onClick={() => newConfig(true)} className="btn-secondary text-xs flex-1">复制</button>
          <button onClick={() => newConfig(false)} className="btn-secondary text-xs flex-1">新建</button>
          <button onClick={deleteConfig} disabled={configList.length <= 1} className="btn-danger text-xs flex-1">删除</button>
        </div>
      </div>

      {/* 开关 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
        <label className="flex items-center gap-1 text-zinc-400">
          <input type="checkbox" checked={config.showTopLine} onChange={() => updateConfig({ showTopLine: !config.showTopLine })} />
          上线
        </label>
        <label className="flex items-center gap-1 text-zinc-400">
          <input type="checkbox" checked={config.showTopTicks} onChange={() => updateConfig({ showTopTicks: !config.showTopTicks })} />
          上刻度
        </label>
        <label className="flex items-center gap-1 text-zinc-400">
          <input type="checkbox" checked={config.showBottomLine} onChange={() => updateConfig({ showBottomLine: !config.showBottomLine })} />
          下线
        </label>
        <label className="flex items-center gap-1 text-zinc-400">
          <input type="checkbox" checked={config.showBottomTicks} onChange={() => updateConfig({ showBottomTicks: !config.showBottomTicks })} />
          下刻度
        </label>
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
          <div className="flex gap-1">
            <button onClick={() => handleAdd('horizontal', hUpTicks, -1)} className="btn-add">+ 添加</button>
            <button onClick={() => setBatchAxis('horizontal')} className="btn-icon text-xs px-1" title="批量添加">⋮</button>
          </div>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {hUpTicks.map((t) => (
            <div key={t.id} onClick={(e) => handleTickClick(e, t.id)} className={tickClass(t.id)}>
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
          <div className="flex gap-1">
            <button onClick={() => handleAdd('horizontal', hDownTicks, 1)} className="btn-add">+ 添加</button>
          </div>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {hDownTicks.map((t) => (
            <div key={t.id} onClick={(e) => handleTickClick(e, t.id)} className={tickClass(t.id)}>
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
            <div className="flex gap-1">
              <button onClick={() => handleAdd('vertical', topTicks, 1)} className="btn-add">+ 添加</button>
            </div>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {topTicks.map((t) => (
              <div key={t.id} onClick={(e) => handleTickClick(e, t.id)} className={tickClass(t.id)}>
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
          <div className="flex gap-1">
            <button onClick={() => handleAdd('vertical', bottomRightTicks, 1)} className="btn-add">+ 添加</button>
            <button onClick={() => setBatchAxis('vertical')} className="btn-icon text-xs px-1" title="批量添加">⋮</button>
          </div>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {bottomRightTicks.map((t) => (
            <div key={t.id} onClick={(e) => handleTickClick(e, t.id)} className={tickClass(t.id)}>
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
          <div className="flex gap-1">
            <button onClick={() => handleAdd('vertical', bottomLeftTicks, -1)} className="btn-add">+ 添加</button>
          </div>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {bottomLeftTicks.map((t) => (
            <div key={t.id} onClick={(e) => handleTickClick(e, t.id)} className={tickClass(t.id)}>
              <span className="text-zinc-300 w-14">{`D${t.distance}`}</span>
              <span className="text-zinc-400 flex-1">{t.label || '—'}</span>
              <button onClick={(e) => { e.stopPropagation(); removeTick(t.id) }} className="text-red-500 hover:text-red-400 text-xs">×</button>
            </div>
          ))}
          {bottomLeftTicks.length === 0 && <div className="text-zinc-600 text-xs py-1">暂无刻度</div>}
        </div>
      </div>
      )}
      {selectedTickIds.size > 1 && (
        <div className="flex items-center gap-2 pt-1 border-t border-zinc-700">
          <span className="text-zinc-400 text-xs">{selectedTickIds.size} 个已选中</span>
          <button onClick={() => removeTicks([...selectedTickIds])} className="btn-danger text-xs">删除选中</button>
          <button onClick={clearSelection} className="btn-secondary text-xs">取消选择</button>
        </div>
      )}
    </div>
    {batchAxis && <BatchAddDialog axis={batchAxis} onClose={() => setBatchAxis(null)} />}
  </>)
}
