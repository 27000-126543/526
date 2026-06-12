import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { alertItems } from '@/mock/data'
import type { AlertItem, ApprovalRecord } from '@/types'
import { AlertTriangle, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const levelTabs = ['全部', '一级预警', '二级预警'] as const
const statusTabs = ['全部', '待处理', '处理中', '已升级', '已关闭'] as const

const approvalSteps = [
  { step: 1, role: '调度员确认', roleKey: 'scheduler' as const, action: '确认' as const },
  { step: 2, role: '区域经理复核', roleKey: 'regional_manager' as const, action: '复核' as const },
  { step: 3, role: '总部总监批准', roleKey: 'hq_director' as const, action: '批准' as const },
]

const statusColors: Record<string, string> = {
  '待处理': 'bg-yellow-500/20 text-yellow-400',
  '处理中': 'bg-blue-500/20 text-blue-400',
  '已升级': 'bg-red-500/20 text-red-400',
  '已关闭': 'bg-gray-500/20 text-gray-400',
}

export default function AlertCenter() {
  const { alerts, updateAlert, userRole } = useAppStore()
  const [levelFilter, setLevelFilter] = useState<string>('全部')
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null)

  useEffect(() => {
    if (alerts.length === 0) {
      useAppStore.setState({ alerts: alertItems })
    }
  }, [])

  const filtered = alerts.filter((a) => {
    if (levelFilter === '一级预警' && a.level !== 1) return false
    if (levelFilter === '二级预警' && a.level !== 2) return false
    if (statusFilter !== '全部' && a.status !== statusFilter) return false
    return true
  })

  const handleApprove = (alert: AlertItem) => {
    const currentStep = alert.approval.step
    const stepConfig = approvalSteps.find((s) => s.step === currentStep + 1)
    if (!stepConfig || stepConfig.roleKey !== userRole) return

    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    const record: ApprovalRecord = {
      step: stepConfig.step,
      role: stepConfig.role.split('确认')[0].split('复核')[0].split('批准')[0],
      action: stepConfig.action,
      time: now,
      comment: `${stepConfig.action}通过`,
    }

    const newHistory = [...alert.approval.history, record]
    const newStep = (currentStep + 1) as 0 | 1 | 2 | 3
    const updates: Partial<AlertItem> = {
      approval: {
        step: newStep,
        schedulerConfirmed: newStep >= 1,
        regionalManagerApproved: newStep >= 2,
        hqDirectorApproved: newStep >= 3,
        history: newHistory,
      },
      status: newStep === 3 ? '已升级' : newStep > 0 ? '处理中' : alert.status,
    }

    updateAlert(alert.id, updates)
    setSelectedAlert({ ...alert, ...updates } as AlertItem)
  }

  const canApprove = (alert: AlertItem) => {
    const nextStep = alert.approval.step + 1
    const stepConfig = approvalSteps.find((s) => s.step === nextStep)
    return stepConfig?.roleKey === userRole && alert.status !== '已关闭'
  }

  return (
    <div className="space-y-5 font-noto">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-surface-card p-1">
          {levelTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setLevelFilter(tab)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                levelFilter === tab ? 'bg-carbon-500 text-surface-dark font-medium' : 'text-gray-400 hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-card p-1">
          {statusTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-colors',
                statusFilter === tab ? 'bg-carbon-500 text-surface-dark font-medium' : 'text-gray-400 hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-surface-border bg-surface-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-gray-400 whitespace-nowrap">
              <th className="px-4 py-3 font-medium">预警等级</th>
              <th className="px-4 py-3 font-medium">预警类型</th>
              <th className="px-4 py-3 font-medium">线路名称</th>
              <th className="px-4 py-3 font-medium">触发时间</th>
              <th className="px-4 py-3 font-medium">描述</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((alert) => (
              <tr key={alert.id} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      'inline-block rounded px-2 py-0.5 text-xs font-medium',
                      alert.level === 1 ? 'bg-alert-orange/20 text-alert-orange' : 'bg-alert-red/20 text-alert-red'
                    )}
                  >
                    {alert.level}级
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-200">{alert.type}</td>
                <td className="px-4 py-3 text-gray-200">{alert.routeName}</td>
                <td className="px-4 py-3 text-gray-400">{alert.triggerTime}</td>
                <td className="max-w-[200px] truncate px-4 py-3 text-gray-400">{alert.description}</td>
                <td className="px-4 py-3">
                  <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-medium', statusColors[alert.status])}>
                    {alert.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setSelectedAlert(alert)}
                    className="flex items-center gap-1 text-carbon-500 hover:text-carbon-400 transition-colors"
                  >
                    详情 <ChevronRight className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  暂无预警数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedAlert(null)}>
          <div
            className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-surface-border bg-surface-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">预警详情</h2>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-white">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-400">预警等级：</span>
                <span className={selectedAlert.level === 1 ? 'text-alert-orange' : 'text-alert-red'}>
                  {selectedAlert.level}级预警
                </span>
              </div>
              <div>
                <span className="text-gray-400">预警类型：</span>
                <span className="text-gray-200">{selectedAlert.type}</span>
              </div>
              <div>
                <span className="text-gray-400">线路名称：</span>
                <span className="text-gray-200">{selectedAlert.routeName}</span>
              </div>
              <div>
                <span className="text-gray-400">触发时间：</span>
                <span className="text-gray-200">{selectedAlert.triggerTime}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400">描述：</span>
                <span className="text-gray-200">{selectedAlert.description}</span>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="mb-4 text-sm font-medium text-gray-300">审批流程</h3>
              <div className="flex items-start justify-between">
                {approvalSteps.map((s, i) => {
                  const isCompleted = selectedAlert.approval.step >= s.step
                  const isCurrent = selectedAlert.approval.step + 1 === s.step
                  const isPending = !isCompleted && !isCurrent
                  const record = selectedAlert.approval.history.find((h) => h.step === s.step)

                  return (
                    <div key={s.step} className="flex flex-1 items-start">
                      <div className="flex flex-col items-center">
                        <div
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-full border-2',
                            isCompleted && 'border-green-500 bg-green-500/20',
                            isCurrent && 'border-carbon-500 bg-carbon-500/20',
                            isPending && 'border-gray-600 bg-gray-600/20'
                          )}
                        >
                          {isCompleted ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : isCurrent ? (
                            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-carbon-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-gray-600" />
                          )}
                        </div>
                        <span className={cn('mt-1 text-xs', isCompleted ? 'text-green-400' : isCurrent ? 'text-carbon-400' : 'text-gray-600')}>
                          {s.role}
                        </span>
                        {record && <span className="text-[10px] text-gray-500">{record.time}</span>}
                        {record && <span className="max-w-[100px] truncate text-[10px] text-gray-500">{record.comment}</span>}
                      </div>
                      {i < approvalSteps.length - 1 && (
                        <div className={cn('mt-4 h-0.5 flex-1', selectedAlert.approval.step > s.step ? 'bg-green-500' : 'bg-gray-700')} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {selectedAlert.approval.history.length > 0 && (
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-medium text-gray-300">审批记录</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-gray-400">
                      <th className="px-2 py-2 text-left font-medium">步骤</th>
                      <th className="px-2 py-2 text-left font-medium">角色</th>
                      <th className="px-2 py-2 text-left font-medium">操作</th>
                      <th className="px-2 py-2 text-left font-medium">时间</th>
                      <th className="px-2 py-2 text-left font-medium">备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedAlert.approval.history.map((h, i) => (
                      <tr key={i} className="border-b border-surface-border/50">
                        <td className="px-2 py-2 text-gray-300">步骤{h.step}</td>
                        <td className="px-2 py-2 text-gray-300">{h.role}</td>
                        <td className="px-2 py-2 text-carbon-400">{h.action}</td>
                        <td className="px-2 py-2 text-gray-400">{h.time}</td>
                        <td className="px-2 py-2 text-gray-400">{h.comment}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {canApprove(selectedAlert) && (
              <button
                onClick={() => handleApprove(selectedAlert)}
                className="w-full rounded-lg bg-carbon-500 py-2.5 text-sm font-medium text-surface-dark hover:bg-carbon-400 transition-colors"
              >
                {approvalSteps.find((s) => s.step === selectedAlert.approval.step + 1)?.action}通过
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
