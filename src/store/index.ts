import { create } from 'zustand'
import type { UserRole, TransportMode, AlertItem } from '@/types'
import { alertItems } from '@/mock/data'

interface AppState {
  userRole: UserRole
  setUserRole: (role: UserRole) => void
  transportMode: TransportMode
  setTransportMode: (mode: TransportMode) => void
  selectedProvince: string
  setSelectedProvince: (province: string) => void
  alerts: AlertItem[]
  updateAlert: (id: string, updates: Partial<AlertItem>) => void
}

export const useAppStore = create<AppState>((set) => ({
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
}))
