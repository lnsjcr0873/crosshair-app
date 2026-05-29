export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function saveFileDialog(defaultName: string, filters: { name: string; extensions: string[] }[]): Promise<string | null> {
  if (!isTauri()) return null
  const { save } = await import('@tauri-apps/plugin-dialog')
  return await save({ defaultPath: defaultName, filters })
}

export async function openFileDialog(filters: { name: string; extensions: string[] }[]): Promise<string | null> {
  if (!isTauri()) return null
  const { open } = await import('@tauri-apps/plugin-dialog')
  const result = await open({ filters, multiple: false })
  return result as string | null
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  const { writeTextFile } = await import('@tauri-apps/plugin-fs')
  await writeTextFile(path, content)
}

export async function readTextFile(path: string): Promise<string> {
  const { readTextFile } = await import('@tauri-apps/plugin-fs')
  return await readTextFile(path)
}

export async function writeBinaryFile(path: string, content: Uint8Array): Promise<void> {
  const { writeFile } = await import('@tauri-apps/plugin-fs')
  await writeFile(path, content)
}

export async function setOverlayWindow(enabled: boolean): Promise<void> {
  if (!isTauri()) return
  try {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const w = getCurrentWindow()
    if (enabled) {
      await w.setDecorations(false)
      await w.setAlwaysOnTop(true)
      await w.setFullscreen(true)
      await w.setIgnoreCursorEvents(true)
    } else {
      await w.setIgnoreCursorEvents(false)
      await w.setFullscreen(false)
      await w.setAlwaysOnTop(false)
    }
  } catch (e) {
    console.error('setOverlayWindow failed:', e)
  }
}

type ShortcutHandler = () => void

let arrowInterval: number | null = null

export async function registerShortcut(shortcut: string, handler: ShortcutHandler): Promise<void> {
  if (!isTauri()) return
  const { register } = await import('@tauri-apps/plugin-global-shortcut')
  await register(shortcut, (action) => { if (action.state === 'Pressed') handler() })
}

export async function registerRepeatShortcut(shortcut: string, onPress: () => void, intervalMs: number = 80): Promise<void> {
  if (!isTauri()) return
  const { register } = await import('@tauri-apps/plugin-global-shortcut')
  await register(shortcut, (action) => {
    if (action.state === 'Pressed') {
      onPress()
      arrowInterval = window.setInterval(onPress, intervalMs)
    } else {
      if (arrowInterval !== null) { clearInterval(arrowInterval); arrowInterval = null }
    }
  })
}

export function clearArrowRepeat(): void {
  if (arrowInterval !== null) { clearInterval(arrowInterval); arrowInterval = null }
}

export async function registerShortcutWithRelease(shortcut: string, onPress: () => void, onRelease: () => void): Promise<void> {
  if (!isTauri()) return
  const { register } = await import('@tauri-apps/plugin-global-shortcut')
  await register(shortcut, (action) => {
    if (action.state === 'Pressed') onPress()
    else onRelease()
  })
}

export async function unregisterShortcut(shortcut: string): Promise<void> {
  if (!isTauri()) return
  const { unregister } = await import('@tauri-apps/plugin-global-shortcut')
  await unregister(shortcut)
}

// State persistence (via Rust commands, bypasses fs plugin scope)
export async function saveAppState(data: string): Promise<void> {
  if (!isTauri()) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('save_state', { data })
  } catch (e) {
    console.error('saveAppState failed:', e)
  }
}

export async function loadAppState(): Promise<string | null> {
  if (!isTauri()) return null
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<string | null>('load_state')
  } catch (e) {
    console.error('loadAppState failed:', e)
    return null
  }
}

// Mouse hook for Ctrl+wheel in overlay mode
export async function toggleMouseHook(enabled: boolean): Promise<void> {
  if (!isTauri()) return
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    await invoke('toggle_mouse_hook', { enabled })
  } catch (e) {
    console.error('toggleMouseHook failed:', e)
  }
}
