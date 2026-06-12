import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactECharts from 'echarts-for-react'
import { ports } from '@/mock/data'
import { ArrowLeft } from 'lucide-react'

const modeColors: Record<string, string> = {
  '铁水联运': '#00C9A7',
  '公铁联运': '#3B82F6',
  '水水联运': '#8B5CF6',
  '公水联运': '#FF8C42',
}

const statusStyles: Record<string, string> = {
  '正常': 'bg-carbon-500/20 text-carbon-400',
  '预警': 'bg-alert-orange/20 text-alert-orange',
  '超时': 'bg-alert-red/20 text-alert-red',
}

export default function PortDetail() {
  const { portId } = useParams<{ portId: string }>()
  const navigate = useNavigate()
  const port = ports.find((p) => p.id === portId)

  if (!port) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-400">未找到该港口信息</p>
        <Link to="/" className="text-carbon-500 hover:underline">返回首页</Link>
      </div>
    )
  }

  const throughputOption = {
    backgroundColor: 'transparent',
    grid: { top: 40, right: 20, bottom: 30, left: 60 },
    xAxis: {
      type: 'category' as const,
      data: port.throughput7Days.map((d) => d.date.slice(5)),
      axisLine: { lineStyle: { color: '#1E3048' } },
      axisLabel: { color: '#94A3B8', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: {
      type: 'value' as const,
      axisLine: { show: false },
      axisLabel: { color: '#94A3B8', fontSize: 11, formatter: (v: number) => (v / 10000).toFixed(0) + '万' },
      splitLine: { lineStyle: { color: '#1E3048', type: 'dashed' as const } },
    },
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: '#141E2E',
      borderColor: '#1E3048',
      textStyle: { color: '#E2E8F0', fontSize: 12 },
      formatter: (params: { name: string; value: number }[]) => {
        const p = params[0]
        return `${p.name}<br/>吞吐量: <b>${p.value.toLocaleString()}</b> TEU`
      },
    },
    series: [{
      type: 'line' as const,
      data: port.throughput7Days.map((d) => d.value),
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: '#00C9A7', width: 2 },
      itemStyle: { color: '#00C9A7' },
      areaStyle: {
        color: {
          type: 'linear' as const,
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(0,201,167,0.35)' },
            { offset: 1, color: 'rgba(0,201,167,0)' },
          ],
        },
      },
    }],
  }

  const totalCount = port.transportModeDistribution.reduce((s, d) => s + d.count, 0)
  const distributionOption = {
    backgroundColor: 'transparent',
    legend: {
      orient: 'vertical' as const,
      right: 10,
      top: 'center',
      textStyle: { color: '#94A3B8', fontSize: 12 },
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      formatter: (name: string) => {
        const item = port.transportModeDistribution.find((d) => d.mode === name)
        return item ? `${name}  ${(item.ratio * 100).toFixed(0)}%` : name
      },
    },
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: '#141E2E',
      borderColor: '#1E3048',
      textStyle: { color: '#E2E8F0', fontSize: 12 },
      formatter: (p: { name: string; value: number }) => `${p.name}<br/>箱量: <b>${p.value.toLocaleString()}</b> TEU`,
    },
    series: [{
      type: 'pie' as const,
      radius: ['50%', '75%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: false,
      label: {
        show: true,
        position: 'center',
        formatter: `{a|${totalCount.toLocaleString()}}\n{b|总箱量 TEU}`,
        rich: {
          a: { fontSize: 20, fontWeight: 'bold', color: '#E2E8F0', lineHeight: 28 },
          b: { fontSize: 11, color: '#64748B', lineHeight: 18 },
        },
      },
      data: port.transportModeDistribution.map((d) => ({
        name: d.mode,
        value: d.count,
        itemStyle: { color: modeColors[d.mode] },
      })),
    }],
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-surface-border bg-surface-card text-slate-400 transition-colors hover:border-carbon-500/40 hover:text-carbon-500"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-xl font-semibold text-slate-100">{port.name}</h2>
          <p className="text-sm text-slate-500">{port.province}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <h3 className="mb-3 text-sm font-medium text-slate-400">7日吞吐量趋势</h3>
          <ReactECharts option={throughputOption} style={{ height: 280 }} />
        </div>
        <div className="rounded-xl border border-surface-border bg-surface-card p-5">
          <h3 className="mb-3 text-sm font-medium text-slate-400">运输方式分布</h3>
          <ReactECharts option={distributionOption} style={{ height: 280 }} />
        </div>
      </div>

      <div className="rounded-xl border border-surface-border bg-surface-card p-5">
        <h3 className="mb-4 text-sm font-medium text-slate-400">航线列表</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-slate-500">
              <th className="pb-3 font-medium">航线名称</th>
              <th className="pb-3 font-medium">在途箱量(TEU)</th>
              <th className="pb-3 font-medium">平均时效(天)</th>
              <th className="pb-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {port.routes.map((route) => (
              <tr
                key={route.id}
                onClick={() => navigate('/alert')}
                className="cursor-pointer border-b border-surface-border transition-colors hover:bg-surface-hover"
              >
                <td className="py-3 text-slate-200">{route.name}</td>
                <td className="py-3 font-din text-slate-200">{route.inTransitContainers}</td>
                <td className="py-3 font-din text-slate-200">{route.avgTransitTime}</td>
                <td className="py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyles[route.status]}`}>
                    {route.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
