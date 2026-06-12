import ReactECharts from 'echarts-for-react'
import { capacityPrediction } from '@/mock/data'
import type { CapacityPrediction, Recommendation } from '@/types'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, TrendingUp } from 'lucide-react'
import { useState, useCallback, useRef } from 'react'

const mockExtractedNodes = [
  { 起运港: '上海港', 中转港: '武汉港', 目的港: '重庆港', 预计到港时间: '2026-06-14 18:00', 集装箱数量: 48 },
  { 起运港: '宁波舟山港', 中转港: '—', 目的港: '长沙港', 预计到港时间: '2026-06-13 12:00', 集装箱数量: 32 },
  { 起运港: '青岛港', 中转港: '济南', 目的港: '西安铁路港', 预计到港时间: '2026-06-15 06:00', 集装箱数量: 56 },
]

const data = capacityPrediction as CapacityPrediction

const priorityColor: Record<string, string> = {
  '高': 'bg-alert-red/20 text-alert-red',
  '中': 'bg-alert-orange/20 text-alert-orange',
  '低': 'bg-carbon-500/20 text-carbon-400',
}

const typeColor: Record<string, string> = {
  '中转方案': 'bg-blue-500/20 text-blue-400',
  '运输组合调整': 'bg-carbon-500/20 text-carbon-400',
}

function getChartOption() {
  const hours = data.timeline.map(t => t.hour)
  const demand = data.timeline.map(t => t.demand)
  const available = data.timeline.map(t => t.available)

  return {
    tooltip: { trigger: 'axis', backgroundColor: '#141E2E', borderColor: '#1E3048', textStyle: { color: '#E2E8F0' } },
    legend: { data: ['需求运力', '可用运力', '运力缺口'], textStyle: { color: '#94A3B8' }, top: 0 },
    grid: { left: 50, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: hours, axisLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8' } },
    yAxis: { type: 'value', name: 'TEU', nameTextStyle: { color: '#94A3B8' }, axisLine: { lineStyle: { color: '#1E3048' } }, splitLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8' } },
    series: [
      {
        name: '需求运力', type: 'line', data: demand, smooth: true,
        lineStyle: { color: '#3B82F6', width: 2 },
        itemStyle: { color: '#3B82F6' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.15)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] } },
      },
      {
        name: '可用运力', type: 'line', data: available, smooth: true,
        lineStyle: { color: '#00C9A7', width: 2 },
        itemStyle: { color: '#00C9A7' },
        areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,201,167,0.15)' }, { offset: 1, color: 'rgba(0,201,167,0)' }] } },
      },
      {
        name: '运力缺口', type: 'line', data: demand.map((d, i) => d > available[i] ? d - available[i] : 0), smooth: true,
        lineStyle: { color: 'rgba(255,71,87,0.8)', width: 2 },
        itemStyle: { color: '#FF4757' },
        areaStyle: { color: 'rgba(255,71,87,0.2)' },
      },
    ],
  }
}

export default function Prediction() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [extracted, setExtracted] = useState<typeof mockExtractedNodes | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.xlsx?$/)) return
    setUploading(true)
    setProgress(0)
    setExtracted(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try { XLSX.read(e.target!.result, { type: 'array' }) } catch {}
    }
    reader.readAsArrayBuffer(file)

    let p = 0
    const interval = setInterval(() => {
      p += Math.random() * 25 + 10
      if (p >= 100) {
        p = 100
        clearInterval(interval)
        setTimeout(() => {
          setUploading(false)
          setExtracted(mockExtractedNodes)
        }, 300)
      }
      setProgress(Math.min(p, 100))
    }, 300)
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true) }, [])
  const onDragLeave = useCallback(() => setDragOver(false), [])
  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div className="space-y-6">
      <div
        onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver ? 'border-carbon-500 bg-carbon-500/5' : 'border-surface-border bg-surface-card hover:border-carbon-500/50'}`}
      >
        <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={onInputChange} />
        <Upload className="mx-auto mb-3 h-10 w-10 text-carbon-500" />
        <p className="text-sm text-slate-300">拖拽或点击上传船期表/报关单Excel</p>
        <p className="mt-1 text-xs text-slate-500">支持 .xlsx / .xls 格式</p>
        {uploading && (
          <div className="absolute inset-x-8 bottom-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-border">
              <div className="h-full rounded-full bg-carbon-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">解析中... {Math.round(progress)}%</p>
          </div>
        )}
      </div>

      {extracted && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="mb-4 flex items-center gap-2 text-carbon-500">
            <FileSpreadsheet className="h-5 w-5" />
            <span className="text-sm font-medium">提取的关键节点</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-slate-400">
                  <th className="px-3 py-2 text-left font-medium">起运港</th>
                  <th className="px-3 py-2 text-left font-medium">中转港</th>
                  <th className="px-3 py-2 text-left font-medium">目的港</th>
                  <th className="px-3 py-2 text-left font-medium">预计到港时间</th>
                  <th className="px-3 py-2 text-left font-medium">集装箱数量</th>
                </tr>
              </thead>
              <tbody>
                {extracted.map((row, i) => (
                  <tr key={i} className="border-b border-surface-border/50 text-slate-300">
                    <td className="px-3 py-2">{row.起运港}</td>
                    <td className="px-3 py-2">{row.中转港}</td>
                    <td className="px-3 py-2">{row.目的港}</td>
                    <td className="px-3 py-2 font-din">{row.预计到港时间}</td>
                    <td className="px-3 py-2 font-din text-carbon-400">{row.集装箱数量} TEU</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
          <TrendingUp className="h-4 w-4 text-carbon-500" />
          72小时运力缺口预测
        </h3>
        <ReactECharts option={getChartOption()} style={{ height: 320 }} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <AlertCircle className="h-4 w-4 text-alert-red" />
            运力缺口时段
          </h3>
          {data.gap.map((g, i) => (
            <div key={i} className="rounded-lg border border-alert-red/30 bg-surface-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">缺口时段 {i + 1}</span>
                <span className="rounded-full bg-alert-red/20 px-2 py-0.5 text-xs font-medium text-alert-red">-{g.gapAmount} TEU</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="font-din">{g.startHour}</span>
                <span className="text-slate-500">→</span>
                <span className="font-din">{g.endHour}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <TrendingUp className="h-4 w-4 text-carbon-500" />
            优化建议
          </h3>
          {data.recommendations.map((rec: Recommendation) => (
            <div key={rec.id} className="card-glow rounded-lg border border-surface-border bg-surface-card p-4 transition-shadow">
              <div className="mb-2 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[rec.type]}`}>{rec.type}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[rec.priority]}`}>{rec.priority}优先</span>
              </div>
              <p className="mb-1 text-sm text-slate-300">{rec.description}</p>
              <p className="text-xs text-carbon-400">预期效果：{rec.expectedEffect}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
