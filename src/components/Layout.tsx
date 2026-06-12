import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, AlertTriangle, Boxes, TrendingUp, FileText, Bell, ChevronDown, X, Clock, AlertOctagon, CheckSquare, Timer } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { UserRole, AlertGroupKey } from '@/types'

const navItems = [
  { path: '/', label: '核心看板', icon: LayoutDashboard },
  { path: '/alert', label: '预警中心', icon: AlertTriangle },
  { path: '/archive', label: '联运档案', icon: Boxes },
  { path: '/prediction', label: '运力预测', icon: TrendingUp },
  { path: '/report', label: '诊断报告', icon: FileText },
]

const roleLabels: Record<UserRole, string> = {
  scheduler: '调度员',
  regional_manager: '区域经理',
  hq_director: '总部总监',
}

const pageTitleMap: Record<string, string> = {
  '/': '核心看板',
  '/alert': '预警中心',
  '/archive': '联运档案',
  '/prediction': '运力预测',
  '/report': '诊断报告',
}

const groupIcon: Record<AlertGroupKey, typeof AlertOctagon> = {
  level1: AlertTriangle,
  level2: AlertOctagon,
  pendingApproval: CheckSquare,
  overdue: Timer,
}
const groupColor: Record<AlertGroupKey, string> = {
  level1: 'text-alert-orange',
  level2: 'text-alert-red',
  pendingApproval: 'text-blue-400',
  overdue: 'text-red-500',
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { userRole, setUserRole, getUnresolvedAlertCount, getGroupedAlerts, setTriggeredAlertId } = useAppStore()
  const [roleOpen, setRoleOpen] = useState(false)
  const [bellOpen, setBellOpen] = useState(false)
  const [activeGroup, setActiveGroup] = useState<AlertGroupKey | 'all'>('all')
  const bellRef = useRef<HTMLDivElement>(null)

  const unresolvedCount = getUnresolvedAlertCount()
  const groups = getGroupedAlerts()
  const baseRoute = '/' + location.pathname.split('/')[1]
  const pageTitle = pageTitleMap[baseRoute] || '港口详情'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClickAlert = (id: string) => {
    setBellOpen(false)
    setTriggeredAlertId(id)
    navigate('/alert')
  }

  const displayItems = activeGroup === 'all'
    ? groups.flatMap(g => g.items).slice(0, 8)
    : groups.find(g => g.key === activeGroup)?.items.slice(0, 10) ?? []

  return (
    <div className="flex h-screen bg-surface-dark text-slate-200">
      <aside className="flex w-60 flex-shrink-0 flex-col bg-navy-900">
        <div className="flex h-16 items-center gap-2 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-carbon-500">
            <LayoutDashboard className="h-4 w-4 text-navy-900" />
          </div>
          <span className="text-lg font-semibold tracking-tight">多式联运</span>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path || (path !== '/' && location.pathname.startsWith(path))
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-carbon-500/10 text-carbon-500'
                    : 'text-slate-400 hover:bg-surface-hover hover:text-slate-200'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-surface-border px-5 py-3">
          <span className="text-xs text-slate-500">多式联运平台 v1.0</span>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-surface-border bg-surface-card px-6">
          <h1 className="text-lg font-semibold">{pageTitle}</h1>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setRoleOpen(!roleOpen)}
                className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-dark px-3 py-1.5 text-sm transition-colors hover:border-carbon-500/40"
              >
                <span>{roleLabels[userRole]}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', roleOpen && 'rotate-180')} />
              </button>
              {roleOpen && (
                <div className="absolute right-0 top-full z-50 mt-1 w-36 overflow-hidden rounded-lg border border-surface-border bg-surface-card shadow-xl">
                  {(Object.entries(roleLabels) as [UserRole, string][]).map(([role, label]) => (
                    <button
                      key={role}
                      onClick={() => { setUserRole(role); setRoleOpen(false) }}
                      className={cn(
                        'flex w-full items-center px-3 py-2 text-sm transition-colors',
                        userRole === role ? 'bg-carbon-500/10 text-carbon-500' : 'text-slate-400 hover:bg-surface-hover hover:text-slate-200'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={bellRef}>
              <button
                onClick={() => setBellOpen(!bellOpen)}
                className={cn('relative rounded-lg p-2 transition-colors',
                  bellOpen ? 'bg-surface-hover text-slate-200' : 'text-slate-400 hover:bg-surface-hover hover:text-slate-200')}
              >
                <Bell className="h-5 w-5" />
                {unresolvedCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-alert-red text-[10px] font-bold text-white">
                    {unresolvedCount}
                  </span>
                )}
              </button>
              {bellOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border border-surface-border bg-surface-card shadow-2xl">
                  <div className="flex items-center justify-between border-b border-surface-border px-4 py-2.5">
                    <span className="text-sm font-medium text-slate-200">预警通知中心</span>
                    <button onClick={() => setBellOpen(false)} className="text-gray-500 hover:text-gray-300">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex border-b border-surface-border px-2 pb-2 pt-2 gap-1 overflow-x-auto">
                    <button onClick={() => setActiveGroup('all')}
                      className={cn('shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                        activeGroup === 'all' ? 'bg-carbon-500 text-surface-dark' : 'bg-surface-dark text-gray-400 hover:text-gray-200')}>
                      全部 {unresolvedCount}
                    </button>
                    {groups.map(g => (
                      <button key={g.key} onClick={() => setActiveGroup(g.key)}
                        className={cn('shrink-0 flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                          activeGroup === g.key ? 'bg-carbon-500 text-surface-dark' : 'bg-surface-dark text-gray-400 hover:text-gray-200')}>
                        {(() => { const I = groupIcon[g.key]; return <I className="h-3 w-3" /> })()}
                        {g.label} {g.count}
                      </button>
                    ))}
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {displayItems.length === 0 ? (
                      <div className="px-4 py-8 text-center text-xs text-gray-500">当前分组无预警</div>
                    ) : displayItems.map(a => (
                      <button key={a.id} onClick={() => handleClickAlert(a.id)}
                        className="w-full border-b border-surface-border/60 px-4 py-2.5 text-left transition-colors hover:bg-surface-hover last:border-b-0">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium',
                              a.level === 1 ? 'bg-alert-orange/20 text-alert-orange' : 'bg-alert-red/20 text-alert-red')}>
                              {a.level}级
                            </span>
                            <span className="text-xs font-medium text-slate-200 max-w-[170px] truncate">{a.routeName}</span>
                          </span>
                          <span className="text-[10px] text-gray-500 whitespace-nowrap pl-2">{a.triggerTime.split(' ')[1]}</span>
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">{a.description}</div>
                        <div className="mt-1 flex items-center justify-between">
                          <span className={cn('text-[10px]',
                            a.status === '待处理' ? 'text-yellow-400' :
                              a.status === '处理中' ? 'text-blue-400' :
                                a.status === '已升级' ? 'text-red-400' : 'text-gray-500')}>
                            <Clock className="inline h-2.5 w-2.5 mr-0.5 align-[-1px]" />{a.status}
                          </span>
                          <span className="text-[10px] text-carbon-500">查看详情 →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-surface-border px-4 py-2">
                    <button onClick={() => { setBellOpen(false); navigate('/alert') }}
                      className="w-full rounded-md bg-surface-dark py-1.5 text-xs text-gray-400 hover:text-carbon-400 transition-colors">
                      前往预警中心查看全部 →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
