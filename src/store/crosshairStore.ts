import { create } from 'zustand'
import { defaultPreset } from '../engine/preset'
import type { CrosshairConfig, TickMark, ConfigEntry, FissionConfig } from '../engine/types'
import { createTick, generateId, createDefaultConfig, DEFAULT_HOTKEYS, defaultFissionConfig } from '../engine/types'

interface HistoryEntry {
  config: CrosshairConfig
}

interface CrosshairStore {
  config: CrosshairConfig
  selectedTickId: string | null
  selectedTickIds: Set<string>
  scale: number
  overlayMode: boolean
  symmetricMode: boolean
  history: HistoryEntry[]
  historyIndex: number
  configList: ConfigEntry[]
  activeIndex: number
  hotkeys: Record<string, string>

  setConfig: (config: CrosshairConfig) => void
  updateConfig: (partial: Partial<CrosshairConfig>) => void
  selectTick: (id: string | null) => void
  toggleTickSelection: (id: string) => void
  clearSelection: () => void
  setScale: (s: number) => void
  setOverlayMode: (v: boolean) => void
  setSymmetricMode: (v: boolean) => void

  addTick: (axis: 'horizontal' | 'vertical', distance: number, direction?: 1 | -1) => void
  addTicks: (ticks: { axis: 'horizontal' | 'vertical'; distance: number; direction?: 1 | -1; label?: string }[], symmetric?: boolean) => void
  removeTick: (id: string) => void
  removeTicks: (ids: string[]) => void
  updateTick: (id: string, partial: Partial<TickMark>) => void
  moveTick: (id: string, newDistance: number) => void
  duplicateTick: (id: string) => void
  mirrorTick: (id: string) => void
  batchUpdateTicks: (ids: string[], partial: Partial<TickMark>) => void
  loadPreset: (config: CrosshairConfig) => void
  fissionSplit: () => void
  clearGeneratedTicks: () => void

  undo: () => void
  redo: () => void

  // multi-config
  newConfig: (copyCurrent: boolean) => void
  deleteConfig: () => void
  renameConfig: (name: string) => void
  switchConfig: (index: number) => void
  updateHotkeys: (key: string, value: string) => void
  resetHotkeys: () => void
}

function pushHistory(
  history: HistoryEntry[],
  index: number,
  config: CrosshairConfig,
): { history: HistoryEntry[]; historyIndex: number; config: CrosshairConfig } {
  const entry: HistoryEntry = { config: structuredClone(config) }
  const newHistory = history.slice(0, index + 1)
  newHistory.push(entry)
  if (newHistory.length > 50) newHistory.shift()
  return { history: newHistory, historyIndex: newHistory.length - 1, config }
}

function findSymmetric(ticks: TickMark[], id: string): TickMark | undefined {
  const t = ticks.find((x) => x.id === id)
  if (!t) return undefined
  return ticks.find((x) => x.axis === t.axis && x.id !== id && Math.abs(x.distance + t.distance) < 2)
}

function updateTicks(ticks: TickMark[], id: string, partial: Partial<TickMark>, symmetric: boolean): TickMark[] {
  let result = ticks.map((t) => (t.id === id ? { ...t, ...partial } : t))
  if (symmetric) {
    const sym = findSymmetric(ticks, id)
    if (sym) {
      const p = 'distance' in partial ? { ...partial, distance: -(partial as any).distance } : partial
      result = result.map((t) => (t.id === sym.id ? { ...t, ...p } : t))
    }
  }
  return result
}

function syncListEntry(s: CrosshairStore, newConfig: CrosshairConfig) {
  const list = [...s.configList]
  list[s.activeIndex] = { ...list[s.activeIndex], config: newConfig }
  return list
}

export const useCrosshairStore = create<CrosshairStore>((set, get) => {
  const initial = defaultPreset()
  const initialEntry: HistoryEntry = { config: structuredClone(initial) }

  return {
    config: initial,
    selectedTickId: null,
    selectedTickIds: new Set(),
    scale: 1,
    overlayMode: false,
    symmetricMode: true,
    history: [initialEntry],
    historyIndex: 0,
    configList: [{ name: '默认准星', config: initial }],
    activeIndex: 0,
    hotkeys: { ...DEFAULT_HOTKEYS },

    setConfig: (config) => set((s) => ({
      ...pushHistory(s.history, s.historyIndex, config),
      configList: syncListEntry(s, config),
    })),

    updateConfig: (partial) =>
      set((s) => {
        const newConfig = { ...s.config, ...partial }
        return {
          ...pushHistory(s.history, s.historyIndex, newConfig),
          configList: syncListEntry(s, newConfig),
        }
      }),

    selectTick: (id) => set({ selectedTickId: id, selectedTickIds: id ? new Set([id]) : new Set() }),

    toggleTickSelection: (id) =>
      set((s) => {
        const next = new Set(s.selectedTickIds)
        if (next.has(id)) next.delete(id); else next.add(id)
        return { selectedTickIds: next, selectedTickId: next.size === 1 ? next.values().next().value : null }
      }),

    clearSelection: () => set({ selectedTickIds: new Set(), selectedTickId: null }),

    setScale: (scale) => set({ scale }),

    setOverlayMode: (v) => set({ overlayMode: v }),

    setSymmetricMode: (v) => set({ symmetricMode: v }),

    addTick: (axis, distance, direction) =>
      set((s) => {
        const tick = createTick(axis, distance, direction)
        let allTicks = [...s.config.ticks, tick]
        if (s.symmetricMode && axis === 'vertical') {
          const mirror = { ...createTick(axis, -distance, direction), label: tick.label }
          allTicks = [...allTicks, mirror]
        }
        const newConfig = { ...s.config, ticks: allTicks }
        const { history, historyIndex, config } = pushHistory(s.history, s.historyIndex, newConfig)
        return { history, historyIndex, config: config, selectedTickId: tick.id, selectedTickIds: new Set([tick.id]), configList: syncListEntry(s, config) }
      }),

    addTicks: (ticks, symmetric) =>
      set((s) => {
        const created: TickMark[] = []
        for (const t of ticks) {
          const tick = createTick(t.axis, t.distance, t.direction)
          if (t.label) tick.label = t.label
          created.push(tick)
          if (symmetric && t.axis === 'horizontal') {
            const m = createTick(t.axis, -t.distance, t.direction)
            if (t.label) m.label = t.label
            created.push(m)
          }
          if (symmetric && t.axis === 'vertical') {
            const m = createTick(t.axis, -t.distance, t.direction)
            if (t.label) m.label = t.label
            created.push(m)
          }
        }
        const allTicks = [...s.config.ticks, ...created]
        const newConfig = { ...s.config, ticks: allTicks }
        const { history, historyIndex, config } = pushHistory(s.history, s.historyIndex, newConfig)
        const firstId = created[0]?.id ?? null
        return { history, historyIndex, config, selectedTickId: firstId, selectedTickIds: firstId ? new Set([firstId]) : new Set(), configList: syncListEntry(s, config) }
      }),

    removeTick: (id) =>
      set((s) => {
        const tick = s.config.ticks.find((t) => t.id === id)
        const extraId = tick?.mirrorId
        const ticks = s.config.ticks.filter((t) => t.id !== id && t.id !== extraId)
        const newConfig = { ...s.config, ticks }
        const result = pushHistory(s.history, s.historyIndex, newConfig)
        return {
          ...result,
          selectedTickId: s.selectedTickId === id ? null : s.selectedTickId,
          selectedTickIds: s.selectedTickIds.has(id) ? new Set([...s.selectedTickIds].filter(x => x !== id)) : s.selectedTickIds,
          configList: syncListEntry(s, result.config),
        }
      }),

    removeTicks: (ids) =>
      set((s) => {
        const idSet = new Set(ids)
        // also remove mirrored ticks
        for (const tid of ids) {
          const t = s.config.ticks.find((x) => x.id === tid)
          if (t?.mirrorId) idSet.add(t.mirrorId)
        }
        const ticks = s.config.ticks.filter((t) => !idSet.has(t.id))
        const newConfig = { ...s.config, ticks }
        const result = pushHistory(s.history, s.historyIndex, newConfig)
        return {
          ...result,
          selectedTickId: null,
          selectedTickIds: new Set(),
          configList: syncListEntry(s, result.config),
        }
      }),

    updateTick: (id, partial) =>
      set((s) => {
        let ticks = updateTicks(s.config.ticks, id, partial, s.symmetricMode)
        const tick = ticks.find((t) => t.id === id)
        if (tick?.mirrorId) {
          const mirrorPartial: Partial<TickMark> = { ...partial }
          if ('distance' in partial) mirrorPartial.distance = -(partial.distance as number)
          ticks = ticks.map((t) => (t.id === tick.mirrorId ? { ...t, ...mirrorPartial } : t))
        }
        const newConfig = { ...s.config, ticks }
        const result = pushHistory(s.history, s.historyIndex, newConfig)
        return { ...result, configList: syncListEntry(s, result.config) }
      }),

    batchUpdateTicks: (ids, partial) =>
      set((s) => {
        const idSet = new Set(ids)
        const ticks = s.config.ticks.map((t) => idSet.has(t.id) ? { ...t, ...partial } : t)
        const newConfig = { ...s.config, ticks }
        const result = pushHistory(s.history, s.historyIndex, newConfig)
        return { ...result, configList: syncListEntry(s, result.config) }
      }),

    moveTick: (id, newDistance) =>
      set((s) => {
        const partial: Partial<TickMark> = { distance: newDistance }
        const ticks = updateTicks(s.config.ticks, id, partial, s.symmetricMode)
        const newConfig = { ...s.config, ticks }
        const result = pushHistory(s.history, s.historyIndex, newConfig)
        return { ...result, configList: syncListEntry(s, result.config) }
      }),

    duplicateTick: (id) =>
      set((s) => {
        const orig = s.config.ticks.find((t) => t.id === id)
        if (!orig) return s
        const newTick = { ...orig, id: generateId(), distance: orig.distance + 10 }
        const ticks = [...s.config.ticks, newTick]
        const newConfig = { ...s.config, ticks }
        const result = { ...pushHistory(s.history, s.historyIndex, newConfig), selectedTickId: newTick.id }
        return { ...result, configList: syncListEntry(s, result.config) }
      }),

    mirrorTick: (id) =>
      set((s) => {
        const orig = s.config.ticks.find((t) => t.id === id)
        if (!orig) return s
        // Toggle off: if already mirrored, remove the mirror
        if (orig.mirrorId) {
          const ticks = s.config.ticks.filter((t) => t.id !== orig.mirrorId)
          const edited = ticks.map((t) => (t.id === id ? { ...t, mirrorId: undefined } : t))
          const newConfig = { ...s.config, ticks: edited }
          const result = pushHistory(s.history, s.historyIndex, newConfig)
          return { ...result, configList: syncListEntry(s, result.config) }
        }
        // Toggle on: create mirror
        const mirror = { ...orig, id: generateId(), distance: -orig.distance, mirrorId: undefined }
        const edited = [...s.config.ticks.map((t) => (t.id === id ? { ...t, mirrorId: mirror.id } : t)), mirror]
        const newConfig = { ...s.config, ticks: edited }
        const result = pushHistory(s.history, s.historyIndex, newConfig)
        return { ...result, configList: syncListEntry(s, result.config) }
      }),

    loadPreset: (config) =>
      set(() => {
        const merged = { ...createDefaultConfig(), ...config, ticks: config.ticks || [] }
        // backward compat: old presets used showTopPost instead of showTopLine + showTopTicks
        if ('showTopPost' in config) {
          merged.showTopLine = (config as any).showTopPost as boolean
          merged.showTopTicks = (config as any).showTopPost as boolean
        }
        const entry: HistoryEntry = { config: structuredClone(merged) }
        const list: ConfigEntry[] = [{ name: merged.name || '预设', config: merged }]
        return { config: merged, history: [entry], historyIndex: 0, selectedTickId: null, configList: list, activeIndex: 0 }
      }),

    undo: () =>
      set((s) => {
        if (s.historyIndex <= 0) return s
        const newIndex = s.historyIndex - 1
        const cfg = structuredClone(s.history[newIndex].config)
        return { config: cfg, historyIndex: newIndex, configList: syncListEntry(s, cfg) }
      }),

    redo: () =>
      set((s) => {
        if (s.historyIndex >= s.history.length - 1) return s
        const newIndex = s.historyIndex + 1
        const cfg = structuredClone(s.history[newIndex].config)
        return { config: cfg, historyIndex: newIndex, configList: syncListEntry(s, cfg) }
      }),

    // multi-config
    newConfig: (copyCurrent) =>
      set((s) => {
        const cfg = copyCurrent ? structuredClone(s.config) : createDefaultConfig()
        const entry: ConfigEntry = { name: cfg.name || '新配置', config: cfg }
        const list = [...s.configList, entry]
        const idx = list.length - 1
        const histEntry: HistoryEntry = { config: structuredClone(cfg) }
        return { configList: list, activeIndex: idx, config: cfg, history: [histEntry], historyIndex: 0, selectedTickId: null }
      }),

    deleteConfig: () =>
      set((s) => {
        if (s.configList.length <= 1) return s
        const list = s.configList.filter((_, i) => i !== s.activeIndex)
        const idx = Math.min(s.activeIndex, list.length - 1)
        const cfg = structuredClone(list[idx].config)
        const histEntry: HistoryEntry = { config: structuredClone(cfg) }
        return { configList: list, activeIndex: idx, config: cfg, history: [histEntry], historyIndex: 0, selectedTickId: null }
      }),

    renameConfig: (name) =>
      set((s) => {
        const list = [...s.configList]
        list[s.activeIndex] = { ...list[s.activeIndex], name }
        return { configList: list }
      }),

    switchConfig: (index) =>
      set((s) => {
        if (index < 0 || index >= s.configList.length) return s
        const cfg = structuredClone(s.configList[index].config)
        const histEntry: HistoryEntry = { config: structuredClone(cfg) }
        return { activeIndex: index, config: cfg, history: [histEntry], historyIndex: 0, selectedTickId: null }
      }),

    updateHotkeys: (key, value) =>
      set((s) => ({ hotkeys: { ...s.hotkeys, [key]: value } })),

    resetHotkeys: () =>
      set({ hotkeys: { ...DEFAULT_HOTKEYS } }),

    fissionSplit: () =>
      set((s) => {
        const fc = s.config.fissionConfig ?? defaultFissionConfig()
        const visible = s.config.ticks.filter((t) => {
          if (!t.visible) return false
          if (t.axis === 'vertical' && t.distance < 0 && !s.config.showTopTicks) return false
          if (t.axis === 'vertical' && t.distance >= 0 && !s.config.showBottomTicks) return false
          if (t.axis === 'horizontal' && t.distance < 0 && !s.config.showLeftTicks) return false
          if (t.axis === 'horizontal' && t.distance > 0 && !s.config.showRightTicks) return false
          return true
        })

        const groups = new Map<string, TickMark[]>()
        for (const t of visible) {
          const ds = t.distance < 0 ? 'neg' : 'pos'
          const key = fc.groupMode === 'by-direction' ? `${t.axis}:${ds}:${t.direction}` : `${t.axis}:${ds}`
          if (!groups.has(key)) groups.set(key, [])
          groups.get(key)!.push(t)
        }

        const created: TickMark[] = []

        for (const ticks of groups.values()) {
          const sorted = [...ticks].sort((a, b) => a.distance - b.distance)
          const deduped: TickMark[] = []
          for (const t of sorted) {
            if (deduped.length === 0 || Math.abs(t.distance - deduped[deduped.length - 1].distance) > 0.01) {
              deduped.push(t)
            }
          }
          if (deduped.length < 2) continue

          for (let i = 0; i < deduped.length - 1; i++) {
            const a = deduped[i]
            const b = deduped[i + 1]
            const newDist = Math.round(((a.distance + b.distance) / 2) * 100) / 100

            const aNum = parseFloat(a.label)
            const bNum = parseFloat(b.label)
            const newLabel = !isNaN(aNum) && !isNaN(bNum) ? String((aNum + bNum) / 2) : String(Math.round(newDist))

            const src = fc.inheritFrom === 'next' ? b : a
            const dir = fc.direction === 'inherit' ? src.direction : (fc.direction as 1 | -1)

            const tick = createTick(a.axis, newDist, dir)
            tick.label = newLabel
            if (fc.inheritFrom === 'uniform') {
              tick.lineLength = fc.lineLength
              tick.lineWidth = fc.lineWidth
              tick.color = fc.color
              tick.fontSize = fc.fontSize
            } else {
              tick.lineLength = src.lineLength
              tick.lineWidth = src.lineWidth
              tick.color = src.color
              tick.fontSize = src.fontSize
            }
            if (fc.markGenerated) tick.generated = true

            created.push(tick)
            if (fc.symmetric) {
              const mirror = { ...tick, id: generateId(), distance: -newDist, mirrorId: undefined, generated: fc.markGenerated }
              created.push(mirror)
            }
          }
        }

        if (created.length === 0) return s

        const allTicks = [...s.config.ticks, ...created]
        const newConfig = { ...s.config, ticks: allTicks }
        const result = pushHistory(s.history, s.historyIndex, newConfig)
        return { ...result, configList: syncListEntry(s, result.config) }
      }),

    clearGeneratedTicks: () =>
      set((s) => {
        const ticks = s.config.ticks.filter((t) => !t.generated)
        const newConfig = { ...s.config, ticks }
        const result = pushHistory(s.history, s.historyIndex, newConfig)
        return { ...result, configList: syncListEntry(s, result.config) }
      }),
  }
})
