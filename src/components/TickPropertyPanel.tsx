import { useCrosshairStore } from '../store/crosshairStore'

export default function TickPropertyPanel() {
  const selectedTickId = useCrosshairStore((s) => s.selectedTickId)
  const config = useCrosshairStore((s) => s.config)
  const updateTick = useCrosshairStore((s) => s.updateTick)
  const removeTick = useCrosshairStore((s) => s.removeTick)
  const duplicateTick = useCrosshairStore((s) => s.duplicateTick)

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
        <input
          type="number"
          value={tick.distance}
          onChange={(e) => updateTick(tick.id, { distance: Number(e.target.value) })}
          className="input-field"
        />
      </PropRow>

      <PropRow label="线长">
        <input
          type="range"
          min={2}
          max={40}
          value={tick.lineLength}
          onChange={(e) => updateTick(tick.id, { lineLength: Number(e.target.value) })}
          className="w-full"
        />
        <span className="text-zinc-400 w-8 text-right">{tick.lineLength}</span>
      </PropRow>

      <PropRow label="线宽">
        <input
          type="range"
          min={1}
          max={6}
          step={0.5}
          value={tick.lineWidth}
          onChange={(e) => updateTick(tick.id, { lineWidth: Number(e.target.value) })}
          className="w-full"
        />
        <span className="text-zinc-400 w-8 text-right">{tick.lineWidth}</span>
      </PropRow>

      <PropRow label="数值">
        <input
          type="text"
          value={tick.label}
          onChange={(e) => updateTick(tick.id, { label: e.target.value })}
          className="input-field"
        />
      </PropRow>

      <PropRow label="字号">
        <input
          type="range"
          min={8}
          max={24}
          value={tick.fontSize}
          onChange={(e) => updateTick(tick.id, { fontSize: Number(e.target.value) })}
          className="w-full"
        />
        <span className="text-zinc-400 w-8 text-right">{tick.fontSize}</span>
      </PropRow>

      <PropRow label="偏移 X">
        <input
          type="range"
          min={-80}
          max={80}
          value={tick.labelOffsetX}
          onChange={(e) => updateTick(tick.id, { labelOffsetX: Number(e.target.value) })}
          className="w-full"
        />
        <span className="text-zinc-400 w-8 text-right">{tick.labelOffsetX}</span>
      </PropRow>

      <PropRow label="偏移 Y">
        <input
          type="range"
          min={-80}
          max={80}
          value={tick.labelOffsetY}
          onChange={(e) => updateTick(tick.id, { labelOffsetY: Number(e.target.value) })}
          className="w-full"
        />
        <span className="text-zinc-400 w-8 text-right">{tick.labelOffsetY}</span>
      </PropRow>

      <PropRow label="颜色">
        <input
          type="color"
          value={tick.color}
          onChange={(e) => updateTick(tick.id, { color: e.target.value })}
          className="w-10 h-8 bg-transparent border-0 cursor-pointer"
        />
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
