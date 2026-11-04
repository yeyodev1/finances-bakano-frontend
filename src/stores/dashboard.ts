import { defineStore } from 'pinia'
import api from '@/services/api.service'
import type { DashboardSummary, Invoice } from '@/types'

export function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export interface DashboardState {
  period: string
  summary: DashboardSummary | null
  upcoming: Invoice[]
  overdue: Invoice[]
  loading: boolean
  error: string | null
  lastLoadedAt: number | null
}

function pick<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

export const useDashboardStore = defineStore('dashboard', {
  state: (): DashboardState => ({
    period: currentPeriod(),
    summary: null,
    upcoming: [],
    overdue: [],
    loading: false,
    error: null,
    lastLoadedAt: null,
  }),

  actions: {
    setPeriod(period: string) {
      if (!period || period === this.period) return
      this.period = period
      void this.load()
    },

    async load() {
      this.loading = true
      this.error = null

      const results = await Promise.allSettled([
        api.dashboardSummary(this.period),
        api.upcoming(15),
        api.overdue(50),
      ])
      const [summaryRes, upcomingRes, overdueRes] = results

      this.summary = pick<DashboardSummary | null>(summaryRes, null)
      this.upcoming = pick<Invoice[]>(upcomingRes, [])
      this.overdue = pick<Invoice[]>(overdueRes, [])

      if (results.every((r) => r.status === 'rejected')) {
        const reason = (results[0] as PromiseRejectedResult).reason as { message?: string } | undefined
        this.error = reason?.message || 'No se pudo cargar el resumen'
      }

      this.lastLoadedAt = Date.now()
      this.loading = false
    },

    async refresh() {
      await this.load()
    },

    async generate(period?: string) {
      const res = await api.generateInvoices(period || this.period)
      await this.load()
      return res
    },
  },
})

export default useDashboardStore
