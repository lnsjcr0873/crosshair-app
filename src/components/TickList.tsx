import { useCrosshairStore } from '../store/crosshairStore'

const MAX_DIST = 1000

export default function TickList() {
  const config = useCrosshairStore((s) => s.config)
  const updateConfig = useCrosshairStore((s) => s.updateConfig)
  const selectedTickId = useCrosshairStore((s) => s.selectedTickId)
  const selectTick = useCrosshairStore((s) => s.selectTick)
  const addTick = useCrosshairStore((s) => s.addTick)
  const removeTick = useCrosshairStore((s) => s.removeTick)

  const horizontalTicks = config.ticks.filter((t) => t.axis === 'horizontal')
  const topTicks = config.ticks.filter((t) => t.axis === 'vertical' && t.distance < 0)
  const bottomTicks = config.ticks.filter((t) => t.axis === 'vertical' && t.distance >= 0)

  const handleAddHorizontal = () => {
    const last = horizontalTicks[horizontalTicks.length - 1]
    const dist = last ? Math.min(last.distance + 40, MAX_DIST) : 30
    addTick('horizontal', dist)
  }

  const handleAddTop = () => {
    const last = topTicks[topTicks.length - 1]
    const dist = last ? Math.max(last.distance - 40, -MAX_DIST) : -30
    addTick('vertical', dist)
  }

  const handleAddBottom = () => {
    const last = bottomTicks[bottomTicks.length - 1]
    const dist = last ? Math.min(last.distance + 40, MAX_DIST) : 30
    addTick('vertical', dist)
  }

  const lastHorizontal = horizontalTicks[horizontalTicks.length - 1]

  return (
    <div className="p-4 space-y-4 text-sm">
      {/* 上立柱 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">上立柱</h3>
          <button
            onClick={() => updateConfig({ showTopPost: !config.showTopPost })}
            className={`text-xs px-2 py-0.5 rounded border ${config.showTopPost ? 'bg-green-700 border-green-500 text-white' : 'bg-zinc-700 border-zinc-500 text-zinc-400'}`}
          >
            {config.showTopPost ? 'ON' : 'OFF'}
          </button>
        </div>
        {config.showTopPost && (
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

      {/* 水平刻度 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">水平刻度</h3>
          <button onClick={handleAddHorizontal} className="btn-add">
            + 添加
          </button>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {horizontalTicks.map((t) => (
            <div
              key={t.id}
              onClick={() => selectTick(t.id)}
              className={`tick-item ${selectedTickId === t.id ? 'tick-item-active' : ''}`}
            >
              <span className="text-zinc-300 w-16">
                {t.distance > 0 ? `R${t.distance}` : `L${Math.abs(t.distance)}`}
              </span>
              <span className="text-zinc-400 flex-1">{t.label || '—'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeTick(t.id)
                }}
                className="text-red-500 hover:text-red-400 text-xs"
              >
                ×
              </button>
            </div>
          ))}
          {horizontalTicks.length === 0 && (
            <div className="text-zinc-600 text-xs py-1">暂无刻度</div>
          )}
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => {
              if (lastHorizontal) {
                const neg = lastHorizontal.distance > 0 ? -lastHorizontal.distance : 0
                if (neg !== 0 && !horizontalTicks.some((t) => Math.abs(t.distance - neg) < 2)) addTick('horizontal', neg)
              }
            }}
            className="btn-secondary text-xs"
            disabled={!lastHorizontal}
          >
            对称添加
          </button>
        </div>
      </div>

      {/* 上立柱刻度 */}
      {config.showTopPost && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-semibold">上立柱刻度</h3>
            <button onClick={handleAddTop} className="btn-add">
              + 添加
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {topTicks.map((t) => (
              <div
                key={t.id}
                onClick={() => selectTick(t.id)}
                className={`tick-item ${selectedTickId === t.id ? 'tick-item-active' : ''}`}
              >
                <span className="text-zinc-300 w-16">{`U${Math.abs(t.distance)}`}</span>
                <span className="text-zinc-400 flex-1">{t.label || '—'}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeTick(t.id) }}
                  className="text-red-500 hover:text-red-400 text-xs"
                >×</button>
              </div>
            ))}
            {topTicks.length === 0 && (
              <div className="text-zinc-600 text-xs py-1">暂无刻度</div>
            )}
          </div>
        </div>
      )}

      {/* 下立柱刻度 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-white font-semibold">下立柱刻度</h3>
          <button onClick={handleAddBottom} className="btn-add">
            + 添加
          </button>
        </div>
        <div className="space-y-1 max-h-40 overflow-y-auto">
          {bottomTicks.map((t) => (
            <div
              key={t.id}
              onClick={() => selectTick(t.id)}
              className={`tick-item ${selectedTickId === t.id ? 'tick-item-active' : ''}`}
            >
              <span className="text-zinc-300 w-16">{`D${t.distance}`}</span>
              <span className="text-zinc-400 flex-1">{t.label || '—'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); removeTick(t.id) }}
                className="text-red-500 hover:text-red-400 text-xs"
              >×</button>
            </div>
          ))}
          {bottomTicks.length === 0 && (
            <div className="text-zinc-600 text-xs py-1">暂无刻度</div>
          )}
        </div>
      </div>
    </div>
  )
}
