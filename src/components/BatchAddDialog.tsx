import { useState } from 'react'
import { useCrosshairStore } from '../store/crosshairStore'

export default function BatchAddDialog({ axis, onClose }: { axis: 'horizontal' | 'vertical'; onClose: () => void }) {
  const addTicks = useCrosshairStore((s) => s.addTicks)
  const [start, setStart] = useState(30)
  const [end, setEnd] = useState(250)
  const [step, setStep] = useState(40)
  const [lineLen, setLineLen] = useState(14)
  const [lineWid, setLineWid] = useState(2)
  const [dir, setDir] = useState<1 | -1>(axis === 'horizontal' ? -1 : 1)
  const [symmetric, setSymmetric] = useState(true)
  const [labelTmpl, setLabelTmpl] = useState('')

  const distances: number[] = []
  for (let d = start; d <= end; d += step) distances.push(d)

  const handleGenerate = () => {
    const ticks = distances.map((d) => ({
      axis,
      distance: d,
      direction: dir,
      label: labelTmpl ? labelTmpl.replace('{dist}', String(d)).replace('{idx}', String(d)) : '',
    }))
    addTicks(ticks, symmetric)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-zinc-800 border border-zinc-600 rounded-lg p-5 w-[340px]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-white font-semibold mb-3">批量添加 {axis === 'horizontal' ? '水平' : '垂直'}刻度</h2>
        <div className="space-y-2.5 text-sm">
          <div className="flex gap-2 items-center">
            <span className="text-zinc-400 w-16">方向</span>
            <div className="flex gap-1">
              <button onClick={() => setDir(-1)} className={`text-xs px-2 py-0.5 rounded border ${dir === -1 ? 'bg-green-700 border-green-500 text-white' : 'bg-zinc-700 border-zinc-500 text-zinc-400'}`}>{axis === 'horizontal' ? '↑' : '←'}</button>
              <button onClick={() => setDir(1)} className={`text-xs px-2 py-0.5 rounded border ${dir === 1 ? 'bg-green-700 border-green-500 text-white' : 'bg-zinc-700 border-zinc-500 text-zinc-400'}`}>{axis === 'horizontal' ? '↓' : '→'}</button>
            </div>
          </div>
          <Field label="起始" value={start} onChange={setStart} />
          <Field label="结束" value={end} onChange={setEnd} />
          <Field label="步长" value={step} onChange={setStep} />
          <div className="text-zinc-500 text-xs">即将生成: {distances.join(', ') || '—'}</div>
          <Field label="线长" value={lineLen} onChange={setLineLen} min={2} max={80} />
          <Field label="线宽" value={lineWid} onChange={setLineWid} min={0.5} max={6} step={0.5} />
          <div>
            <span className="text-zinc-400 text-xs">标签模板</span>
            <input value={labelTmpl} onChange={(e) => setLabelTmpl(e.target.value)} placeholder='如 {dist}m → 30m, 70m…' className="input-field text-xs mt-0.5" />
          </div>
          <label className="flex items-center gap-2 text-zinc-400 text-xs cursor-pointer">
            <input type="checkbox" checked={symmetric} onChange={() => setSymmetric(!symmetric)} />
            左右对称（同时创建另一侧）
          </label>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary text-xs flex-1">取消</button>
          <button onClick={handleGenerate} disabled={distances.length === 0} className="btn-primary text-xs flex-1">生成 {distances.length} 个刻度</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value, onChange, min = 1, max = 9999, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-zinc-400 w-16 text-xs">{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="flex-1" />
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className="input-field w-16 text-xs text-center" />
    </div>
  )
}
