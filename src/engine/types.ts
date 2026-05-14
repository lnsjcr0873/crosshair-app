export interface TickMark {
  id: string
  axis: 'horizontal' | 'vertical'
  distance: number
  lineLength: number
  lineWidth: number
  color: string
  label: string
  fontSize: number
  labelOffsetX: number
  labelOffsetY: number
  visible: boolean
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
  showTopPost: boolean
  topPostLength: number
  ticks: TickMark[]
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
    showTopPost: false,
    topPostLength: 300,
    ticks: [],
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

export function createTick(axis: 'horizontal' | 'vertical', distance: number): TickMark {
  return {
    id: generateId(),
    axis,
    distance,
    lineLength: 12,
    lineWidth: 2,
    color: '#00ff00',
    label: String(Math.round(Math.abs(distance) / 10) * 2 || 2),
    fontSize: 12,
    labelOffsetX: 0,
    labelOffsetY: 0,
    visible: true,
  }
}
