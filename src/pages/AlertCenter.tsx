import { useState, useEffect, useMemo } from 'react'
import { useAppStore } from '@/store'
import type { AlertItem, ApprovalRecord, TransportRoute } from '@/types'
import { AlertTriangle, Clock, CheckCircle, XCircle, ChevronRight, User, Timer, ArrowUpCircle, Send, X, Ban, CircleOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const levelTabs = ['全部', '一级预警', '二级预警'] as const
const statusTabs = ['全部', '待处理', '处理中', '已升级', '已关闭'] as const

const stepHandlers = [
  { step: 1, role: '调度员确认', handler: '张伟', roleKey: 'scheduler' as const, action: '确认' as const },
  { step: 2, role: '区域经理复核', handler: '李明', roleKey: 'regional_manager' as const, action: '复核' as const },
  { step: 3, role: '总部总监批准', handler: '王刚', roleKey: 'hq_director' as const, action: '批准' as const },
]

const statusColors: Record<string, string> = {
  '待处理': 'bg-yellow-500/20 text-yellow-400',
  '处理中': 'bg-blue-500/20 text-blue-400',
  '已升级': 'bg-red-500/20 text-red-400',
  '已关闭': 'bg-gray-500/20 text-gray-400',
}

function generateAutoAlerts(routes: TransportRoute[]): AlertItem[] {
  const now = new Date()
  const result: AlertItem[] = []
  routes.forEach((r, idx) => {
    const hoursAgo = (idx % 6) * 0.7 + 0.2
    const triggerDate = new Date(now.getTime() - hoursAgo * 3600 * 1000)
    const triggerTime = triggerDate.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    const base = {
      routeId: r.id, routeName: r.name, level: 1 as const, triggerTime,
      status: '待处理' as const,
      approval: { step: 0 as 0 | 1 | 2 | 3, schedulerConfirmed: false, regionalManagerApproved: false, hqDirectorApproved: false, history: [] as ApprovalRecord[] },
    }
    if (r.avgTransitTime > r.standardTransitTime * 1.2) {
      const pct = (((r.avgTransitTime - r.standardTransitTime) / r.standardTransitTime) * 100).toFixed(1)
      result.push({ ...base, id: `AUTO-${r.id}`, type: '时效超标' as const, description: `自动检测：平均时效${r.avgTransitTime}天，超标准${r.standardTransitTime}天${pct}%，已超20%阈值` })
    }
    if (r.status === '超时') {
      const delayBase = {
        ...base,
        id: `AUTO-${r.id}-DELAY`,
        type: '节点滞留' as const,
        description: `自动检测：${r.name}状态为超时，节点严重滞留`,
      }
      result.push(delayBase)
    }
  })
  return result
}

function formatCountdown(diffMs: number): { text: string; urgent: boolean } {
  if (diffMs <= 0) return { text: '已超时', urgent: true }
  const totalMin = Math.floor(diffMs / 60000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  const s = Math.floor((diffMs % 60000) / 1000)
  return {
    text: h > 0 ? `${h}小时${m}分${s}秒` : `${m}分${s}秒`,
    urgent: h < 1,
  }
}

export default function AlertCenter() {
  const { alerts, updateAlert, userRole, getFilteredAlerts, getFilteredRoutes, autoUpgradeAlerts, rejectAlert, closeAlert, triggeredAlertId, setTriggeredAlertId } = useAppStore()
  const [levelFilter, setLevelFilter] = useState<string>('全部')
  const [statusFilter, setStatusFilter] = useState<string>('全部')
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null)
  const [autoMerged, setAutoMerged] = useState(false)
  const [upgraded, setUpgraded] = useState(false)
  const [comment, setComment] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (autoMerged) return
    const routes = getFilteredRoutes()
    const autoAlerts = generateAutoAlerts(routes)
    const existingIds = new Set(alerts.map((a) => a.id))
    const newAlerts = autoAlerts.filter((a) => !existingIds.has(a.id))
    if (newAlerts.length > 0) {
      useAppStore.setState({ alerts: [...alerts, ...newAlerts] })
    }
    setAutoMerged(true)
  }, [autoMerged])

  useEffect(() => {
    if (!autoMerged || upgraded) return
    autoUpgradeAlerts()
    setUpgraded(true)
  }, [autoMerged, upgraded, autoUpgradeAlerts])

  useEffect(() => {
    if (triggeredAlertId && autoMerged) {
      const target = alerts.find((a) => a.id === triggeredAlertId)
      if (target) setSelectedAlert(target)
      setTriggeredAlertId(null)
    }
  }, [triggeredAlertId, autoMerged, alerts])

  const filteredAlerts = useMemo(() => {
    const base = getFilteredAlerts()
    return base.filter((a) => {
      if (levelFilter === '一级预警' && a.level !== 1) return false
      if (levelFilter === '二级预警' && a.level !== 2) return false
      if (statusFilter !== '全部' && a.status !== statusFilter) return false
      return true
    })
  }, [alerts, levelFilter, statusFilter, autoMerged, upgraded])

  const countdownInfo = (alert: AlertItem) => {
    const t = new Date(alert.triggerTime.replace(/\//g, '-')).getTime()
    if (!t) return null
    if (alert.level === 2 || alert.status === '已关闭' || alert.status === '已升级') return null
    const deadline = t + 2 * 3600 * 1000
    return formatCountdown(deadline - now)
  }

  const handleApprove = (alert: AlertItem) => {
    const currentStep = alert.approval.step
    const stepConfig = stepHandlers.find((s) => s.step === currentStep + 1)
    if (!stepConfig || stepConfig.roleKey !== userRole) return

    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    const finalComment = comment.trim() || `${stepConfig.handler}${stepConfig.action}通过`
    const record: ApprovalRecord = {
      step: stepConfig.step,
      role: `${stepConfig.role.split('确认')[0].split('复核')[0].split('批准')[0]} ${stepConfig.handler}`,
      action: stepConfig.action,
      time: now,
      comment: finalComment,
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
    setComment('')
  }

  const handleReject = (alert: AlertItem) => {
    const finalComment = comment.trim() || '处置不符合要求，予以驳回'
    rejectAlert(alert.id, finalComment)
    const latest = alerts.find((a) => a.id === alert.id)
    if (latest) setSelectedAlert({ ...latest })
    setComment('')
  }

  const handleClose = (alert: AlertItem) => {
    const finalComment = comment.trim() || '问题已处理，关闭预警'
    closeAlert(alert.id, finalComment)
    const latest = alerts.find((a) => a.id === alert.id)
    if (latest) setSelectedAlert({ ...latest })
    setComment('')
  }

  const isMyTurnToApprove = (alert: AlertItem) => {
    const nextStep = alert.approval.step + 1
    const stepConfig = stepHandlers.find((s) => s.step === nextStep)
    return stepConfig?.roleKey === userRole && alert.status !== '已关闭'
  }

  const canClose = (alert: AlertItem) => alert.status !== '已关闭'
  const canReject = isMyTurnToApprove

  return (
    <div className="space-y-5 font-noto">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-300">
        <AlertTriangle className="mr-2 inline h-4 w-4" />
        规则：连续3天平均时效超标准值20%或节点滞留超时自动生成一级预警；超过2小时未处置自动升级为二级，进入三级审批流程
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-lg bg-surface-card p-1">
          {levelTabs.map((tab) => (
            <button key={tab} onClick={() => setLevelFilter(tab)} className={cn('rounded-md px-3 py-1.5 text-sm transition-colors', levelFilter === tab ? 'bg-carbon-500 text-surface-dark font-medium' : 'text-gray-400 hover:text-white')}>
              {tab}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-card p-1">
          {statusTabs.map((tab) => (
            <button key={tab} onClick={() => setStatusFilter(tab)} className={cn('rounded-md px-3 py-1.5 text-sm transition-colors', statusFilter === tab ? 'bg-carbon-500 text-surface-dark font-medium' : 'text-gray-400 hover:text-white')}>
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
              <th className="px-4 py-3 font-medium">自动升级倒计时</th>
              <th className="px-4 py-3 font-medium">描述</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredAlerts.map((alert) => {
              const cd = countdownInfo(alert)
              return (
                <tr key={alert.id} className="border-b border-surface-border/50 hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3">
                    <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-medium', alert.level === 1 ? 'bg-alert-orange/20 text-alert-orange' : 'bg-alert-red/20 text-alert-red')}>
                      {alert.level}级
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-200">{alert.type}</td>
                  <td className="px-4 py-3 text-gray-200">{alert.routeName}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{alert.triggerTime}</td>
                  <td className="px-4 py-3">
                    {cd ? (
                      <span className={cn('inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium', cd.urgent ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-yellow-500/20 text-yellow-400')}>
                        <Timer className="h-3 w-3" />{cd.text}
                      </span>
                    ) : alert.level === 2 ? (
                      <span className="inline-flex items-center gap-1 rounded bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">
                        <ArrowUpCircle className="h-3 w-3" />已自动升级
                      </span>
                    ) : (
                      <span className="text-gray-600 text-xs">—</span>
                    )}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-gray-400">{alert.description}</td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-block rounded px-2 py-0.5 text-xs font-medium', statusColors[alert.status])}>
                      {alert.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelectedAlert(alert)} className="flex items-center gap-1 text-carbon-500 hover:text-carbon-400 transition-colors">
                      详情 <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              )
            })}
            {filteredAlerts.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无预警数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => { setSelectedAlert(null); setComment('') }}>
          <div className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-surface-border bg-surface-card p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                预警详情
                <span className={cn('rounded px-2 py-0.5 text-xs font-medium', selectedAlert.level === 1 ? 'bg-alert-orange/20 text-alert-orange' : 'bg-alert-red/20 text-alert-red')}>
                  {selectedAlert.level}级预警
                </span>
                <span className={cn('rounded px-2 py-0.5 text-xs font-medium', statusColors[selectedAlert.status])}>{selectedAlert.status}</span>
              </h2>
              <button onClick={() => { setSelectedAlert(null); setComment('') }} className="text-gray-400 hover:text-white">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-400">预警类型：</span><span className="text-gray-200">{selectedAlert.type}</span></div>
              <div><span className="text-gray-400">线路名称：</span><span className="text-gray-200">{selectedAlert.routeName}</span></div>
              <div><span className="text-gray-400">触发时间：</span><span className="text-gray-200">{selectedAlert.triggerTime}</span></div>
              <div>
                <span className="text-gray-400">自动升级倒计时：</span>
                {(() => {
                  const cd = countdownInfo(selectedAlert)
                  if (cd) return <span className={cn(cd.urgent ? 'text-red-400' : 'text-yellow-400')}><Timer className="inline h-3.5 w-3.5 mr-1" />{cd.text}</span>
                  if (selectedAlert.level === 2) return <span className="text-red-400"><ArrowUpCircle className="inline h-3.5 w-3.5 mr-1" />已升级</span>
                  return <span className="text-gray-500">已关闭</span>
                })()}
              </div>
              <div className="col-span-2"><span className="text-gray-400">描述：</span><span className="text-gray-200">{selectedAlert.description}</span></div>
            </div>

            {selectedAlert.upgradeInfo && (
              <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
                <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-red-300">
                  <ArrowUpCircle className="h-4 w-4" />自动升级详情
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                  <div><span className="text-gray-500">触发后累计：</span>{selectedAlert.upgradeInfo.triggeredHoursAgo} 小时</div>
                  <div><span className="text-gray-500">阈值：</span>{selectedAlert.upgradeInfo.thresholdHours} 小时</div>
                  <div><span className="text-gray-500">升级时间：</span>{selectedAlert.upgradeInfo.upgradedAt}</div>
                  <div className="col-span-2"><span className="text-gray-500">升级理由：</span>{selectedAlert.upgradeInfo.reason}</div>
                </div>
              </div>
            )}

            <div className="mb-5">
              <h3 className="mb-4 text-sm font-medium text-gray-300">审批流程</h3>
              <div className="flex items-start justify-between">
                {stepHandlers.map((s, i) => {
                  const isCompleted = selectedAlert.approval.step >= s.step
                  const isCurrent = selectedAlert.approval.step + 1 === s.step
                  const isPending = !isCompleted && !isCurrent
                  const record = selectedAlert.approval.history.find((h) => h.step === s.step)
                  const isRejected = record?.action === '驳回'

                  return (
                    <div key={s.step} className="flex flex-1 items-start">
                      <div className="flex flex-col items-center max-w-[80px] text-center">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2',
                          isRejected && 'border-orange-500 bg-orange-500/20',
                          isCompleted && !isRejected && 'border-green-500 bg-green-500/20',
                          isCurrent && !isRejected && 'border-carbon-500 bg-carbon-500/20',
                          isPending && !isRejected && 'border-gray-600 bg-gray-600/20')}>
                          {isRejected ? <Ban className="h-4 w-4 text-orange-400" />
                            : isCompleted ? <CheckCircle className="h-4 w-4 text-green-500" />
                              : isCurrent ? <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-carbon-500" />
                                : <Clock className="h-4 w-4 text-gray-600" />}
                        </div>
                        <span className={cn('mt-1 text-xs', isRejected ? 'text-orange-400' : isCompleted ? 'text-green-400' : isCurrent ? 'text-carbon-400' : 'text-gray-600')}>{s.role}</span>
                        <span className="flex items-center gap-1 text-[10px] mt-0.5">
                          <User className="h-2.5 w-2.5" />
                          <span className={cn(isCurrent ? 'text-carbon-400' : 'text-gray-500')}>{s.handler}</span>
                        </span>
                        {record ? (
                          <span className="text-[10px] mt-0.5 text-gray-500 whitespace-nowrap">{record.time.split(' ')[1]}</span>
                        ) : isCurrent && selectedAlert.status !== '已关闭' ? (
                          <span className="text-[10px] mt-0.5 text-carbon-400 animate-pulse">待处理</span>
                        ) : null}
                      </div>
                      {i < stepHandlers.length - 1 && (
                        <div className={cn('mt-4 h-0.5 flex-1', selectedAlert.approval.step > s.step ? 'bg-green-500' : 'bg-gray-700')} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {(selectedAlert.approval.history.length > 0 || selectedAlert.upgradeInfo) && (
              <div className="mb-5">
                <h3 className="mb-2 text-sm font-medium text-gray-300">处置时间线</h3>
                <div className="space-y-2 rounded-lg border border-surface-border bg-surface-dark p-3">
                  <div className="flex gap-3 text-xs">
                    <div className="flex flex-col items-center pt-0.5">
                      <span className="h-2 w-2 rounded-full bg-alert-orange shrink-0 mt-0.5" />
                      <span className="w-px bg-surface-border flex-1 mt-1" />
                    </div>
                    <div className="flex-1 pb-2">
                      <div className="text-gray-400 flex justify-between">
                        <span className="text-alert-orange font-medium">系统 · 预警触发</span>
                        <span>{selectedAlert.triggerTime}</span>
                      </div>
                      <div className="text-gray-300 mt-0.5">{selectedAlert.description}</div>
                    </div>
                  </div>

                  {selectedAlert.upgradeInfo && (
                    <div className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center pt-0.5">
                        <span className="h-2 w-2 rounded-full bg-alert-red shrink-0 mt-0.5" />
                        <span className="w-px bg-surface-border flex-1 mt-1" />
                      </div>
                      <div className="flex-1 pb-2">
                        <div className="text-gray-400 flex justify-between">
                          <span className="text-alert-red font-medium">系统 · 自动升级</span>
                          <span>{selectedAlert.upgradeInfo.upgradedAt}</span>
                        </div>
                        <div className="text-gray-300 mt-0.5">{selectedAlert.upgradeInfo.reason}</div>
                      </div>
                    </div>
                  )}

                  {selectedAlert.approval.history.map((h, i) => {
                    const colorMap: Record<string, string> = { '确认': 'text-blue-400', '复核': 'text-purple-400', '批准': 'text-green-400', '驳回': 'text-orange-400', '关闭': 'text-gray-400' }
                    const dotMap: Record<string, string> = { '确认': 'bg-blue-400', '复核': 'bg-purple-400', '批准': 'bg-green-400', '驳回': 'bg-orange-400', '关闭': 'bg-gray-500' }
                    const isLast = i === selectedAlert.approval.history.length - 1
                    return (
                      <div key={i} className="flex gap-3 text-xs">
                        <div className="flex flex-col items-center pt-0.5">
                          <span className={cn('h-2 w-2 rounded-full shrink-0 mt-0.5', dotMap[h.action])} />
                          {!isLast && <span className="w-px bg-surface-border flex-1 mt-1" />}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="text-gray-400 flex justify-between">
                            <span className={cn('font-medium', colorMap[h.action])}>{h.role} · {h.action}</span>
                            <span>{h.time}</span>
                          </div>
                          <div className="text-gray-300 mt-0.5">{h.comment}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {selectedAlert.status !== '已关闭' && (
              <div className="mb-4">
                <label className="mb-1 block text-xs text-gray-400">处理意见（可选）</label>
                <div className="flex gap-2">
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="请输入处置说明或备注..."
                    className="flex-1 rounded-lg border border-surface-border bg-surface-dark px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-carbon-500/50 focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {isMyTurnToApprove(selectedAlert) && (
                <>
                  <button onClick={() => handleApprove(selectedAlert)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-carbon-500 py-2.5 text-sm font-medium text-surface-dark hover:bg-carbon-400 transition-colors">
                    <CheckCircle className="h-4 w-4" />
                    {stepHandlers.find((s) => s.step === selectedAlert.approval.step + 1)?.action}通过
                  </button>
                  {canReject(selectedAlert) && (
                    <button onClick={() => handleReject(selectedAlert)} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-orange-500/50 bg-orange-500/10 py-2.5 text-sm font-medium text-orange-400 hover:bg-orange-500/20 transition-colors">
                      <Ban className="h-4 w-4" />驳回
                    </button>
                  )}
                </>
              )}
              {!isMyTurnToApprove(selectedAlert) && selectedAlert.status !== '已关闭' && !isMyTurnToApprove(selectedAlert) && (
                <div className="flex-1 rounded-lg border border-dashed border-surface-border py-2.5 text-center text-xs text-gray-500">
                  当前非您处理环节：{
                    selectedAlert.approval.step >= 3 ? '审批已完成' : `等待${stepHandlers[selectedAlert.approval.step]?.handler || ''}处理`
                  }
                </div>
              )}
              {canClose(selectedAlert) && (
                <button onClick={() => handleClose(selectedAlert)} className="flex items-center justify-center gap-1 rounded-lg border border-gray-500/40 bg-gray-500/10 px-5 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-500/20 transition-colors">
                  <CircleOff className="h-4 w-4" />关闭
                </button>
              )}
              <button onClick={() => { setSelectedAlert(null); setComment('') }} className="rounded-lg border border-surface-border px-5 py-2.5 text-sm text-gray-400 hover:bg-surface-hover transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
