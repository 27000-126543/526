export interface TransportRoute {
  id: string
  name: string
  origin: string
  destination: string
  routeType: "铁水联运" | "公铁联运" | "水水联运" | "公水联运"
  containerType: "20GP" | "40GP" | "40HC" | "20RF"
  avgTransitTime: number
  standardTransitTime: number
  carbonIntensity: number
  transportCost: number
  equipmentTurnoverRate: number
  status: "正常" | "预警" | "超时"
  province: string
}

export interface AlertItem {
  id: string
  routeId: string
  routeName: string
  level: 1 | 2
  type: "时效超标" | "节点滞留"
  triggerTime: string
  description: string
  status: "待处理" | "处理中" | "已升级" | "已关闭"
  approval: {
    step: 0 | 1 | 2 | 3
    schedulerConfirmed: boolean
    regionalManagerApproved: boolean
    hqDirectorApproved: boolean
    history: ApprovalRecord[]
  }
}

export interface ApprovalRecord {
  step: number
  role: string
  action: "确认" | "复核" | "批准" | "驳回"
  time: string
  comment: string
}

export interface Port {
  id: string
  name: string
  province: string
  throughput7Days: { date: string; value: number }[]
  transportModeDistribution: { mode: string; ratio: number; count: number }[]
  routes: PortRoute[]
}

export interface PortRoute {
  id: string
  name: string
  inTransitContainers: number
  avgTransitTime: number
  status: "正常" | "预警" | "超时"
}

export interface CapacityPrediction {
  timeline: { hour: string; demand: number; available: number }[]
  gap: { startHour: string; endHour: string; gapAmount: number }[]
  recommendations: Recommendation[]
}

export interface Recommendation {
  id: string
  type: "中转方案" | "运输组合调整"
  description: string
  expectedEffect: string
  priority: "高" | "中" | "低"
}

export interface DiagnosticReport {
  week: string
  transitTime: {
    current: number
    weekOnWeek: number
    yearOnYear: number
    dailyData: { date: string; value: number; wowChange: number }[]
  }
  carbonEmission: {
    total: number
    distribution: { mode: string; amount: number; ratio: number }[]
    trend: { week: string; value: number }[]
  }
  costStructure: {
    total: number
    breakdown: { category: string; amount: number; ratio: number }[]
    trend: { week: string; value: number }[]
  }
  recommendations: {
    type: "优化路径" | "减排策略"
    description: string
    expectedSaving: string
    priority: "高" | "中" | "低"
  }[]
}

export type UserRole = "scheduler" | "regional_manager" | "hq_director"

export type TransportMode = "全部" | "铁水联运" | "公铁联运" | "水水联运" | "公水联运"
