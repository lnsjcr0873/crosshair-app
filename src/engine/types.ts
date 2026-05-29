export interface TickMark {
  id: string
  axis: 'horizontal' | 'vertical'
  distance: number
  direction: 1 | -1
  lineLength: number
  lineWidth: number
  color: string
  label: string
  fontSize: number
  labelOffsetX: number
  labelOffsetY: number
  offsetX: number
  offsetY: number
  mirrorId?: string
  visible: boolean
  locked?: boolean
  generated?: boolean
  generation?: number
}

export interface FissionLevelConfig {
  lineLength?: number
  lineWidth?: number
  color?: string
  fontSize?: number
  offsetX?: number
  offsetY?: number
  labelOffsetX?: number
  labelOffsetY?: number
  inherit?: Partial<Record<
    'lineLength'|'lineWidth'|'color'|'fontSize'|'offsetX'|'offsetY'|'labelOffsetX'|'labelOffsetY',
    'previous'|'next'
  >>
}

export interface FissionConfig {
  groupMode: 'by-direction' | 'by-distance'
  direction: 1 | -1 | 'inherit'
  symmetric: boolean
  markGenerated: boolean
  labelMode: 'midpoint' | 'left-value' | 'right-value' | 'distance'
  maxIterations: number
  onlyGroups?: ('h-left' | 'h-right' | 'v-top' | 'v-bottom')[]
  levels: FissionLevelConfig[]
}

export interface ReferenceImage {
  dataUrl: string
  opacity: number
  scale: number
  offsetX: number
  offsetY: number
}

export interface CrosshairConfig {
  name: string
  centerGap: number
  mainLineWidth: number
  mainColor: string
  mainAlpha: number
  bgColor: string
  bgAlpha: number
  horizontalLineLength: number
  verticalLineLength: number
  topPostLength: number
  showTopLine: boolean
  showTopTicks: boolean
  showBottomLine: boolean
  showBottomTicks: boolean
  showLeftLine: boolean
  showRightLine: boolean
  showLeftTicks: boolean
  showRightTicks: boolean
  referenceImage?: ReferenceImage
  ticks: TickMark[]
  fissionConfig?: FissionConfig
}

export interface ConfigEntry {
  name: string
  config: CrosshairConfig
}

export const DEFAULT_HOTKEYS = {
  toggleOverlay: 'F2',
  toggleVisibility: 'F3',
  prevTick: 'PageUp',
  nextTick: 'PageDown',
  incDistance: 'ArrowDown',
  decDistance: 'ArrowUp',
  incLineLength: 'BracketRight',
  decLineLength: 'BracketLeft',
  switchConfig1: 'Ctrl+1',
  switchConfig2: 'Ctrl+2',
  switchConfig3: 'Ctrl+3',
  switchConfig4: 'Ctrl+4',
  switchConfig5: 'Ctrl+5',
  switchConfig6: 'Ctrl+6',
  switchConfig7: 'Ctrl+7',
  switchConfig8: 'Ctrl+8',
  switchConfig9: 'Ctrl+9',
  fission: 'Insert',
  undo: 'Minus',
  redo: 'Equal',
  adjustUp: 'Ctrl+Shift+.',
  adjustDown: 'Ctrl+Shift+,',
  toggleHook: 'F4',
}

export function defaultFissionLevel(): FissionLevelConfig {
  return {
    lineLength: 8,
    lineWidth: 1,
    color: '#00ff00',
    fontSize: 10,
    offsetX: 0,
    offsetY: 0,
    labelOffsetX: 0,
    labelOffsetY: 0,
  }
}

export function defaultFissionConfig(): FissionConfig {
  const level = defaultFissionLevel()
  return {
    groupMode: 'by-distance',
    direction: 'inherit',
    symmetric: false,
    markGenerated: true,
    labelMode: 'midpoint',
    maxIterations: 8,
    levels: [{ ...level }],
  }
}

export function createDefaultConfig(): CrosshairConfig {
  return {
    name: '默认准星',
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
    ticks: [],
    fissionConfig: defaultFissionConfig(),
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function createTick(axis: 'horizontal' | 'vertical', distance: number, direction?: 1 | -1): TickMark {
  return {
    id: generateId(),
    axis,
    distance,
    direction: direction ?? (axis === 'horizontal' ? -1 : 1),
    lineLength: 12,
    lineWidth: 2,
    color: '#00ff00',
    label: String(Math.round(Math.abs(distance) / 10) * 2 || 2),
    fontSize: 12,
    labelOffsetX: 0,
    labelOffsetY: 0,
    offsetX: 0,
    offsetY: 0,
    visible: true,
  }
}
