import { create } from 'zustand'
import type { UserRole, TransportMode, AlertItem, RoleScope, ExcelParsedResult, CapacityPrediction } from '@/types'
import { alertItems, transportRoutes, roleScopes, capacityPrediction, containerArchives, ports, diagnosticReport } from '@/mock/data'

interface AppState {
  userRole: UserRole
  setUserRole: (role: UserRole) => void
  transportMode: TransportMode
  setTransportMode: (mode: TransportMode) => void
  selectedProvince: string
  setSelectedProvince: (province: string) => void
  alerts: AlertItem[]
  updateAlert: (id: string, updates: Partial<AlertItem>) => void
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

    const recCount = Math.min(count, diagnosticReport.recommendations.length)
    const recommendations = diagnosticReport.recommendations.slice(0, recCount)

    return {
      week: diagnosticReport.week,
      transitTime: { current: +avgTransit.toFixed(1), weekOnWeek: +wow.toFixed(1), yearOnYear: +yoy.toFixed(1), dailyData },
      carbonEmission: { total: +totalCarbon.toFixed(1), distribution, trend: carbonTrend },
      costStructure: { total: +totalCost.toFixed(1), breakdown: costBreakdown, trend: costTrend },
      recommendations,
    }
  },
}))
