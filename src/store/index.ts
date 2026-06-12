import { create } from 'zustand'
import type { UserRole, TransportMode, AlertItem, RoleScope, ExcelParsedResult, CapacityPrediction } from '@/types'
import { alertItems, transportRoutes, roleScopes, capacityPrediction, containerArchives, ports, diagnosticReport } from '@/mock/data'

function parseTimeStr(s: string): Date {
  const clean = s.replace(/\//g, '-')
  const d = new Date(clean)
  return isNaN(d.getTime()) ? new Date(0) : d
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
  excelResult: ExcelParsedResult | null
  setExcelResult: (result: ExcelParsedResult | null) => void
  predictionData: CapacityPrediction | null
  setPredictionData: (data: CapacityPrediction | null) => void

  getScope: () => RoleScope
  getFilteredRoutes: () => typeof transportRoutes
  getFilteredAlerts: () => AlertItem[]
  getFilteredPorts: () => typeof ports
  getFilteredArchives: () => typeof containerArchives
  getFilteredReport: () => typeof diagnosticReport
  getUnresolvedAlertCount: () => number
}

export const useAppStore = create<AppState>((set, get) => ({
  userRole: 'hq_director',
  setUserRole: (role) => set({ userRole: role }),
  transportMode: '全部',
  setTransportMode: (mode) => set({ transportMode: mode }),
  selectedProvince: '',
  setSelectedProvince: (province) => set({ selectedProvince: province }),
  alerts: alertItems,
  updateAlert: (id, updates) =>
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, ...updates } : alert
      ),
    })),
  autoUpgradeAlerts: () => {
    const now = new Date()
    set((state) => {
      const upgraded = state.alerts.map((a) => {
        if (a.level !== 1) return a
        if (a.status !== '待处理' && a.status !== '处理中') return a
        const t = parseTimeStr(a.triggerTime)
        if (t.getTime() === 0) return a
        const diffH = (now.getTime() - t.getTime()) / 3600000
        if (diffH < 2) return a
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
        }
      })
      return { alerts: upgraded }
    })
  },
  excelResult: null,
  setExcelResult: (result) => set({ excelResult: result }),
  predictionData: capacityPrediction,
  setPredictionData: (data) => set({ predictionData: data }),

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
    return get().getFilteredAlerts().filter((a) => a.status !== '已关闭').length
  },

  getFilteredReport: () => {
    const filteredRoutes = get().getFilteredRoutes()
    const count = filteredRoutes.length

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
    const seed = count * 7 + 3
    const wow = ((seed % 11) - 5) * 0.1
    const yoy = ((seed % 7) - 3) * 0.1
    const dailyData = diagnosticReport.transitTime.dailyData.map((d, i) => ({
      ...d,
      value: +(avgTransit + (i - 3) * 0.15).toFixed(1),
    }))

    const totalCarbon = filteredRoutes.reduce((s, r) => s + r.carbonIntensity * 10, 0)
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

    const scopeProvinces = get().getScope().provinces
    const routeProvinces = [...new Set(filteredRoutes.map((r) => r.province))]
    const routeCities = filteredRoutes.map((r) => r.name.split('-')[0])
    const scopePorts = get().getScope().ports
      .map((pid) => ports.find((p) => p.id === pid)?.name.replace(/港$/, ''))
      .filter(Boolean) as string[]
    const allKeywords = [...new Set([...scopeProvinces, ...routeProvinces, ...routeCities, ...scopePorts])]
    const matchedRecs = diagnosticReport.recommendations.filter((rec) =>
      allKeywords.some((kw) => rec.description.includes(kw))
    )
    const recommendations = matchedRecs.length > 0
      ? matchedRecs
      : diagnosticReport.recommendations.slice(0, Math.min(3, count))

    return {
      week: diagnosticReport.week,
      transitTime: { current: +avgTransit.toFixed(1), weekOnWeek: +wow.toFixed(1), yearOnYear: +yoy.toFixed(1), dailyData },
      carbonEmission: { total: +totalCarbon.toFixed(1), distribution, trend: carbonTrend },
      costStructure: { total: +totalCost.toFixed(1), breakdown: costBreakdown, trend: costTrend },
      recommendations,
    }
  },
}))
