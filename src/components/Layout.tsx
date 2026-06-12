import { useState } from 'react'
import { Link, useLocation, Outlet } from 'react-router-dom'
import { LayoutDashboard, AlertTriangle, Boxes, TrendingUp, FileText, Bell, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

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

export default function Layout() {
  const location = useLocation()
  const { userRole, setUserRole, alerts } = useAppStore()
  const [roleOpen, setRoleOpen] = useState(false)

  const unresolvedCount = alerts.filter((a) => a.status !== '已关闭').length
  const baseRoute = '/' + location.pathname.split('/')[1]
  const pageTitle = pageTitleMap[baseRoute] || '港口详情'

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
                      onClick={() => {
                        setUserRole(role)
                        setRoleOpen(false)
                      }}
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

            <button className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-surface-hover hover:text-slate-200">
              <Bell className="h-5 w-5" />
              {unresolvedCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-alert-red text-[10px] font-bold text-white">
                  {unresolvedCount}
                </span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
