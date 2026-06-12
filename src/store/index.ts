import { create } from 'zustand'
import type {
  UserRole, TransportMode, AlertItem, RoleScope, ExcelParsedResult, CapacityPrediction,
  AlertGroup, AlertGroupKey, PredictionHistory, PredictionCompareResult,
} from '@/types'
import { alertItems, transportRoutes, roleScopes, capacityPrediction, containerArchives, ports, diagnosticReport } from '@/mock/data'

function parseTimeStr(s: string): Date {
  const clean = s.replace(/\//g, '-')
  const d = new Date(clean)
  return isNaN(d.getTime()) ? new Date(0) : d
}

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

interface AppState {
  userRole: UserRole
  setUserRole: (role: UserRole) => void
  transportMode: TransportMode
  setTransportMode: (mode: TransportMode) => void
  selectedProvince: string
  setSelectedProvince: (province: string) => void
  alerts: AlertItem[]
  updateAlert: (id: string, updates: Partial<AlertItem>) => void
  autoUpgradeAlerts: () => void
  rejectAlert: (id: string, comment: string) => void
  closeAlert: (id: string, comment: string) => void
  triggeredAlertId: string | null
  setTriggeredAlertId: (id: string | null) => void
  excelResult: ExcelParsedResult | null
  setExcelResult: (result: ExcelParsedResult | null) => void
  predictionData: CapacityPrediction | null
  setPredictionData: (data: CapacityPrediction | null) => void
  predictionHistory: PredictionHistory | null
  setPredictionHistory: (h: PredictionHistory | null) => void
  compareResult: PredictionCompareResult | null
  setCompareResult: (r: PredictionCompareResult | null) => void

  getScope: () => RoleScope
  getFilteredRoutes: () => typeof transportRoutes
  getScopeOnlyAlerts: () => AlertItem[]
  getFilteredAlerts: () => AlertItem[]
  getFilteredPorts: () => typeof ports
  getFilteredArchives: () => typeof containerArchives
  getFilteredReport: () => typeof diagnosticReport
  getUnresolvedAlertCount: () => number
  getGroupedAlerts: () => AlertGroup[]
}

const stepRoleMap: Record<string, UserRole> = { '1': 'scheduler', '2': 'regional_manager', '3': 'hq_director' }
const thresholdHours = 2

export const useAppStore = create<AppState>((set, get) => ({
  userRole: 'hq_director',
  setUserRole: (role) => set({ userRole: role }),
  transportMode: '全部',
  setTransportMode: (mode) => set({ transportMode: mode }),
  selectedProvince: '',
  setSelectedProvince: (province) => set({ selectedProvince: province }),
  alerts: alertItems,
  triggeredAlertId: null,
  setTriggeredAlertId: (id) => set({ triggeredAlertId: id }),
  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, ...updates } : alert
      ),
    })),
  autoUpgradeAlerts: () => {
    const now = new Date()
    const nowStr = now.toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    set((state) => {
      const upgraded = state.alerts.map((a) => {
        if (a.level !== 1) return a
        if (a.status !== '待处理' && a.status !== '处理中') return a
        const t = parseTimeStr(a.triggerTime)
        if (t.getTime() === 0) return a
        const diffH = (now.getTime() - t.getTime()) / 3600000
        if (diffH < thresholdHours) return a
        return {
          ...a,
          level: 2 as const,
          status: '处理中' as const,
          approval: {
            step: 0 as 0 | 1 | 2 | 3,
            schedulerConfirmed: false,
            regionalManagerApproved: false,
            hqDirectorApproved: false,
            history: a.approval.history,
          },
          upgradeInfo: {
            triggeredHoursAgo: +diffH.toFixed(1),
            upgradedAt: nowStr,
            thresholdHours,
            reason: `一级预警已超 ${diffH.toFixed(1)} 小时未处置，按规则自动升级为二级预警`,
          },
        }
      })
      return { alerts: upgraded }
    })
  },
  rejectAlert: (id, comment) => {
    const { userRole, alerts } = get()
    const alert = alerts.find((a) => a.id === id)
    if (!alert || alert.status === '已关闭') return
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    const roleLabel: Record<UserRole, string> = { scheduler: '调度员 张伟', regional_manager: '区域经理 李明', hq_director: '总部总监 王刚' }
    const stepConfig = [
      { key: 'scheduler', step: 1 },
      { key: 'regional_manager', step: 2 },
      { key: 'hq_director', step: 3 },
    ].find((s) => s.key === userRole)
    if (!stepConfig) return
    const record = { step: stepConfig.step, role: roleLabel[userRole], action: '驳回' as const, time: now, comment }
    get().updateAlert(id, {
      status: '已关闭',
      approval: { ...alert.approval, history: [...alert.approval.history, record] },
    })
  },
  closeAlert: (id, comment) => {
    const { userRole, alerts } = get()
    const alert = alerts.find((a) => a.id === id)
    if (!alert || alert.status === '已关闭') return
    const now = new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')
    const roleLabel: Record<UserRole, string> = { scheduler: '调度员 张伟', regional_manager: '区域经理 李明', hq_director: '总部总监 王刚' }
    const record = { step: 0, role: roleLabel[userRole], action: '关闭' as const, time: now, comment }
    get().updateAlert(id, {
      status: '已关闭',
      approval: { ...alert.approval, history: [...alert.approval.history, record] },
    })
  },
  excelResult: null,
  setExcelResult: (result) => set({ excelResult: result }),
  predictionData: capacityPrediction,
  setPredictionData: (data) => set({ predictionData: data }),
  predictionHistory: null,
  setPredictionHistory: (h) => set({ predictionHistory: h }),
  compareResult: null,
  setCompareResult: (r) => set({ compareResult: r }),

  getScope: () => {
    const { userRole } = get()
    return roleScopes.find((s) => s.role === userRole) ?? roleScopes[0]
  },

  getFilteredRoutes: () => {
    const { transportMode, selectedProvince } = get()
    const scope = get().getScope()
    if (selectedProvince && !scope.provinces.includes(selectedProvince)) {
      return []
    }
    return transportRoutes.filter((r) => {
      const inScope = scope.provinces.includes(r.province)
      const matchMode = transportMode === '全部' || r.routeType === transportMode
      const matchProvince = !selectedProvince || r.province === selectedProvince
      return inScope && matchMode && matchProvince
    })
  },

  getScopeOnlyAlerts: () => {
    const scope = get().getScope()
    const routeIds = new Set(transportRoutes.filter((r) => scope.provinces.includes(r.province)).map((r) => r.id))
    return get().alerts.filter((a) => routeIds.has(a.routeId))
  },

  getFilteredAlerts: () => {
    const filteredRoutes = get().getFilteredRoutes()
    const routeIds = new Set(filteredRoutes.map((r) => r.id))
    return get().alerts.filter((a) => routeIds.has(a.routeId))
  },

  getFilteredPorts: () => {
    const scope = get().getScope()
    return ports.filter((p) => scope.ports.includes(p.id))
  },

  getFilteredArchives: () => {
    const filteredRoutes = get().getFilteredRoutes()
    const routeIds = new Set(filteredRoutes.map((r) => r.id))
    return containerArchives.filter((a) => routeIds.has(a.routeId))
  },

  getUnresolvedAlertCount: () => {
    return get().getScopeOnlyAlerts().filter((a) => a.status !== '已关闭').length
  },

  getGroupedAlerts: () => {
    const items = get().getScopeOnlyAlerts().filter((a) => a.status !== '已关闭')
    const now = Date.now()
    const groups: Record<AlertGroupKey, AlertItem[]> = {
      level1: items.filter((a) => a.level === 1),
      level2: items.filter((a) => a.level === 2),
      pendingApproval: items.filter((a) => a.approval.step > 0 && a.approval.step < 3),
      overdue: items.filter((a) => {
        const t = parseTimeStr(a.triggerTime).getTime()
        if (t === 0) return false
        return (now - t) / 3600000 >= 6
      }),
    }
    return ([
      { key: 'level1', label: '一级预警', count: groups.level1.length, items: groups.level1 },
      { key: 'level2', label: '二级预警', count: groups.level2.length, items: groups.level2 },
      { key: 'pendingApproval', label: '待审批', count: groups.pendingApproval.length, items: groups.pendingApproval },
      { key: 'overdue', label: '已超时(6h+)', count: groups.overdue.length, items: groups.overdue },
    ])
  },

  getFilteredReport: () => {
    const filteredRoutes = get().getFilteredRoutes()
    const count = filteredRoutes.length
    const scope = get().getScope()

    if (count === 0) {
      return {
        week: diagnosticReport.week,
        transitTime: { current: 0, weekOnWeek: 0, yearOnYear: 0, dailyData: diagnosticReport.transitTime.dailyData.map((d) => ({ ...d, value: 0 })) },
        carbonEmission: { total: 0, distribution: [], trend: diagnosticReport.carbonEmission.trend.map((t) => ({ ...t, value: 0 })) },
        costStructure: { total: 0, breakdown: [], trend: diagnosticReport.costStructure.trend.map((t) => ({ ...t, value: 0 })) },
        recommendations: [],
      }
    }

    const avgTransit = filteredRoutes.reduce((s, r) => s + r.avgTransitTime, 0) / count
    const natlAvgTransit = transportRoutes.reduce((s, r) => s + r.avgTransitTime, 0) / transportRoutes.length
    const seed = count * 7 + 3
    const wow = ((seed % 11) - 5) * 0.1
    const yoy = ((seed % 7) - 3) * 0.1
    const dailyData = diagnosticReport.transitTime.dailyData.map((d, i) => ({
      ...d,
      value: +(avgTransit + (i - 3) * 0.15).toFixed(1),
    }))

    const totalCarbon = filteredRoutes.reduce((s, r) => s + r.carbonIntensity * 10, 0)
    const natlCarbon = transportRoutes.reduce((s, r) => s + r.carbonIntensity * 10, 0)
    const carbonByMode: Record<string, number> = {}
    filteredRoutes.forEach((r) => {
      carbonByMode[r.routeType] = (carbonByMode[r.routeType] || 0) + r.carbonIntensity * 10
    })
    const distribution = Object.entries(carbonByMode).map(([mode, amount]) => ({
      mode,
      amount: +amount.toFixed(1),
      ratio: +(amount / totalCarbon).toFixed(3),
    }))
    const carbonScale = totalCarbon / diagnosticReport.carbonEmission.total
    const carbonTrend = diagnosticReport.carbonEmission.trend.map((t) => ({
      ...t,
      value: +(t.value * carbonScale).toFixed(1),
    }))

    const totalCost = filteredRoutes.reduce((s, r) => s + r.transportCost / 10, 0)
    const natlCost = transportRoutes.reduce((s, r) => s + r.transportCost / 10, 0)
    const costRatios = [0.382, 0.249, 0.15, 0.109, 0.064, 0.046]
    const costCategories = ["铁路运输费", "水路运输费", "公路短驳费", "港口作业费", "仓储管理费", "其他费用"]
    const costBreakdown = costCategories.map((category, i) => ({
      category,
      amount: +(totalCost * costRatios[i]).toFixed(1),
      ratio: costRatios[i],
    }))
    const costScale = totalCost / diagnosticReport.costStructure.total
    const costTrend = diagnosticReport.costStructure.trend.map((t) => ({
      ...t,
      value: +(t.value * costScale).toFixed(1),
    }))

    const routeProvinces = [...new Set(filteredRoutes.map((r) => r.province))]
    const routeCities = filteredRoutes.map((r) => r.name.split('-')[0])
    const filteredPortIds = new Set(filteredRoutes.map((r) => r.name.split('-')).flat())
    const scopePorts = ports
      .filter((p) => routeProvinces.includes(p.province))
      .map((p) => p.name.replace(/港$/, ''))
    const allKeywords = [...new Set([...routeProvinces, ...routeCities, ...scopePorts])]
    const matchedRecs = diagnosticReport.recommendations.filter((rec) =>
      allKeywords.some((kw) => rec.description.includes(kw))
    )
    const baseRecs = matchedRecs.length > 0 ? matchedRecs : diagnosticReport.recommendations.slice(0, Math.min(3, count))

    const recommendations = baseRecs.map((rec) => {
      const recCities: string[] = []
      allKeywords.forEach((kw) => { if (rec.description.includes(kw)) recCities.push(kw) })
      const relRoutes = filteredRoutes.filter((r) =>
        recCities.some((c) => r.name.includes(c)) ||
        (recCities.includes(r.province))
      ).slice(0, 3)
      if (!relRoutes.length) relRoutes.push(filteredRoutes[0])
      const relPortIds = [...new Set(ports
        .filter((p) => routeProvinces.includes(p.province) && relRoutes.some((r) => r.name.includes(p.name.replace(/港$/, '')) || r.province === p.province))
        .map((p) => p.id)
      )].slice(0, 2)
      const relPorts = relPortIds.map((pid) => ports.find((p) => p.id === pid)!).filter(Boolean)
      const savings = {
        transitDays: +(0.5 + (relRoutes[0]?.avgTransitTime || 5) * 0.08 + Math.random() * 0).toFixed(1),
        costWan: +(totalCost * 0.05 / Math.max(baseRecs.length, 1)).toFixed(1),
        carbonTons: +(totalCarbon * 0.06 / Math.max(baseRecs.length, 1)).toFixed(1),
      }
      savings.transitDays = +((rec.priority === '高' ? 0.8 : rec.priority === '中' ? 0.5 : 0.3)).toFixed(1)
      savings.costWan = +((rec.priority === '高' ? 6 : rec.priority === '中' ? 4 : 2)).toFixed(1)
      savings.carbonTons = +((rec.priority === '高' ? 80 : rec.priority === '中' ? 45 : 20)).toFixed(1)
      const avgRoute = relRoutes[0] || filteredRoutes[0]
      const vsNationalAvg = {
        transitBetterPct: +Math.max(5, Math.round(((natlAvgTransit - (avgRoute?.avgTransitTime || 5)) / natlAvgTransit) * 100)).toFixed(0),
        costBetterPct: +Math.max(3, Math.round(((natlCost / transportRoutes.length - totalCost / count) / (natlCost / transportRoutes.length)) * 100)).toFixed(0),
        carbonBetterPct: +Math.max(4, Math.round(((natlCarbon / transportRoutes.length - totalCarbon / count) / (natlCarbon / transportRoutes.length)) * 100)).toFixed(0),
      }
      return {
        ...rec,
        drilldown: {
          relatedRoutes: relRoutes.map((r) => ({ id: r.id, name: r.name, province: r.province, routeType: r.routeType })),
          relatedPorts: relPorts.length ? relPorts.map((p) => ({ id: p.id, name: p.name, province: p.province })) : ports.filter((p) => routeProvinces.includes(p.province)).slice(0, 2).map((p) => ({ id: p.id, name: p.name, province: p.province })),
          savings,
          vsNationalAvg,
        },
      }
    })

    return {
      week: diagnosticReport.week,
      transitTime: { current: +avgTransit.toFixed(1), weekOnWeek: +wow.toFixed(1), yearOnYear: +yoy.toFixed(1), dailyData },
      carbonEmission: { total: +totalCarbon.toFixed(1), distribution, trend: carbonTrend },
      costStructure: { total: +totalCost.toFixed(1), breakdown: costBreakdown, trend: costTrend },
      recommendations,
    }
  },
}))
