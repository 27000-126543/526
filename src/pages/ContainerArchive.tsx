import { useAppStore } from '@/store'
import type { ContainerArchive } from '@/types'
import { Search, Ship, Train, Truck, ShieldCheck, XCircle, Clock, MapPin } from 'lucide-react'
import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'

const transportModes = ['全部', '铁水联运', '公铁联运', '水水联运', '公水联运'] as const
const statusOptions = ['全部', '在途', '中转', '待发', '抵达'] as const

const statusColors: Record<string, string> = {
  '在途': 'bg-blue-500/20 text-blue-400',
  '中转': 'bg-alert-orange/20 text-alert-orange',
  '待发': 'bg-gray-500/20 text-gray-400',
  '抵达': 'bg-carbon-500/20 text-carbon-500',
}

const nodeStatusColors: Record<string, string> = {
  '已完成': 'bg-green-500/20 text-green-400',
  '在站': 'bg-carbon-500/20 text-carbon-500',
  '待到达': 'bg-gray-500/20 text-gray-400',
}

const dsColors: Record<string, string> = {
  'RFID': 'bg-blue-500/20 text-blue-300',
  '门架识别': 'bg-purple-500/20 text-purple-300',
  '海关放行': 'bg-amber-500/20 text-amber-300',
  'GPS': 'bg-green-500/20 text-green-300',
}

const nodeIcons: Record<string, React.ElementType> = {
  '港口': Ship,
  '铁路场站': Train,
  '公路卡口': Truck,
  '海关': ShieldCheck,
}

export default function ContainerArchivePage() {
  const { userRole, getFilteredArchives } = useAppStore()
  const roleData = useMemo(() => getFilteredArchives(), [userRole, getFilteredArchives])

  const [searchNo, setSearchNo] = useState('')
  const [routeFilter, setRouteFilter] = useState('全部')
  const [provinceFilter, setProvinceFilter] = useState('全部')
  const [modeFilter, setModeFilter] = useState<string>('全部')
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  const [timeStart, setTimeStart] = useState('')
  const [timeEnd, setTimeEnd] = useState('')
  const [selected, setSelected] = useState<ContainerArchive | null>(null)

  const routes = useMemo(() => [...new Set(roleData.map((a) => a.routeName))], [roleData])
  const provinces = useMemo(() => [...new Set(roleData.map((a) => a.province))], [roleData])

  const filtered = useMemo(() => {
    return roleData.filter((a) => {
      if (searchNo && !a.containerNo.toLowerCase().includes(searchNo.toLowerCase())) return false
      if (routeFilter !== '全部' && a.routeName !== routeFilter) return false
      if (provinceFilter !== '全部' && a.province !== provinceFilter) return false
      if (modeFilter !== '全部' && a.routeType !== modeFilter) return false
      if (statusFilter !== '全部' && a.currentStatus !== statusFilter) return false
      if (timeStart && a.lastUpdateTime < timeStart) return false
      if (timeEnd && a.lastUpdateTime > timeEnd + '99') return false
      return true
    })
  }, [roleData, searchNo, routeFilter, provinceFilter, modeFilter, statusFilter, timeStart, timeEnd])

  return (
    <div className="space-y-4 font-noto">
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-surface-border bg-surface-card p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">箱号</label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input value={searchNo} onChange={(e) => setSearchNo(e.target.value)} placeholder="搜索箱号" className="h-8 w-40 rounded border border-surface-border bg-surface-dark pl-8 pr-2 text-sm text-white placeholder-gray-500 outline-none focus:border-carbon-500" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">路线</label>
          <select value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)} className="h-8 w-44 rounded border border-surface-border bg-surface-dark px-2 text-sm text-white outline-none focus:border-carbon-500">
            <option value="全部">全部路线</option>
            {routes.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">省份</label>
          <select value={provinceFilter} onChange={(e) => setProvinceFilter(e.target.value)} className="h-8 w-28 rounded border border-surface-border bg-surface-dark px-2 text-sm text-white outline-none focus:border-carbon-500">
            <option value="全部">全部</option>
            {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">运输方式</label>
          <select value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} className="h-8 w-28 rounded border border-surface-border bg-surface-dark px-2 text-sm text-white outline-none focus:border-carbon-500">
            {transportModes.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">状态</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 w-24 rounded border border-surface-border bg-surface-dark px-2 text-sm text-white outline-none focus:border-carbon-500">
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-400">时间段</label>
          <div className="flex items-center gap-1">
            <input type="date" value={timeStart} onChange={(e) => setTimeStart(e.target.value)} className="h-8 w-36 rounded border border-surface-border bg-surface-dark px-2 text-sm text-white outline-none focus:border-carbon-500" />
            <span className="text-gray-500">~</span>
            <input type="date" value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} className="h-8 w-36 rounded border border-surface-border bg-surface-dark px-2 text-sm text-white outline-none focus:border-carbon-500" />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-gray-400 whitespace-nowrap">
              <th className="px-4 py-3 font-medium">箱号</th>
              <th className="px-4 py-3 font-medium">箱型</th>
              <th className="px-4 py-3 font-medium">路线名称</th>
              <th className="px-4 py-3 font-medium">运输方式</th>
              <th className="px-4 py-3 font-medium">省份</th>
              <th className="px-4 py-3 font-medium">当前状态</th>
              <th className="px-4 py-3 font-medium">最近更新</th>
              <th className="px-4 py-3 font-medium">数据来源</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3">
                  <button onClick={() => setSelected(a)} className="text-carbon-500 hover:text-carbon-400 transition-colors">{a.containerNo}</button>
                </td>
                <td className="px-4 py-3 text-gray-200">{a.containerType}</td>
                <td className="px-4 py-3 text-gray-200">{a.routeName}</td>
                <td className="px-4 py-3 text-gray-200">{a.routeType}</td>
                <td className="px-4 py-3 text-gray-200">{a.province}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-medium', statusColors[a.currentStatus])}>{a.currentStatus}</span>
                </td>
                <td className="px-4 py-3 text-gray-400">{a.lastUpdateTime}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-block rounded px-2 py-0.5 text-xs', dsColors[a.timeline[a.timeline.length - 1]?.dataSource ?? 'GPS'])}>{a.timeline[a.timeline.length - 1]?.dataSource ?? '-'}</span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-surface-border bg-surface-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">联运档案详情</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white"><XCircle className="h-5 w-5" /></button>
            </div>

            <div className="mb-6 grid grid-cols-4 gap-3 rounded-lg border border-surface-border bg-surface-dark p-4 text-sm">
              <div><span className="text-gray-500">箱号</span><p className="mt-0.5 text-white">{selected.containerNo}</p></div>
              <div><span className="text-gray-500">箱型</span><p className="mt-0.5 text-white">{selected.containerType}</p></div>
              <div><span className="text-gray-500">路线</span><p className="mt-0.5 text-white">{selected.routeName}</p></div>
              <div><span className="text-gray-500">运输方式</span><p className="mt-0.5 text-white">{selected.routeType}</p></div>
              <div><span className="text-gray-500">状态</span><p className="mt-0.5"><span className={cn('inline-block rounded px-2 py-0.5 text-xs font-medium', statusColors[selected.currentStatus])}>{selected.currentStatus}</span></p></div>
              <div><span className="text-gray-500">RFID</span><p className="mt-0.5 text-carbon-500">{selected.rfid}</p></div>
              <div><span className="text-gray-500">更新时间</span><p className="mt-0.5 text-white">{selected.lastUpdateTime}</p></div>
            </div>

            <h3 className="mb-4 text-sm font-medium text-gray-300">节点时间线</h3>
            <div className="relative pl-8">
              {selected.timeline.map((node, i) => {
                const Icon = nodeIcons[node.type] ?? Ship
                const isLast = i === selected.timeline.length - 1
                const isCompleted = node.status === '已完成'
                const dwellColor = node.dwellHours > 24 ? 'text-red-400' : node.dwellHours > 8 ? 'text-alert-orange' : 'text-gray-400'

                return (
                  <div key={node.id} className="relative pb-6">
                    {!isLast && (
                      <div className={cn('absolute left-[-20px] top-8 w-0.5', isCompleted ? 'bg-green-500/60' : 'bg-gray-600/40 border-l border-dashed border-gray-600')} style={{ height: 'calc(100% - 2rem)' }} />
                    )}
                    <div className={cn('absolute left-[-26px] top-1 flex h-[36px] w-[36px] items-center justify-center rounded-full border-2', isCompleted ? 'border-green-500 bg-green-500/20' : node.status === '在站' ? 'border-carbon-500 bg-carbon-500/20' : 'border-gray-600 bg-gray-600/20')}>
                      <Icon className={cn('h-4 w-4', isCompleted ? 'text-green-400' : node.status === '在站' ? 'text-carbon-400' : 'text-gray-500')} />
                    </div>
                    <div className="rounded-lg border border-surface-border bg-surface-dark p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{node.name}</span>
                        <span className={cn('inline-block rounded px-1.5 py-0.5 text-[10px] font-medium', nodeStatusColors[node.status])}>
                          {node.status === '在站' && <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-carbon-500" />}
                          {node.status}
                        </span>
                        <span className={cn('ml-auto inline-block rounded px-1.5 py-0.5 text-[10px]', dsColors[node.dataSource])}>{node.dataSource}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" />{node.location}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />到达: {node.arrivalTime || '-'}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />离站: {node.departureTime || '-'}</span>
                        {node.dwellHours > 0 && <span className={cn('font-medium', dwellColor)}>停留: {node.dwellHours}h</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
