import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { Clock, Leaf, DollarSign, RotateCw, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store'
import { transportRoutes } from '@/mock/data'
import type { TransportMode } from '@/types'
import ChinaHeatMap from '@/components/ChinaHeatMap'

const modes: TransportMode[] = ['全部', '铁水联运', '公铁联运', '水水联运', '公水联运']

const sparkline = (data: number[], color: string) => ({
  grid: { top: 2, bottom: 2, left: 0, right: 0 },
  xAxis: { type: 'category', show: false },
  yAxis: { type: 'value', show: false },
  series: [{ type: 'line', data, smooth: true, symbol: 'none', lineStyle: { width: 1.5, color } }],
})

const statusColor: Record<string, string> = {
  '正常': 'bg-carbon-500/20 text-carbon-500',
  '预警': 'bg-alert-orange/20 text-alert-orange',
  '超时': 'bg-alert-red/20 text-alert-red',
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { transportMode, setTransportMode, selectedProvince, setSelectedProvince } = useAppStore()

  const filtered = useMemo(() => {
    return transportRoutes.filter((r) => {
      if (transportMode !== '全部' && r.routeType !== transportMode) return false
      if (selectedProvince && r.province !== selectedProvince) return false
      return true
    })
  }, [transportMode, selectedProvince])

  const kpis = useMemo(() => {
    const rs = filtered.length ? filtered : transportRoutes
    const avg = (fn: (r: typeof rs[0]) => number) => rs.reduce((s, r) => s + fn(r), 0) / rs.length
    return [
      { label: '平均时效', value: avg((r) => r.avgTransitTime).toFixed(1), unit: '天', trend: -2.3, icon: Clock, color: '#00C9A7', data: [5.2, 5.4, 5.8, 5.5, 5.6, 5.7, 5.9] },
      { label: '碳排放强度', value: avg((r) => r.carbonIntensity).toFixed(1), unit: 'kgCO₂/TEU', trend: 1.8, icon: Leaf, color: '#FFD93D', data: [30, 32, 28, 34, 31, 35, 33] },
      { label: '运输成本', value: (avg((r) => r.transportCost) / 1000).toFixed(1), unit: 'k元/TEU', trend: -1.5, icon: DollarSign, color: '#6C8EEF', data: [3.8, 3.6, 3.9, 3.5, 3.7, 3.6, 3.5] },
      { label: '设备周转率', value: (avg((r) => r.equipmentTurnoverRate) * 100).toFixed(0), unit: '%', trend: 0.8, icon: RotateCw, color: '#E879F9', data: [82, 83, 81, 84, 83, 85, 84] },
    ]
  }, [filtered])

  const provinceData = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    ;(filtered.length ? filtered : transportRoutes).forEach((r) => {
      const cur = map.get(r.province) || { total: 0, count: 0 }
      cur.total += r.avgTransitTime
      cur.count += 1
      map.set(r.province, cur)
    })
    return Array.from(map, ([name, v]) => ({ name, avgTransitTime: +(v.total / v.count).toFixed(1), routeCount: v.count }))
  }, [filtered])

  const provinces = useMemo(() => [...new Set(transportRoutes.map((r) => r.province))], [])

  const carbonChart = useMemo(() => {
    const sorted = [...(filtered.length ? filtered : transportRoutes)].sort((a, b) => b.carbonIntensity - a.carbonIntensity).slice(0, 10)
    return {
      grid: { top: 10, bottom: 20, left: 140, right: 40 },
      xAxis: { type: 'value', axisLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8', fontSize: 10 }, splitLine: { lineStyle: { color: '#1E3048' } } },
      yAxis: { type: 'category', data: sorted.map((r) => r.name).reverse(), axisLine: { lineStyle: { color: '#1E3048' } }, axisLabel: { color: '#94A3B8', fontSize: 11, width: 130, overflow: 'truncate' } },
      series: [{
        type: 'bar',
        data: sorted.map((r) => r.carbonIntensity).reverse(),
        barWidth: 14,
        itemStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: '#00C9A7' },
              { offset: 0.5, color: '#FFD93D' },
              { offset: 1, color: '#FF4757' },
            ],
          },
          borderRadius: [0, 3, 3, 0],
        },
        label: { show: true, position: 'right', color: '#94A3B8', fontSize: 10, formatter: '{c}' },
      }],
      tooltip: { trigger: 'axis', backgroundColor: '#141E2E', borderColor: '#1E3048', textStyle: { color: '#E2E8F0', fontSize: 12 } },
    }
  }, [filtered])

  return (
    <div className="min-h-0 space-y-5">
      <div className="grid grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          const up = kpi.trend > 0
          return (
            <div key={kpi.label} className="card-glow rounded-xl border border-surface-border bg-surface-card p-4 transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 whitespace-nowrap text-sm text-slate-400">
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {kpi.label}
                </div>
                <div className={`flex flex-shrink-0 items-center gap-0.5 text-xs ${up ? 'text-alert-red' : 'text-carbon-500'}`}>
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {Math.abs(kpi.trend)}%
                </div>
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <span className="font-din text-3xl font-bold text-slate-100">{kpi.value}</span>
                  <span className="ml-1 text-xs text-slate-500">{kpi.unit}</span>
                </div>
                <ReactECharts option={sparkline(kpi.data, kpi.color)} style={{ width: 70, height: 28 }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex gap-1.5">
          {modes.map((m) => (
            <button
              key={m}
              onClick={() => setTransportMode(m)}
              className={`rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                transportMode === m
                  ? 'bg-carbon-500/20 text-carbon-500 border border-carbon-500/40'
                  : 'bg-surface-card text-slate-400 border border-surface-border hover:border-carbon-500/20'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="relative">
          <select
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="appearance-none rounded-lg border border-surface-border bg-surface-card px-3 py-1.5 pr-8 text-xs text-slate-300 outline-none transition-colors hover:border-carbon-500/30"
          >
            <option value="">全部省份</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="card-glow w-[60%] rounded-xl border border-surface-border bg-surface-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">全国运输时效热力图</h3>
          <div className="h-[420px]">
            <ChinaHeatMap data={provinceData} />
          </div>
        </div>
        <div className="card-glow w-[40%] rounded-xl border border-surface-border bg-surface-card p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-300">碳排放强度 TOP10</h3>
          <ReactECharts option={carbonChart} style={{ height: 420 }} />
        </div>
      </div>

      <div className="card-glow rounded-xl border border-surface-border bg-surface-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-300">路线状态总览</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border text-left text-xs text-slate-500">
                <th className="pb-2 pr-4 font-medium">路线名称</th>
                <th className="pb-2 pr-4 font-medium">联运类型</th>
                <th className="pb-2 pr-4 font-medium">平均时效</th>
                <th className="pb-2 pr-4 font-medium">标准时效</th>
                <th className="pb-2 pr-4 font-medium">碳排放强度</th>
                <th className="pb-2 pr-4 font-medium">运输成本</th>
                <th className="pb-2 pr-4 font-medium">设备周转率</th>
                <th className="pb-2 font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-surface-border/50 transition-colors hover:bg-surface-hover">
                  <td className="py-2.5 pr-4">
                    <button onClick={() => navigate('/alert')} className="text-carbon-400 hover:text-carbon-500 hover:underline">
                      {r.name}
                    </button>
                  </td>
                  <td className="py-2.5 pr-4 text-slate-400">{r.routeType}</td>
                  <td className="py-2.5 pr-4 font-din text-slate-200">{r.avgTransitTime}天</td>
                  <td className="py-2.5 pr-4 font-din text-slate-400">{r.standardTransitTime}天</td>
                  <td className="py-2.5 pr-4 font-din text-slate-300">{r.carbonIntensity}</td>
                  <td className="py-2.5 pr-4 font-din text-slate-300">¥{r.transportCost.toLocaleString()}</td>
                  <td className="py-2.5 pr-4 font-din text-slate-300">{(r.equipmentTurnoverRate * 100).toFixed(0)}%</td>
                  <td className="py-2.5">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColor[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
