import ReactECharts from 'echarts-for-react'
import { useAppStore } from '@/store'
import type { DiagnosticReport } from '@/types'
import { TrendingUp, TrendingDown, Leaf, DollarSign, Lightbulb, Shield, ChevronDown, ChevronUp, Route, Anchor, Clock, BarChart3 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'

const priorityColor: Record<string, string> = { 高: 'bg-alert-red', 中: 'bg-alert-orange', 低: 'bg-carbon-500' }
const typeColor: Record<string, string> = { 优化路径: 'bg-carbon-500', 减排策略: 'bg-blue-500' }

const transitChartOpt = (r: DiagnosticReport) => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis', backgroundColor: '#141E2E', borderColor: '#1E3048', textStyle: { color: '#E2E8F0' } },
  legend: { data: ['全程时效', '环比变化'], textStyle: { color: '#94A3B8' }, top: 0 },
  grid: { left: 50, right: 50, top: 40, bottom: 30 },
  xAxis: { type: 'category', data: r.transitTime.dailyData.map(d => d.date.slice(5)), axisLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8' } },
  yAxis: [
    { type: 'value', name: '天', nameTextStyle: { color: '#94A3B8' }, axisLine: { lineStyle: { color: '#1E3048' } }, splitLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8' } },
    { type: 'value', name: '%', nameTextStyle: { color: '#94A3B8' }, axisLine: { lineStyle: { color: '#1E3048' } }, splitLine: { show: false }, axisLabel: { color: '#94A3B8' } },
  ],
  series: [
    {
      name: '全程时效', type: 'line', data: r.transitTime.dailyData.map(d => d.value),
      smooth: true, lineStyle: { color: '#00C9A7', width: 2 }, itemStyle: { color: '#00C9A7' },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(0,201,167,0.2)' }, { offset: 1, color: 'rgba(0,201,167,0)' }] } },
      markPoint: { data: r.transitTime.dailyData.filter(d => d.wowChange > 0.3).map(d => ({ coord: [d.date.slice(5), d.value], itemStyle: { color: '#FF4757' }, symbolSize: 10 })) },
    },
    {
      name: '环比变化', type: 'bar', yAxisIndex: 1, data: r.transitTime.dailyData.map(d => d.wowChange * 100),
      itemStyle: { color: (p: { value: number }) => p.value > 30 ? '#FF4757' : '#1E3048', borderRadius: [2, 2, 0, 0] }, barWidth: 16,
    },
  ],
})

const carbonPieOpt = (r: DiagnosticReport) => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'item', backgroundColor: '#141E2E', borderColor: '#1E3048', textStyle: { color: '#E2E8F0' } },
  series: [{
    type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'],
    label: { color: '#94A3B8', formatter: '{b}\n{d}%' },
    data: r.carbonEmission.distribution.map((d, i) => ({
      name: d.mode, value: d.amount,
      itemStyle: { color: ['#00C9A7', '#3B82F6', '#A855F7', '#F59E0B'][i] },
    })),
  }],
})

const carbonTrendOpt = (r: DiagnosticReport) => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis', backgroundColor: '#141E2E', borderColor: '#1E3048', textStyle: { color: '#E2E8F0' } },
  grid: { left: 50, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'category', data: r.carbonEmission.trend.map(d => d.week.slice(8)), axisLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8' } },
  yAxis: { type: 'value', axisLine: { lineStyle: { color: '#1E3048' } }, splitLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8' } },
  series: [{
    type: 'line', data: r.carbonEmission.trend.map(d => d.value), smooth: true,
    lineStyle: { color: '#3B82F6', width: 2 }, itemStyle: { color: '#3B82F6' },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.15)' }, { offset: 1, color: 'rgba(59,130,246,0)' }] } },
  }],
})

const costPieOpt = (r: DiagnosticReport) => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'item', backgroundColor: '#141E2E', borderColor: '#1E3048', textStyle: { color: '#E2E8F0' } },
  series: [{
    type: 'pie', radius: ['45%', '70%'], center: ['50%', '50%'],
    label: { color: '#94A3B8', formatter: '{b}\n{d}%' },
    data: r.costStructure.breakdown.map((d, i) => ({
      name: d.category, value: d.amount,
      itemStyle: { color: ['#00C9A7', '#3B82F6', '#F59E0B', '#A855F7', '#EC4899', '#6B7280'][i] },
    })),
  }],
})

const costTrendOpt = (r: DiagnosticReport) => ({
  backgroundColor: 'transparent',
  tooltip: { trigger: 'axis', backgroundColor: '#141E2E', borderColor: '#1E3048', textStyle: { color: '#E2E8F0' } },
  grid: { left: 50, right: 20, top: 20, bottom: 30 },
  xAxis: { type: 'category', data: r.costStructure.trend.map(d => d.week.slice(8)), axisLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8' } },
  yAxis: { type: 'value', axisLine: { lineStyle: { color: '#1E3048' } }, splitLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8' } },
  series: [{
    type: 'line', data: r.costStructure.trend.map(d => d.value), smooth: true,
    lineStyle: { color: '#F59E0B', width: 2 }, itemStyle: { color: '#F59E0B' },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(245,158,11,0.15)' }, { offset: 1, color: 'rgba(245,158,11,0)' }] } },
  }],
})

const scopeLabel: Record<string, string> = {
  scheduler: '上海站点',
  regional_manager: '华东区域',
  hq_director: '全国',
}

export default function Report() {
  const report = useAppStore().getFilteredReport()
  const { userRole, transportMode, selectedProvince } = useAppStore()
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  const scopeText = scopeLabel[userRole] || '全国'
  const modeText = transportMode === '全部' ? '' : ` · ${transportMode}`
  const provText = selectedProvince ? ` · ${selectedProvince}` : ''

  const tt = report.transitTime
  const wowUp = tt.weekOnWeek > 0
  const yoyUp = tt.yearOnYear > 0

  const transitAnalysis = useMemo(() => {
    const anomalies = tt.dailyData.filter(d => Math.abs(d.wowChange) > 0.3)
    if (!anomalies.length) return `本周全程时效为${tt.current}天，整体波动在正常范围内。`
    const dates = anomalies.map(d => d.date.slice(5)).join('、')
    return `本周全程时效${tt.current}天，${dates}环比变化超过30%，为异常波动点，需关注相关航线节点滞留情况。`
  }, [tt])

  const carbonAnalysis = useMemo(() => {
    if (!report.carbonEmission.distribution.length) return '暂无碳排放数据。'
    const top = report.carbonEmission.distribution.slice().sort((a, b) => b.amount - a.amount)
    const first = top[0]
    return `${first.mode}碳排放占比最高（${(first.ratio * 100).toFixed(1)}%），近7周总碳排放呈持续下降趋势。`
  }, [report.carbonEmission])

  const costAnalysis = useMemo(() => {
    if (!report.costStructure.breakdown.length) return '暂无成本数据。'
    const top2 = report.costStructure.breakdown.slice(0, 2)
    return `${top2.map(c => `${c.category}占总成本${(c.ratio * 100).toFixed(1)}%`).join('，')}。近7周总成本持续优化。`
  }, [report.costStructure])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Shield className="h-4 w-4" />
        数据范围：{scopeText}{modeText}{provText}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
          <div className="flex items-center gap-2 text-slate-400 text-sm"><TrendingUp className="h-4 w-4" />全程时效</div>
          <div className="mt-2 font-din text-3xl font-bold">{tt.current}<span className="ml-1 text-base font-normal text-slate-400">天</span></div>
          <div className="mt-2 flex gap-4 text-xs">
            <span className={wowUp ? 'text-alert-red' : 'text-carbon-500'}>{wowUp ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />} 环比 {wowUp ? '+' : ''}{tt.weekOnWeek}</span>
            <span className={yoyUp ? 'text-alert-red' : 'text-carbon-500'}>{yoyUp ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />} 同比 {yoyUp ? '+' : ''}{tt.yearOnYear}</span>
          </div>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
          <div className="flex items-center gap-2 text-slate-400 text-sm"><Leaf className="h-4 w-4" />碳排放量</div>
          <div className="mt-2 font-din text-3xl font-bold">{report.carbonEmission.total}<span className="ml-1 text-base font-normal text-slate-400">tCO₂</span></div>
          <div className="mt-2 text-xs text-carbon-500"><TrendingDown className="inline h-3 w-3" /> 持续优化趋势</div>
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
          <div className="flex items-center gap-2 text-slate-400 text-sm"><DollarSign className="h-4 w-4" />运输成本</div>
          <div className="mt-2 font-din text-3xl font-bold">{report.costStructure.total}<span className="ml-1 text-base font-normal text-slate-400">万元</span></div>
          <div className="mt-2 text-xs text-carbon-500"><TrendingDown className="inline h-3 w-3" /> 持续优化趋势</div>
        </div>
      </div>

      <section className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
        <h3 className="mb-4 text-base font-semibold">全程时效分析</h3>
        <ReactECharts option={transitChartOpt(report)} style={{ height: 280 }} />
        <p className="mt-3 text-sm text-slate-400">{transitAnalysis}</p>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
        <h3 className="mb-4 text-base font-semibold">碳排放分析</h3>
        <div className="grid grid-cols-2 gap-4">
          <ReactECharts option={carbonPieOpt(report)} style={{ height: 260 }} />
          <ReactECharts option={carbonTrendOpt(report)} style={{ height: 260 }} />
        </div>
        <p className="mt-3 text-sm text-slate-400">{carbonAnalysis}</p>
      </section>

      <section className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
        <h3 className="mb-4 text-base font-semibold">成本结构分析</h3>
        <div className="grid grid-cols-2 gap-4">
          <ReactECharts option={costPieOpt(report)} style={{ height: 260 }} />
          <ReactECharts option={costTrendOpt(report)} style={{ height: 260 }} />
        </div>
        <p className="mt-3 text-sm text-slate-400">{costAnalysis}</p>
      </section>

      {report.recommendations.length > 0 && (
        <section className="rounded-xl border border-surface-border bg-surface-card p-5 card-glow">
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><Lightbulb className="h-4 w-4 text-carbon-500" />优化建议（点击卡片展开下钻）</h3>
          <div className="space-y-3">
            {report.recommendations.map((r, i) => {
              const isExpanded = expandedIdx === i
              return (
                <div key={i} className="rounded-lg border border-surface-border bg-surface-dark overflow-hidden">
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className="w-full p-4 text-left transition-colors hover:bg-surface-hover/60">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium text-white ${typeColor[r.type]}`}>{r.type}</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium text-white ${priorityColor[r.priority]}`}>{r.priority}</span>
                      </div>
                      <span className="flex-1 text-sm text-slate-300">{r.description}</span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />}
                    </div>
                    <p className="mt-1 text-xs text-carbon-400 ml-16">预期收益：{r.expectedSaving}</p>
                  </button>
                  {isExpanded && r.drilldown && (
                    <div className="border-t border-surface-border p-4 space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-md border border-green-500/30 bg-green-500/5 p-3">
                          <div className="flex items-center gap-1 text-[11px] text-green-400"><Clock className="h-3 w-3" />预计节省时效</div>
                          <div className="mt-1 font-din text-2xl font-bold text-green-400">{r.drilldown.savings.transitDays}<span className="ml-1 text-xs font-normal text-gray-500">天</span></div>
                        </div>
                        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                          <div className="flex items-center gap-1 text-[11px] text-amber-400"><DollarSign className="h-3 w-3" />预计节省成本</div>
                          <div className="mt-1 font-din text-2xl font-bold text-amber-400">{r.drilldown.savings.costWan}<span className="ml-1 text-xs font-normal text-gray-500">万元</span></div>
                        </div>
                        <div className="rounded-md border border-blue-500/30 bg-blue-500/5 p-3">
                          <div className="flex items-center gap-1 text-[11px] text-blue-400"><Leaf className="h-3 w-3" />预计减少碳排放</div>
                          <div className="mt-1 font-din text-2xl font-bold text-blue-400">{r.drilldown.savings.carbonTons}<span className="ml-1 text-xs font-normal text-gray-500">tCO₂</span></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-md border border-surface-border p-3">
                          <div className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-300"><Route className="h-3.5 w-3.5 text-carbon-400" /> 关联线路（{r.drilldown.relatedRoutes.length}）</div>
                          <div className="space-y-1.5">
                            {r.drilldown.relatedRoutes.map((rt, ri) => (
                              <div key={ri} className="flex items-center justify-between rounded bg-surface-card px-2.5 py-1.5 text-xs">
                                <span className="text-slate-300">{rt.name}</span>
                                <span className="text-[10px] text-slate-500">{rt.province} · {rt.routeType}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="rounded-md border border-surface-border p-3">
                          <div className="mb-2 flex items-center gap-1 text-xs font-medium text-slate-300"><Anchor className="h-3.5 w-3.5 text-blue-400" /> 涉及港口（{r.drilldown.relatedPorts.length}）</div>
                          <div className="space-y-1.5">
                            {r.drilldown.relatedPorts.map((p, pi) => (
                              <div key={pi} className="flex items-center justify-between rounded bg-surface-card px-2.5 py-1.5 text-xs">
                                <span className="text-slate-300">{p.name}</span>
                                <span className="text-[10px] text-slate-500">{p.province}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-md border border-carbon-500/30 bg-carbon-500/5 p-3">
                        <div className="mb-2 flex items-center gap-1 text-xs font-medium text-carbon-400">
                          <BarChart3 className="h-3.5 w-3.5" /> 与全国均值对比
                        </div>
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-24 text-slate-400 shrink-0">时效优势</span>
                            <div className="flex-1 h-2 bg-surface-card rounded overflow-hidden">
                              <div className="h-full bg-green-500 rounded" style={{ width: `${Math.min(100, r.drilldown.vsNationalAvg.transitBetterPct)}%` }} />
                            </div>
                            <span className="ml-2 w-12 text-right font-din text-green-400">快 {r.drilldown.vsNationalAvg.transitBetterPct}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-24 text-slate-400 shrink-0">成本优势</span>
                            <div className="flex-1 h-2 bg-surface-card rounded overflow-hidden">
                              <div className="h-full bg-amber-500 rounded" style={{ width: `${Math.min(100, r.drilldown.vsNationalAvg.costBetterPct)}%` }} />
                            </div>
                            <span className="ml-2 w-12 text-right font-din text-amber-400">省 {r.drilldown.vsNationalAvg.costBetterPct}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="w-24 text-slate-400 shrink-0">碳排优势</span>
                            <div className="flex-1 h-2 bg-surface-card rounded overflow-hidden">
                              <div className="h-full bg-blue-500 rounded" style={{ width: `${Math.min(100, r.drilldown.vsNationalAvg.carbonBetterPct)}%` }} />
                            </div>
                            <span className="ml-2 w-12 text-right font-din text-blue-400">少 {r.drilldown.vsNationalAvg.carbonBetterPct}%</span>
                          </div>
                        </div>
                      </div>

                      <div className={cn('text-[11px] px-2 py-1 rounded inline-flex items-center gap-1',
                        r.priority === '高' ? 'bg-alert-red/10 text-alert-red' : r.priority === '中' ? 'bg-alert-orange/10 text-alert-orange' : 'bg-carbon-500/10 text-carbon-400'
                      )}>
                        <Lightbulb className="h-3 w-3" /> 实施优先级：{r.priority}级建议 — {r.expectedSaving}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
