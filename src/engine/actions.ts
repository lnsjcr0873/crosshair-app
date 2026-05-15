import { renderCrosshair } from './renderer'
import type { CrosshairConfig } from './types'
import { isTauri, saveFileDialog, openFileDialog, writeTextFile, writeBinaryFile, readTextFile } from './tauri'

export async function exportPng(config: CrosshairConfig) {
  const canvas = document.createElement('canvas')
  const size = 512
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  renderCrosshair(ctx, config, size, size, 1)
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) return
  const name = `${config.name || 'crosshair'}.png`
  if (isTauri()) {
    const path = await saveFileDialog(name, [{ name: 'PNG Image', extensions: ['png'] }])
    if (!path) return
    const buf = await blob.arrayBuffer()
    await writeBinaryFile(path, new Uint8Array(buf))
  } else {
    const link = document.createElement('a')
    link.download = name; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
  }
}

export function generateSvg(config: CrosshairConfig): string {
  const w = 512, h = 512, cx = w / 2, cy = h / 2
  const lines: string[] = []
  const esc = (s: string) => s.replace(/"/g, "'")
  const gap = config.centerGap, clr = config.mainColor
  const opacity = config.mainAlpha

  const tag = (name: string, attrs: Record<string, string | number>) =>
    `<${name} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}${name === 'text' ? '' : '/'}>`

  if (config.showLeftLine) {
    lines.push(tag('line', { x1: 0, y1: cy, x2: cx - gap, y2: cy, stroke: esc(clr), 'stroke-width': config.mainLineWidth, opacity }))
  }
  if (config.showRightLine) {
    lines.push(tag('line', { x1: cx + gap, y1: cy, x2: w, y2: cy, stroke: esc(clr), 'stroke-width': config.mainLineWidth, opacity }))
  }
  lines.push(tag('line', { x1: cx, y1: cy + gap, x2: cx, y2: h, stroke: esc(clr), 'stroke-width': config.mainLineWidth, opacity }))
  if (config.showTopLine) {
    lines.push(tag('line', { x1: cx, y1: cy - gap, x2: cx, y2: cy - config.topPostLength, stroke: esc(clr), 'stroke-width': config.mainLineWidth, opacity }))
  }
  for (const tick of config.ticks) {
    if (!tick.visible) continue
    if (tick.axis === 'vertical' && tick.distance < 0 && !config.showTopTicks) continue
    if (tick.axis === 'vertical' && tick.distance >= 0 && !config.showBottomTicks) continue
    if (tick.axis === 'horizontal' && tick.distance < 0 && !config.showLeftTicks) continue
    if (tick.axis === 'horizontal' && tick.distance > 0 && !config.showRightTicks) continue
    const dir = tick.direction ?? (tick.axis === 'horizontal' ? -1 : 1)
    const x1 = tick.axis === 'horizontal' ? cx + tick.distance : cx
    const y1 = tick.axis === 'horizontal' ? cy : cy + tick.distance
    const x2 = tick.axis === 'horizontal' ? cx + tick.distance : cx + dir * tick.lineLength
    const y2 = tick.axis === 'horizontal' ? cy + dir * tick.lineLength : cy + tick.distance
    lines.push(tag('line', { x1, y1, x2, y2, stroke: esc(tick.color), 'stroke-width': tick.lineWidth, opacity }))
    if (tick.label) {
      let lx: number, ly: number
      if (tick.axis === 'horizontal') {
        lx = cx + tick.distance
        ly = cy + dir * (tick.lineLength + tick.fontSize / 2 + 4)
      } else {
        lx = cx + dir * (tick.lineLength + tick.fontSize * 0.3 + 4)
        ly = cy + tick.distance
      }
      lines.push(`<text x="${lx + tick.labelOffsetX}" y="${ly + tick.labelOffsetY}" fill="${esc(tick.color)}" font-size="${tick.fontSize}" font-family="monospace" text-anchor="middle" dominant-baseline="central">${esc(tick.label)}</text>`)
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${lines.join('')}</svg>`
}

export async function exportSvg(config: CrosshairConfig) {
  const svg = generateSvg(config)
  const name = `${config.name || 'crosshair'}.svg`
  if (isTauri()) {
    const path = await saveFileDialog(name, [{ name: 'SVG Image', extensions: ['svg'] }])
    if (!path) return
    await writeTextFile(path, svg)
  } else {
    const blob = new Blob([svg], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.download = name; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
  }
}

export async function savePreset(config: CrosshairConfig) {
  const json = JSON.stringify(config, null, 2)
  const name = `${config.name || 'crosshair'}.json`
  if (isTauri()) {
    const path = await saveFileDialog(name, [{ name: 'Preset JSON', extensions: ['json'] }])
    if (!path) return
    await writeTextFile(path, json)
  } else {
    const blob = new Blob([json], { type: 'application/json' })
    const link = document.createElement('a')
    link.download = name; link.href = URL.createObjectURL(blob); link.click(); URL.revokeObjectURL(link.href)
  }
}

export async function loadPresetFromFile(): Promise<CrosshairConfig | null> {
  if (isTauri()) {
    const path = await openFileDialog([{ name: 'Preset JSON', extensions: ['json'] }])
    if (!path) return null
    const text = await readTextFile(path)
    return JSON.parse(text) as CrosshairConfig
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    const timer = setTimeout(() => resolve(null), 1000 * 60)
    input.onchange = async () => {
      clearTimeout(timer)
      const file = input.files?.[0]
      if (!file) return resolve(null)
      resolve(JSON.parse(await file.text()) as CrosshairConfig)
    }
    input.click()
  })
}
