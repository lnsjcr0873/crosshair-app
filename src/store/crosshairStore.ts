import { create } from 'zustand'
import { defaultPreset } from '../engine/preset'
import type { CrosshairConfig, TickMark, ConfigEntry } from '../engine/types'
import { createTick, generateId, createDefaultConfig, DEFAULT_HOTKEYS } from '../engine/types'

interface HistoryEntry {
  config: CrosshairConfig
}

interface CrosshairStore {
  config: CrosshairConfig
  selectedTickId: string | null
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
  setScale: (s: number) => void
  setOverlayMode: (v: boolean) => void
  setSymmetricMode: (v: boolean) => void

  addTick: (axis: 'horizontal' | 'vertical', distance: number, direction?: 1 | -1) => void
  removeTick: (id: string) => void
  updateTick: (id: string, partial: Partial<TickMark>) => void
  moveTick: (id: string, newDistance: number) => void
  duplicateTick: (id: string) => void
  loadPreset: (config: CrosshairConfig) => void

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

    selectTick: (id) => set({ selectedTickId: id }),

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
        return { history, historyIndex, config: config, selectedTickId: tick.id, configList: syncListEntry(s, config) }
      }),

    removeTick: (id) =>
      set((s) => {
        const ticks = s.config.ticks.filter((t) => t.id !== id)
        const newConfig = { ...s.config, ticks }
        const result = pushHistory(s.history, s.historyIndex, newConfig)
        return {
          ...result,
          selectedTickId: s.selectedTickId === id ? null : s.selectedTickId,
          configList: syncListEntry(s, result.config),
        }
      }),

    updateTick: (id, partial) =>
      set((s) => {
        const ticks = updateTicks(s.config.ticks, id, partial, s.symmetricMode)
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

    loadPreset: (config) =>
      set(() => {
        const merged = { ...createDefaultConfig(), ...config, ticks: config.ticks || [] }
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
  }
})
