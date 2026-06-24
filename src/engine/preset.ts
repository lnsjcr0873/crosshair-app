import { createTick, type CrosshairConfig, type TickMark } from './types'

function createPreset(name: string, ticks: TickMark[]): CrosshairConfig {
  return {
    name,
    centerGap: 8,
    mainLineWidth: 2,
    mainColor: '#00ff00',
    mainAlpha: 1,
    bgColor: '#000000',
    bgAlpha: 0,
    horizontalLineLength: 300,
    verticalLineLength: 300,
    topPostLength: 300,
    showTopLine: false,
    showTopTicks: false,
    showBottomLine: true,
    showBottomTicks: true,
    showLeftLine: true,
    showRightLine: true,
    showLeftTicks: true,
    showRightTicks: true,
    showCenterDot: false,
    centerDotSize: 4,
    centerDotColor: '#00ff00',
    centerDotAlpha: 1,
    ticks,
  }
}

export function vssStylePreset(): CrosshairConfig {
  const ticks: TickMark[] = []

  const entries: [number, string][] = [
    [30, '2'],
    [60, '4'],
    [100, '6'],
    [140, '8'],
    [190, '10'],
    [250, '12'],
  ]
  for (const [dist, label] of entries) {
    const t = createTick('horizontal', dist)
    t.lineLength = 14
    t.label = label
    ticks.push(t)
  }

  for (const [dist, label] of entries.map(([d, l]) => [-d, l] as [number, string])) {
    const t = createTick('horizontal', dist)
    t.lineLength = 14
    t.label = label
    ticks.push(t)
  }

  for (const [dist, label] of entries) {
    const t = createTick('vertical', dist)
    t.lineLength = 14
    t.label = label
    ticks.push(t)
  }

  return createPreset('VSS 风格', ticks)
}

export function simplePreset(): CrosshairConfig {
  const ticks: TickMark[] = []
  for (let i = 1; i <= 5; i++) {
    const dist = i * 40
    const t = createTick('horizontal', dist)
    t.lineLength = 10
    t.label = String(i * 2)
    ticks.push(t)
  }
  for (let i = 1; i <= 5; i++) {
    const dist = i * 40
    const t = createTick('vertical', dist)
    t.lineLength = 10
    t.label = String(i * 2)
    ticks.push(t)
  }
  return createPreset('简洁', ticks)
}

export function defaultPreset(): CrosshairConfig {
  const ticks: TickMark[] = []
  const defaultEntries: [number, string][] = [
    [30, '2'], [60, '4'], [100, '6'], [140, '8'], [190, '10'], [250, '12'],
  ]
  for (const [dist, label] of defaultEntries) {
    const t = createTick('horizontal', dist)
    t.lineLength = 14
    t.label = label
    ticks.push(t)
    const tl = createTick('horizontal', -dist)
    tl.lineLength = 14; tl.label = label
    ticks.push(tl)
  }
  for (let i = 1; i <= 6; i++) {
    const dist = i * 40
    const t = createTick('vertical', dist)
    t.lineLength = 14; t.label = String(i * 2)
    ticks.push(t)
  }
  return createPreset('默认', ticks)
}
