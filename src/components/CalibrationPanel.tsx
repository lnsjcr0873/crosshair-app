import { useCrosshairStore } from '../store/crosshairStore'

export default function CalibrationPanel() {
  const config = useCrosshairStore((s) => s.config)
  const updateConfig = useCrosshairStore((s) => s.updateConfig)

  const ref = config.referenceImage

  const handleFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      updateConfig({
        referenceImage: {
          dataUrl: reader.result as string,
          opacity: 0.4,
          scale: 1,
          offsetX: 0,
          offsetY: 0,
        },
      })
    }
    reader.readAsDataURL(file)
  }

  const handlePaste = async () => {
    try {
      const items = await navigator.clipboard.read()
      for (const item of items) {
        const blob = await item.getType('image/png').catch(() => null)
        if (blob) { handleFile(new File([blob], 'clipboard.png')); return }
      }
    } catch { /* clipboard read denied */ }
  }

  const clearRef = () => updateConfig({ referenceImage: undefined })

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-zinc-800 border-b border-zinc-700 text-xs flex-wrap"
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const file = e.dataTransfer?.files[0]; if (file?.type.startsWith('image/')) handleFile(file) }}
    >
      <span className="text-zinc-400 font-semibold">校准</span>

      {!ref?.dataUrl ? (
        <>
          <button onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'; input.accept = 'image/*'
            input.onchange = () => { if (input.files?.[0]) handleFile(input.files[0]) }
            input.click()
          }} className="btn-secondary text-xs">选图</button>
          <button onClick={handlePaste} className="btn-secondary text-xs" title="Ctrl+V 粘贴截图">粘贴</button>
          <span className="text-zinc-600">拖入截图到画布</span>
        </>
      ) : (
        <>
          <span className="text-zinc-500">透明度</span>
          <input type="range" min={0} max={1} step={0.05} value={ref.opacity}
            onChange={(e) => updateConfig({ referenceImage: { ...ref, opacity: Number(e.target.value) } })}
            className="w-16" />
          <span className="text-zinc-500">缩放</span>
          <input type="range" min={0.1} max={3} step={0.05} value={ref.scale}
            onChange={(e) => updateConfig({ referenceImage: { ...ref, scale: Number(e.target.value) } })}
            className="w-16" />
          <button onClick={clearRef} className="btn-danger text-xs">清除</button>
          <span className="text-zinc-600">Ctrl+拖拽平移</span>
        </>
      )}
    </div>
  )
}
