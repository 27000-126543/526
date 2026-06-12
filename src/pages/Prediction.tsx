import ReactECharts from 'echarts-for-react'
import { useAppStore } from '@/store'
import { capacityPrediction } from '@/mock/data'
import type { CapacityPrediction, Recommendation, ExcelParsedResult, CapacityTimelineSlot } from '@/types'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, AlertCircle, TrendingUp, TrendingDown, AlertTriangle, Sparkles, GitCompare, Plus, Minus, Minus as MinusIcon, Plus as PlusIcon } from 'lucide-react'
import { useState, useCallback, useRef, useMemo } from 'react'
import { cn } from '@/lib/utils'

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

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function buildPrediction(excel: ExcelParsedResult | null): CapacityPrediction {
  const fallback = capacityPrediction as CapacityPrediction
  if (!excel || !excel.matchedFields.includes('箱量') || !excel.rows.length) return fallback

  const totalDemand = excel.rows.reduce((s, r) => s + (Number(r['箱量']) || 0), 0)
  const defaultTimeline = fallback.timeline
  const slotCount = defaultTimeline.length
  const avgPerSlot = Math.round(totalDemand / slotCount)

  const dataSeed = hashCode(excel.rows.map(r => JSON.stringify(r)).join('|'))

  const etaCol = excel.matchedFields.includes('预计到港时间')
  const slotDist = new Array(slotCount).fill(0)

  if (etaCol) {
    const sorted = [...excel.rows].sort((a, b) => String(a['预计到港时间']).localeCompare(String(b['预计到港时间'])))
    const perSlot = Math.ceil(sorted.length / slotCount)
    sorted.forEach((r, i) => {
      const idx = Math.min(Math.floor(i / perSlot), slotCount - 1)
      slotDist[idx] += Number(r['箱量']) || 0
    })
  }

  const hasDist = slotDist.some((v: number) => v > 0)
  const demand = defaultTimeline.map((_, i) => {
    if (hasDist) {
      return Math.max(slotDist[i], Math.round(avgPerSlot * 0.6))
    }
    const jitter = ((dataSeed + i * 137) % 31 - 15) / 100
    return Math.round(avgPerSlot * (1 + jitter))
  })
  const available = demand.map((d, i) => {
    const jitter = ((dataSeed + i * 89) % 21 - 10) / 100
    return Math.round(d * (0.82 + jitter * 0.08))
  })

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
  const { excelResult, setExcelResult, predictionData, setPredictionData, predictionHistory, setPredictionHistory, compareResult, setCompareResult } = useAppStore()
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const data = useMemo(() => predictionData ?? (capacityPrediction as CapacityPrediction), [predictionData])

  const totalPrevGap = useMemo(() => predictionHistory?.prediction.gap.reduce((s, g) => s + g.gapAmount, 0) ?? 0, [predictionHistory])
  const totalCurGap = useMemo(() => data.gap.reduce((s, g) => s + g.gapAmount, 0), [data.gap])

  const chartOption = useMemo(() => {
    const hours = data.timeline.map(t => t.hour)
    const demand = data.timeline.map(t => t.demand)
    const available = data.timeline.map(t => t.available)
    const prev = predictionHistory?.prediction.timeline
    return {
      tooltip: { trigger: 'axis', backgroundColor: '#141E2E', borderColor: '#1E3048', textStyle: { color: '#E2E8F0' } },
      legend: { data: prev ? ['需求运力', '可用运力', '运力缺口', '上次需求'] : ['需求运力', '可用运力', '运力缺口'], textStyle: { color: '#94A3B8' }, top: 0 },
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
        ...(prev ? [{
          name: '上次需求', type: 'line', data: prev.map(t => t.demand), smooth: true,
          lineStyle: { color: '#A78BFA', width: 1.5, type: 'dashed' }, itemStyle: { color: '#A78BFA' },
        }] : []),
      ],
    }
  }, [data, predictionHistory])

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
            const pred = buildPrediction(result)

            const inputHash = hashCode(JSON.stringify(result.rows))
            const prevPred = predictionData ?? (capacityPrediction as CapacityPrediction)
            const isSameInput = predictionHistory ? predictionHistory.hash === inputHash : false

            const prevTimeline = predictionHistory ? predictionHistory.prediction.timeline : prevPred.timeline
            const curTimeline = pred.timeline

            const gapByHour = (tl: CapacityTimelineSlot[]) => {
              const m: Record<string, number> = {}
              tl.forEach(t => { m[t.hour] = Math.max(0, t.demand - t.available) })
              return m
            }
            const prevG = gapByHour(prevTimeline)
            const curG = gapByHour(curTimeline)
            const gapDiff: { hour: string; delta: number; current: number; previous: number }[] = []
            const allHours = Array.from(new Set([...Object.keys(prevG), ...Object.keys(curG)])).sort()
            allHours.forEach(h => {
              const c = curG[h] ?? 0, pv = prevG[h] ?? 0
              if (c !== pv) gapDiff.push({ hour: h, delta: c - pv, current: c, previous: pv })
            })

            const prevRecs = (predictionHistory ? predictionHistory.prediction : prevPred).recommendations
            const curRecs = pred.recommendations
            const prevIds = new Set(prevRecs.map(r => r.id))
            const curIds = new Set(curRecs.map(r => r.id))
            const recAdded = curRecs.filter(r => !prevIds.has(r.id))
            const recRemoved = prevRecs.filter(r => !curIds.has(r.id))

            const totalPrev = (predictionHistory ? predictionHistory.prediction : prevPred).gap.reduce((s, g) => s + g.gapAmount, 0)
            const totalCur = pred.gap.reduce((s, g) => s + g.gapAmount, 0)
            const totalGapDelta = totalCur - totalPrev

            setCompareResult({
              isSameInput,
              gapDiff,
              recAdded,
              recRemoved,
              totalGapDelta,
              previousInputHash: predictionHistory?.hash ?? 0,
              currentInputHash: inputHash,
            })

            setPredictionHistory({
              hash: inputHash,
              timestamp: new Date().toISOString(),
              inputSummary: {
                rowCount: result.rows.length,
                fields: result.matchedFields,
                fileName: file.name,
                totalTEU: result.rows.reduce((s, r) => s + (Number(r['箱量']) || 0), 0),
                etaCount: result.rows.filter(r => String(r['预计到港时间'] || '').trim() !== '').length,
              },
              prediction: pred,
            })

            setExcelResult(result)
            setPredictionData(pred)
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
  }, [setExcelResult, setPredictionData, setPredictionHistory, setCompareResult, predictionData, predictionHistory])

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
        <p className="mt-1 text-xs text-slate-500">支持 .xlsx / .xls 格式 · 相同文件自动识别 · 变更自动对比</p>
        {uploading && (
          <div className="absolute inset-x-8 bottom-4">
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-border">
              <div className="h-full rounded-full bg-carbon-500 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-400">解析中... {Math.round(progress)}%</p>
          </div>
        )}
      </div>

      {compareResult && (
        <div className={cn('rounded-xl border p-4',
          compareResult.isSameInput
            ? 'border-carbon-500/40 bg-carbon-500/10'
            : 'border-blue-500/30 bg-blue-500/5'
        )}>
          <div className="mb-3 flex items-center gap-2">
            {compareResult.isSameInput ? (
              <>
                <Sparkles className="h-4 w-4 text-carbon-500" />
                <span className="text-sm font-medium text-carbon-400">输入文件与上次相同，预测结果一致</span>
                <span className="ml-auto text-[10px] text-slate-500">
                  {predictionHistory && new Date(predictionHistory.timestamp).toLocaleString('zh-CN')}
                </span>
              </>
            ) : (
              <>
                <GitCompare className="h-4 w-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">与上次预测对比</span>
                <span className="ml-auto text-[10px] text-slate-500">
                  {predictionHistory && new Date(predictionHistory.timestamp).toLocaleString('zh-CN')}
                </span>
              </>
            )}
          </div>

          {!compareResult.isSameInput && (
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-surface-border bg-surface-dark p-3">
                <div className="text-[11px] text-slate-400">总缺口量变化</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={cn('font-din text-2xl font-bold',
                    compareResult.totalGapDelta > 0 ? 'text-alert-red' : compareResult.totalGapDelta < 0 ? 'text-carbon-400' : 'text-slate-300'
                  )}>
                    {compareResult.totalGapDelta > 0 ? '+' : ''}{compareResult.totalGapDelta}
                  </span>
                  <span className="text-[10px] text-slate-500">TEU ({totalPrevGap} → {totalCurGap})</span>
                  {compareResult.totalGapDelta > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5 text-alert-red ml-auto" />
                  ) : compareResult.totalGapDelta < 0 ? (
                    <TrendingDown className="h-3.5 w-3.5 text-carbon-400 ml-auto" />
                  ) : null}
                </div>
              </div>

              <div className="rounded-md border border-surface-border bg-surface-dark p-3">
                <div className="text-[11px] text-slate-400">新增建议</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-din text-2xl font-bold text-blue-400">{compareResult.recAdded.length}</span>
                  <span className="text-[10px] text-slate-500">条</span>
                  <PlusIcon className="h-3.5 w-3.5 text-blue-400 ml-auto" />
                </div>
              </div>

              <div className="rounded-md border border-surface-border bg-surface-dark p-3">
                <div className="text-[11px] text-slate-400">移除建议</div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="font-din text-2xl font-bold text-slate-500">{compareResult.recRemoved.length}</span>
                  <span className="text-[10px] text-slate-500">条</span>
                  <MinusIcon className="h-3.5 w-3.5 text-slate-500 ml-auto" />
                </div>
              </div>
            </div>
          )}

          {!compareResult.isSameInput && compareResult.gapDiff.length > 0 && (
            <div className="mt-3 rounded-md border border-surface-border bg-surface-dark p-3">
              <div className="mb-2 text-[11px] text-slate-400">时段缺口变化（仅显示变化项）</div>
              <div className="flex flex-wrap gap-2">
                {compareResult.gapDiff.slice(0, 12).map(gd => (
                  <div key={gd.hour} className={cn('flex items-center gap-1 rounded px-2 py-1 text-[10px]',
                    gd.delta > 0 ? 'bg-alert-red/10 text-alert-red' : 'bg-carbon-500/10 text-carbon-400'
                  )}>
                    <span className="text-slate-400">{gd.hour}</span>
                    <span className="text-slate-500">{gd.previous}→{gd.current}</span>
                    {gd.delta > 0 ? (
                      <span className="font-din">+{gd.delta}</span>
                    ) : (
                      <span className="font-din">{gd.delta}</span>
                    )}
                  </div>
                ))}
                {compareResult.gapDiff.length > 12 && (
                  <span className="text-[10px] text-slate-500 self-center">+{compareResult.gapDiff.length - 12} 个时段</span>
                )}
              </div>
            </div>
          )}

          {!compareResult.isSameInput && (compareResult.recAdded.length > 0 || compareResult.recRemoved.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-3">
              {compareResult.recAdded.length > 0 && (
                <div className="rounded-md border border-blue-500/20 bg-blue-500/5 p-3">
                  <div className="mb-2 flex items-center gap-1 text-[11px] text-blue-400"><Plus className="h-3 w-3" /> 新增建议</div>
                  <div className="space-y-1.5">
                    {compareResult.recAdded.map(r => (
                      <div key={r.id} className="text-[10px] text-slate-300 rounded bg-surface-card px-2 py-1">
                        <span className="inline-block mr-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-300 font-medium">{r.priority}</span>
                        {r.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {compareResult.recRemoved.length > 0 && (
                <div className="rounded-md border border-slate-600/30 bg-slate-600/5 p-3">
                  <div className="mb-2 flex items-center gap-1 text-[11px] text-slate-400"><Minus className="h-3 w-3" /> 移除建议</div>
                  <div className="space-y-1.5">
                    {compareResult.recRemoved.map(r => (
                      <div key={r.id} className="text-[10px] text-slate-500 line-through rounded bg-surface-card px-2 py-1">
                        <span className="inline-block mr-1 rounded bg-slate-600/20 px-1.5 py-0.5 text-slate-400 font-medium">{r.priority}</span>
                        {r.description}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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
          {predictionHistory && <span className="ml-2 text-[10px] text-slate-500 font-normal">紫色虚线 = 上次需求基准</span>}
        </h3>
        <ReactECharts option={chartOption} style={{ height: 320 }} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <AlertCircle className="h-4 w-4 text-alert-red" />
            运力缺口时段
          </h3>
          {data.gap.map((g, i) => {
            const prevGapOfSlot = compareResult?.gapDiff.find(d => d.hour === g.startHour)
            return (
              <div key={i} className="rounded-lg border border-alert-red/30 bg-surface-card p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs text-slate-400">缺口时段 {i + 1}</span>
                  <div className="flex items-center gap-2">
                    {prevGapOfSlot && (
                      <span className={cn('text-[10px] font-din rounded px-1.5 py-0.5',
                        prevGapOfSlot.delta > 0 ? 'bg-alert-red/20 text-alert-red' : 'bg-carbon-500/20 text-carbon-400'
                      )}>
                        {prevGapOfSlot.delta > 0 ? '↑' : '↓'}{Math.abs(prevGapOfSlot.delta)}
                      </span>
                    )}
                    <span className="rounded-full bg-alert-red/20 px-2 py-0.5 text-xs font-medium text-alert-red">-{g.gapAmount} TEU</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span className="font-din">{g.startHour}</span>
                  <span className="text-slate-500">→</span>
                  <span className="font-din">{g.endHour}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <TrendingUp className="h-4 w-4 text-carbon-500" />
            优化建议
          </h3>
          {data.recommendations.map((rec: Recommendation) => {
            const isNew = compareResult?.recAdded.some(r => r.id === rec.id)
            const isRemoved = compareResult?.recRemoved.some(r => r.id === rec.id)
            return (
              <div key={rec.id} className={cn('card-glow rounded-lg border bg-surface-card p-4 transition-shadow',
                isNew ? 'border-blue-500/60 ring-1 ring-blue-500/30' : 'border-surface-border',
                isRemoved ? 'opacity-50 line-through' : ''
              )}>
                <div className="mb-2 flex items-center gap-2">
                  {isNew && <span className="rounded bg-blue-500/30 px-1.5 py-0.5 text-[10px] text-blue-200 font-medium">NEW</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${typeColor[rec.type]}`}>{rec.type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColor[rec.priority]}`}>{rec.priority}优先</span>
                </div>
                <p className="mb-1 text-sm text-slate-300">{rec.description}</p>
                <p className="text-xs text-carbon-400">预期效果：{rec.expectedEffect}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
