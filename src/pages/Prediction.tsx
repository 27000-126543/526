import ReactECharts from 'echarts-for-react'
import { useAppStore } from '@/store'
import { capacityPrediction } from '@/mock/data'
import type { CapacityPrediction, Recommendation, ExcelParsedResult } from '@/types'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, TrendingUp, AlertTriangle } from 'lucide-react'
import { useState, useCallback, useRef, useMemo } from 'react'

const FIELD_ALIASES: Record<string, string[]> = {
  '起运港': ['起运港', '出发港', '装港', 'POL', 'Port of Loading'],
  '目的港': ['目的港', '卸港', 'POD', 'Port of Discharge', '到达港'],
  '中转港': ['中转港', '转运港', 'Transshipment', '中转'],
  '预计到港时间': ['预计到港', 'ETA', '到港时间', '预计到达'],
  '箱量': ['箱量', 'TEU', '集装箱数', '箱数', '数量'],
  '箱型': ['箱型', '类型', '规格', 'Container Type', 'Size'],
}

const priorityColor: Record<string, string> = {
  '高': 'bg-alert-red/20 text-alert-red',
  '中': 'bg-alert-orange/20 text-alert-orange',
  '低': 'bg-carbon-500/20 text-carbon-400',
}

const typeColor: Record<string, string> = {
  '中转方案': 'bg-blue-500/20 text-blue-400',
  '运输组合调整': 'bg-carbon-500/20 text-carbon-400',
}

function matchHeader(header: string): string | null {
  const h = header.trim()
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.some(a => h.includes(a))) return field
  }
  return null
}

function parseExcel(buffer: ArrayBuffer): ExcelParsedResult {
  const wb = XLSX.read(buffer, { type: 'array' })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: '' })
  if (!raw.length) return { headers: [], rows: [], matchedFields: [], missingFields: Object.keys(FIELD_ALIASES) }

  const headers = Object.keys(raw[0])
  const headerMap: Record<string, string> = {}
  const matchedFields: string[] = []

  for (const h of headers) {
    const m = matchHeader(h)
    if (m && !headerMap[m]) {
      headerMap[m] = h
      matchedFields.push(m)
    }
  }

  const rows = raw.map(r => {
    const row: Record<string, string | number> = {}
    for (const [field, origHeader] of Object.entries(headerMap)) {
      row[field] = r[origHeader] ?? ''
    }
    return row
  })

  const missingFields = Object.keys(FIELD_ALIASES).filter(f => !matchedFields.includes(f))
  return { headers, rows, matchedFields, missingFields }
}

function buildPrediction(excel: ExcelParsedResult | null): CapacityPrediction {
  const fallback = capacityPrediction as CapacityPrediction
  if (!excel || !excel.matchedFields.includes('箱量') || !excel.rows.length) return fallback

  const totalDemand = excel.rows.reduce((s, r) => s + (Number(r['箱量']) || 0), 0)
  const defaultTimeline = fallback.timeline
  const slotCount = defaultTimeline.length
  const avgPerSlot = Math.round(totalDemand / slotCount)

  const etaCol = excel.matchedFields.includes('预计到港时间')
  const slotDist = new Array(slotCount).fill(0)

  if (etaCol) {
    excel.rows.forEach(r => {
      const val = String(r['预计到港时间'] || '')
      const d = new Date(val)
      if (isNaN(d.getTime())) return
      const now = new Date()
      const diffH = (d.getTime() - now.getTime()) / 3600000
      const idx = Math.floor(diffH / 6)
      if (idx >= 0 && idx < slotCount) slotDist[idx] += Number(r['箱量']) || 0
    })
  }

  const hasDist = slotDist.some(v => v > 0)
  const demand = defaultTimeline.map((_, i) => hasDist ? Math.max(slotDist[i], Math.round(avgPerSlot * 0.6)) : avgPerSlot + Math.round((Math.random() - 0.3) * avgPerSlot * 0.5))
  const available = demand.map(d => Math.round(d * 0.85 + (Math.random() - 0.5) * d * 0.1))

  const timeline = defaultTimeline.map((t, i) => ({ hour: t.hour, demand: demand[i], available: available[i] }))

  const gap: CapacityPrediction['gap'] = []
  let gapStart = -1
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].demand > timeline[i].available) {
      if (gapStart < 0) gapStart = i
    } else {
      if (gapStart >= 0) {
        gap.push({ startHour: timeline[gapStart].hour, endHour: timeline[i - 1].hour, gapAmount: Math.max(...timeline.slice(gapStart, i).map(t => t.demand - t.available)) })
        gapStart = -1
      }
    }
  }
  if (gapStart >= 0) {
    gap.push({ startHour: timeline[gapStart].hour, endHour: timeline[timeline.length - 1].hour, gapAmount: Math.max(...timeline.slice(gapStart).map(t => t.demand - t.available)) })
  }

  const recs: Recommendation[] = gap.map((g, i) => ({
    id: `REC_D${i + 1}`,
    type: (i % 2 === 0 ? '中转方案' : '运输组合调整') as Recommendation['type'],
    description: `${g.startHour}-${g.endHour}时段运力缺口${g.gapAmount}TEU，建议${i % 2 === 0 ? '增加中转港分流' : '调整运输组合模式'}缓解压力`,
    expectedEffect: `缓解运力缺口约${Math.round(g.gapAmount * 0.6)}TEU/时段`,
    priority: (g.gapAmount > 200 ? '高' : g.gapAmount > 100 ? '中' : '低') as Recommendation['priority'],
  }))

  return { timeline, gap, recommendations: recs.length ? recs : fallback.recommendations }
}

export default function Prediction() {
  const { excelResult, setExcelResult, predictionData, setPredictionData } = useAppStore()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const data = useMemo(() => predictionData ?? (capacityPrediction as CapacityPrediction), [predictionData])

  const chartOption = useMemo(() => {
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
          lineStyle: { color: '#3B82F6', width: 2 }, itemStyle: { color: '#3B82F6' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.15)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] } },
        },
        {
          name: '可用运力', type: 'line', data: available, smooth: true,
          lineStyle: { color: '#00C9A7', width: 2 }, itemStyle: { color: '#00C9A7' },
          areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,201,167,0.15)' }, { offset: 1, color: 'rgba(0,201,167,0)' }] } },
        },
        {
          name: '运力缺口', type: 'line', data: demand.map((d, i) => d > available[i] ? d - available[i] : 0), smooth: true,
          lineStyle: { color: 'rgba(255,71,87,0.8)', width: 2 }, itemStyle: { color: '#FF4757' },
          areaStyle: { color: 'rgba(255,71,87,0.2)' },
        },
      ],
    }
  }, [data])

  const handleFile = useCallback((file: File) => {
    if (!file.name.match(/\.xlsx?$/)) return
    setUploading(true)
    setProgress(0)

    const reader = new FileReader()
    reader.onload = (e) => {
      let p = 0
      const interval = setInterval(() => {
        p += Math.random() * 25 + 10
        if (p >= 100) {
          p = 100
          clearInterval(interval)
          try {
            const result = parseExcel(e.target!.result as ArrayBuffer)
            setExcelResult(result)
            setPredictionData(buildPrediction(result))
          } catch {
            setExcelResult(null)
            setPredictionData(null)
          }
          setTimeout(() => setUploading(false), 300)
        }
        setProgress(Math.min(p, 100))
      }, 200)
    }
    reader.readAsArrayBuffer(file)
  }, [setExcelResult, setPredictionData])

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

  const displayFields = excelResult?.matchedFields ?? []

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

      {excelResult && excelResult.missingFields.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-alert-orange/40 bg-alert-orange/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-alert-orange" />
          <div>
            <p className="text-sm font-medium text-alert-orange">未识别字段</p>
            <p className="mt-1 text-xs text-slate-400">以下字段未在Excel表头中匹配到：{excelResult.missingFields.join('、')}</p>
          </div>
        </div>
      )}

      {excelResult && excelResult.rows.length > 0 && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <div className="mb-4 flex items-center gap-2 text-carbon-500">
            <FileSpreadsheet className="h-5 w-5" />
            <span className="text-sm font-medium">提取的关键节点</span>
            <span className="ml-auto text-xs text-slate-500">已匹配 {excelResult.matchedFields.length}/{Object.keys(FIELD_ALIASES).length} 字段</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-slate-400">
                  {displayFields.map(f => (
                    <th key={f} className="px-3 py-2 text-left font-medium">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {excelResult.rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className="border-b border-surface-border/50 text-slate-300">
                    {displayFields.map(f => (
                      <td key={f} className={`px-3 py-2 ${f === '箱量' ? 'font-din text-carbon-400' : ''}`}>
                        {f === '箱量' ? `${row[f]} TEU` : String(row[f] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {excelResult && excelResult.rows.length === 0 && (
        <div className="rounded-xl border border-surface-border bg-surface-card p-6 text-center text-sm text-slate-500">
          未从Excel中提取到有效数据行
        </div>
      )}

      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-300">
          <TrendingUp className="h-4 w-4 text-carbon-500" />
          72小时运力缺口预测
        </h3>
        <ReactECharts option={chartOption} style={{ height: 320 }} />
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
