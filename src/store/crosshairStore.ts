import { create } from 'zustand'
import { defaultPreset } from '../engine/preset'
import type { CrosshairConfig, TickMark } from '../engine/types'
import { createTick, generateId, createDefaultConfig } from '../engine/types'

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

  setConfig: (config: CrosshairConfig) => void
  updateConfig: (partial: Partial<CrosshairConfig>) => void
  selectTick: (id: string | null) => void
  setScale: (s: number) => void
  setOverlayMode: (v: boolean) => void
  setSymmetricMode: (v: boolean) => void

  addTick: (axis: 'horizontal' | 'vertical', distance: number) => void
  removeTick: (id: string) => void
  updateTick: (id: string, partial: Partial<TickMark>) => void
  moveTick: (id: string, newDistance: number) => void
  duplicateTick: (id: string) => void
  loadPreset: (config: CrosshairConfig) => void

  undo: () => void
  redo: () => void
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

    setConfig: (config) => set((s) => pushHistory(s.history, s.historyIndex, config)),

    updateConfig: (partial) =>
      set((s) => {
        const newConfig = { ...s.config, ...partial }
        // when toggling top post ON, auto-create mirror ticks for all bottom ticks
        if (partial.showTopPost === true && !s.config.showTopPost) {
          const existingTops = new Set(s.config.ticks.filter((t) => t.axis === 'vertical' && t.distance < 0).map((t) => Math.abs(Math.round(t.distance))))
          const newTicks = [...s.config.ticks]
          for (const bt of s.config.ticks) {
            if (bt.axis === 'vertical' && bt.distance > 0 && !existingTops.has(Math.round(bt.distance))) {
              newTicks.push({ ...bt, id: generateId(), distance: -bt.distance })
            }
          }
          if (newTicks.length !== s.config.ticks.length) {
            newConfig.ticks = newTicks
          }
        }
        return pushHistory(s.history, s.historyIndex, newConfig)
      }),

    selectTick: (id) => set({ selectedTickId: id }),

    setScale: (scale) => set({ scale }),

    setOverlayMode: (v) => set({ overlayMode: v }),

    setSymmetricMode: (v) => set({ symmetricMode: v }),

    addTick: (axis, distance) =>
      set((s) => {
        const tick = createTick(axis, distance)
        let allTicks = [...s.config.ticks, tick]
        if (s.symmetricMode && axis === 'vertical') {
          const mirror = { ...createTick(axis, -distance), label: tick.label }
          allTicks = [...allTicks, mirror]
        }
        const newConfig = { ...s.config, ticks: allTicks }
        const { history, historyIndex, config } = pushHistory(s.history, s.historyIndex, newConfig)
        return { history, historyIndex, config, selectedTickId: tick.id }
      }),

    removeTick: (id) =>
      set((s) => {
        const ticks = s.config.ticks.filter((t) => t.id !== id)
        const newConfig = { ...s.config, ticks }
        return {
          ...pushHistory(s.history, s.historyIndex, newConfig),
          selectedTickId: s.selectedTickId === id ? null : s.selectedTickId,
        }
      }),

    updateTick: (id, partial) =>
      set((s) => {
        const ticks = updateTicks(s.config.ticks, id, partial, s.symmetricMode)
        const newConfig = { ...s.config, ticks }
        return pushHistory(s.history, s.historyIndex, newConfig)
      }),

    moveTick: (id, newDistance) =>
      set((s) => {
        const partial: Partial<TickMark> = { distance: newDistance }
        const ticks = updateTicks(s.config.ticks, id, partial, s.symmetricMode)
        const newConfig = { ...s.config, ticks }
        return pushHistory(s.history, s.historyIndex, newConfig)
      }),

    duplicateTick: (id) =>
      set((s) => {
        const orig = s.config.ticks.find((t) => t.id === id)
        if (!orig) return s
        const newTick = { ...orig, id: generateId(), distance: orig.distance + 10 }
        const ticks = [...s.config.ticks, newTick]
        const newConfig = { ...s.config, ticks }
        return { ...pushHistory(s.history, s.historyIndex, newConfig), selectedTickId: newTick.id }
      }),

    loadPreset: (config) =>
      set(() => {
        const merged = { ...createDefaultConfig(), ...config, ticks: config.ticks || [] }
        const entry: HistoryEntry = { config: structuredClone(merged) }
        return { config: merged, history: [entry], historyIndex: 0, selectedTickId: null }
      }),

    undo: () =>
      set((s) => {
        if (s.historyIndex <= 0) return s
        const newIndex = s.historyIndex - 1
        return { config: structuredClone(s.history[newIndex].config), historyIndex: newIndex }
      }),

    redo: () =>
      set((s) => {
        if (s.historyIndex >= s.history.length - 1) return s
        const newIndex = s.historyIndex + 1
        return { config: structuredClone(s.history[newIndex].config), historyIndex: newIndex }
      }),
  }
})
