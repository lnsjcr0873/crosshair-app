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
      await w.setDecorations(true)
      await w.setAlwaysOnTop(false)
      await w.setFullscreen(false)
      await w.setIgnoreCursorEvents(false)
    }
  } catch (e) {
    console.warn('Overlay window operation failed:', e)
  }
}

type ShortcutHandler = () => void

export async function registerShortcut(shortcut: string, handler: ShortcutHandler): Promise<void> {
  if (!isTauri()) return
  const { register } = await import('@tauri-apps/plugin-global-shortcut')
  await register(shortcut, (action) => { if (action.state === 'Pressed') handler() })
}

export async function unregisterShortcut(shortcut: string): Promise<void> {
  if (!isTauri()) return
  const { unregister } = await import('@tauri-apps/plugin-global-shortcut')
  await unregister(shortcut)
}
