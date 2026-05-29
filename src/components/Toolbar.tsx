import { useState } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'
import { vssStylePreset, simplePreset } from '../engine/preset'
import { exportPng, exportSvg, savePreset, loadPresetFromFile } from '../engine/actions'
import SettingsPanel from './SettingsPanel'
import FissionSettingsPanel from './FissionSettingsPanel'

export default function Toolbar() {
  const [showSettings, setShowSettings] = useState(false)
  const [showFission, setShowFission] = useState(false)
  const config = useCrosshairStore((s) => s.config)
  const updateConfig = useCrosshairStore((s) => s.updateConfig)
  const setScale = useCrosshairStore((s) => s.setScale)
  const loadPreset = useCrosshairStore((s) => s.loadPreset)
  const scale = useCrosshairStore((s) => s.scale)
  const symmetricMode = useCrosshairStore((s) => s.symmetricMode)
  const setSymmetricMode = useCrosshairStore((s) => s.setSymmetricMode)
  const undo = useCrosshairStore((s) => s.undo)
  const redo = useCrosshairStore((s) => s.redo)
  const historyIndex = useCrosshairStore((s) => s.historyIndex)
  const history = useCrosshairStore((s) => s.history)
  const fissionSplit = useCrosshairStore((s) => s.fissionSplit)
  const clearGeneratedTicks = useCrosshairStore((s) => s.clearGeneratedTicks)
  const hasGenerated = config.ticks.some((t) => t.generated)
  const adjustLabels = useCrosshairStore((s) => s.adjustLabels)
  const adjustLinked = useCrosshairStore((s) => s.adjustLinked)
  const setAdjustLinked = useCrosshairStore((s) => s.setAdjustLinked)

  const handleExportPng = () => exportPng(config)
  const handleExportSvg = () => exportSvg(config)
  const handleSave = () => savePreset(config)
  const handleLoad = async () => {
    try {
      const result = await loadPresetFromFile()
      if (result) loadPreset(result)
    } catch { alert('无效的预设文件') }
  }

  return (<>
    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800 border-b border-zinc-700 flex-wrap">
      <span className="text-white font-semibold text-sm mr-2">准星刻度绘制</span>

      <div className="flex gap-1">
        <button onClick={undo} disabled={historyIndex <= 0} className="btn-icon" title="撤销 (Ctrl+Z)">
          ↩
        </button>
        <button onClick={redo} disabled={historyIndex >= history.length - 1} className="btn-icon" title="重做 (Ctrl+Y)">
          ↪
        </button>
      </div>

      <div className="w-px h-5 bg-zinc-600 mx-1" />

      <button onClick={() => loadPreset(vssStylePreset())} className="btn-secondary text-xs">
        VSS 风格
      </button>
      <button onClick={() => loadPreset(simplePreset())} className="btn-secondary text-xs">
        简洁
      </button>

      <div className="w-px h-5 bg-zinc-600 mx-1" />

      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span>缩放</span>
        <input
          type="range"
          min={0.2}
          max={5}
          step={0.1}
          value={scale}
          onChange={(e) => setScale(Number(e.target.value))}
          className="w-20"
        />
        <span className="text-zinc-500 w-8 text-right">{scale.toFixed(1)}</span>
        <button onClick={() => setScale(1)} className="text-zinc-500 hover:text-white text-xs px-1" title="缩放到 1.0">默认</button>
      </div>

      <div className="w-px h-5 bg-zinc-600 mx-1" />

      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span>颜色</span>
        <input
          type="color"
          value={config.mainColor}
          onChange={(e) => updateConfig({ mainColor: e.target.value })}
          className="w-8 h-6 bg-transparent border-0 cursor-pointer"
        />
      </div>

      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span>透明度</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={config.mainAlpha}
          onChange={(e) => updateConfig({ mainAlpha: Number(e.target.value) })}
          className="w-16"
        />
        <span className="text-zinc-500 w-6">{Math.round(config.mainAlpha * 100)}%</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span>线宽</span>
        <input
          type="range"
          min={0.1}
          max={6}
          step={0.1}
          value={config.mainLineWidth}
          onChange={(e) => updateConfig({ mainLineWidth: Number(e.target.value) })}
          className="w-16"
        />
        <span className="text-zinc-500 w-8 text-right">{config.mainLineWidth.toFixed(1)}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span>缺口</span>
        <input
          type="range"
          min={0}
          max={60}
          value={config.centerGap}
          onChange={(e) => updateConfig({ centerGap: Number(e.target.value) })}
          className="w-16"
        />
      </div>

      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span>水平长</span>
        <input
          type="range"
          min={60}
          max={800}
          value={config.horizontalLineLength}
          onChange={(e) => updateConfig({ horizontalLineLength: Number(e.target.value) })}
          className="w-16"
        />
        <span className="text-zinc-500 w-6">{config.horizontalLineLength}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span>垂直长</span>
        <input
          type="range"
          min={60}
          max={800}
          value={config.verticalLineLength}
          onChange={(e) => updateConfig({ verticalLineLength: Number(e.target.value) })}
          className="w-16"
        />
        <span className="text-zinc-500 w-6">{config.verticalLineLength}</span>
      </div>

      <div className="flex items-center gap-1 text-xs text-zinc-400">
        <span>上柱长</span>
        <input
          type="range"
          min={60}
          max={400}
          value={config.topPostLength}
          onChange={(e) => updateConfig({ topPostLength: Number(e.target.value) })}
          className="w-16"
        />
        <span className="text-zinc-500 w-6">{config.topPostLength}</span>
      </div>

      <button
        onClick={() => setSymmetricMode(!symmetricMode)}
        className={`text-xs px-2 py-1 rounded border ${symmetricMode ? 'bg-green-700 border-green-500 text-white' : 'bg-zinc-700 border-zinc-500 text-zinc-400'}`}
        title="同步编辑水平刻度的对称侧"
      >
        对称 {symmetricMode ? 'ON' : 'OFF'}
      </button>

      <div className="w-px h-5 bg-zinc-600 mx-1" />

      <button onClick={() => adjustLabels(-1)} className="btn-secondary text-xs" title="标签 -1 (Ctrl+Shift+,)">
        -1
      </button>
      <button onClick={() => adjustLabels(1)} className="btn-secondary text-xs" title="标签 +1 (Ctrl+Shift+.)">
        +1
      </button>
      <button
        onClick={() => setAdjustLinked(!adjustLinked)}
        className={`text-xs px-2 py-1 rounded border ${adjustLinked ? 'bg-green-700 border-green-500 text-white' : 'bg-zinc-700 border-zinc-500 text-zinc-400'}`}
        title="全局联动调整"
      >
        {adjustLinked ? '🔗' : '⊘'}
      </button>

      <div className="w-px h-5 bg-zinc-600 mx-1" />

      <button onClick={handleExportPng} className="btn-primary text-xs">
        导出 PNG
      </button>
      <button onClick={handleExportSvg} className="btn-secondary text-xs">
        导出 SVG
      </button>
      <button onClick={handleSave} className="btn-secondary text-xs">
        保存预设
      </button>
      <button onClick={handleLoad} className="btn-secondary text-xs">
        加载预设
      </button>

      <div className="w-px h-5 bg-zinc-600 mx-1" />

      <button onClick={() => fissionSplit()} className="btn-secondary text-xs" title="刻度裂变 (Ctrl+Shift+F)">
        ⚡ 裂变
      </button>
      {hasGenerated && (
        <button onClick={() => clearGeneratedTicks()} className="btn-danger text-xs">
          清除裂变刻度
        </button>
      )}

      <button onClick={() => setShowFission(!showFission)} className="btn-icon text-xs" title="裂变设置">
        ⚙
      </button>

      <button onClick={() => setShowSettings(!showSettings)} className="btn-icon text-base" title="快捷键设置">
        ⚙
      </button>
    </div>
    {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    {showFission && <FissionSettingsPanel onClose={() => setShowFission(false)} />}
  </>)
}
