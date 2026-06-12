import ReactECharts from 'echarts-for-react'
import { useAppStore } from '@/store'
import type { DiagnosticReport } from '@/types'
import { TrendingUp, TrendingDown, Leaf, DollarSign, Lightbulb, Shield } from 'lucide-react'
import { useMemo } from 'react'

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
            <span className={wowUp ? 'text-alert-red' : 'text-carbon-500'}>{wowUp ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}环比 {wowUp ? '+' : ''}{tt.weekOnWeek}</span>
            <span className={yoyUp ? 'text-alert-red' : 'text-carbon-500'}>{yoyUp ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}同比 {yoyUp ? '+' : ''}{tt.yearOnYear}</span>
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
          <h3 className="mb-4 flex items-center gap-2 text-base font-semibold"><Lightbulb className="h-4 w-4 text-carbon-500" />优化建议</h3>
          <div className="grid grid-cols-2 gap-4">
            {report.recommendations.map((r, i) => (
              <div key={i} className="rounded-lg border border-surface-border bg-surface-dark p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-medium text-white ${typeColor[r.type]}`}>{r.type}</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-medium text-white ${priorityColor[r.priority]}`}>{r.priority}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{r.description}</p>
                <p className="mt-1 text-xs text-carbon-400">预期收益：{r.expectedSaving}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
