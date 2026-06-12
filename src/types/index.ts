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

export interface AlertUpgradeInfo {
  triggeredHoursAgo: number
  upgradedAt: string
  thresholdHours: number
  reason: string
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
  upgradeInfo?: AlertUpgradeInfo
}

export interface ApprovalRecord {
  step: number
  role: string
  action: "确认" | "复核" | "批准" | "驳回" | "关闭"
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

export interface CapacityTimelineSlot { hour: string; demand: number; available: number }

export interface CapacityPrediction {
  timeline: CapacityTimelineSlot[]
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
  recommendations: ({
    type: "优化路径" | "减排策略"
    description: string
    expectedSaving: string
    priority: "高" | "中" | "低"
    drilldown?: RecDrilldown
  })[]
}

export interface RecDrilldown {
  relatedRoutes: { id: string; name: string; province: string; routeType: string }[]
  relatedPorts: { id: string; name: string; province: string }[]
  savings: {
    transitDays: number
    costWan: number
    carbonTons: number
  }
  vsNationalAvg: {
    transitBetterPct: number
    costBetterPct: number
    carbonBetterPct: number
  }
}

export type AlertGroupKey = "level1" | "level2" | "pendingApproval" | "overdue"

export interface AlertGroup {
  key: AlertGroupKey
  label: string
  count: number
  items: AlertItem[]
}

export interface PredictionHistory {
  hash: number
  timestamp: string
  inputSummary: { totalTEU: number; etaCount: number; rowCount: number; fields: string[]; fileName?: string }
  prediction: CapacityPrediction
  totalGapAmount?: number
}

export interface PredictionCompareResult {
  isSameInput: boolean
  gapDiff: { hour: string; previous: number; current: number; delta: number }[]
  recAdded: Recommendation[]
  recRemoved: Recommendation[]
  totalGapDelta: number
  previousInputHash: number
  currentInputHash: number
}

export type UserRole = "scheduler" | "regional_manager" | "hq_director"

export type TransportMode = "全部" | "铁水联运" | "公铁联运" | "水水联运" | "公水联运"

export type ContainerStatus = "在途" | "中转" | "待发" | "抵达"

export type NodeType = "港口" | "铁路场站" | "公路卡口" | "海关"

export type NodeStatus = "已完成" | "在站" | "待到达"

export type DataSource = "RFID" | "门架识别" | "海关放行" | "GPS"

export interface TimelineNode {
  id: string
  type: NodeType
  name: string
  location: string
  arrivalTime: string
  departureTime: string
  dwellHours: number
  status: NodeStatus
  dataSource: DataSource
}

export interface ContainerArchive {
  id: string
  containerNo: string
  containerType: string
  routeId: string
  routeName: string
  routeType: "铁水联运" | "公铁联运" | "水水联运" | "公水联运"
  province: string
  currentStatus: ContainerStatus
  rfid: string
  lastUpdateTime: string
  timeline: TimelineNode[]
}

export interface ExcelParsedResult {
  headers: string[]
  rows: Record<string, string | number>[]
  matchedFields: string[]
  missingFields: string[]
}

export interface RoleScope {
  role: UserRole
  provinces: string[]
  ports: string[]
}
