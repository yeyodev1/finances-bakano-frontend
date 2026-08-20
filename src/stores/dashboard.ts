import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { emptyChurnReport } from './churn'
import type {
  AgingBucket,
  BreakdownItem,
  ChurnReport,
  DashboardSummary,
  DelinquencyReport,
  Invoice,
  RevenuePoint,
} from '@/types'

export function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export interface DashboardState {
  period: string
  summary: DashboardSummary | null
  revenue: RevenuePoint[]
  statusBreakdown: BreakdownItem[]
  methodBreakdown: BreakdownItem[]
  topClients: BreakdownItem[]
  aging: AgingBucket[]
  upcoming: Invoice[]
  overdue: Invoice[]
  churn: ChurnReport
  delinquency: DelinquencyReport | null
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
    revenue: [],
    statusBreakdown: [],
    methodBreakdown: [],
    topClients: [],
    aging: [],
    upcoming: [],
    overdue: [],
    churn: emptyChurnReport(),
    delinquency: null,
    loading: false,
    error: null,
    lastLoadedAt: null,
  }),

  getters: {
    isEmpty: (state): boolean =>
      !state.summary || (state.summary.invoicesTotal === 0 && state.summary.expectedAmount === 0),
    collectionRate: (state): number => state.summary?.collectionRate ?? 0,
    hasError: (state): boolean => !!state.error,
    idealMonthlyAmount: (state): number => Number(state.summary?.idealMonthlyAmount ?? 0),
    archivedClients: (state): number =>
      Number(state.summary?.archivedClients ?? state.churn.totals.archivedClients ?? 0),
  },

  actions: {
    setPeriod(period: string) {
      if (!period || period === this.period) return
      this.period = period
      void this.load()
    },

    async load() {
      this.loading = true
      this.error = null
      const period = this.period

      const results = await Promise.allSettled([
        api.dashboardSummary(period),
        api.revenueSeries(12),
        api.statusBreakdown(period),
        api.methodBreakdown(period),
        api.topClients(period, 10),
        api.aging(),
        api.upcoming(15),
        api.overdue(50),
        api.churnReport(),
        api.delinquency(12),
      ])

      const [
        summaryRes,
        revenueRes,
        statusRes,
        methodRes,
        topRes,
        agingRes,
        upcomingRes,
        overdueRes,
        churnRes,
        delinquencyRes,
      ] = results

      this.summary = pick<DashboardSummary | null>(summaryRes, null)
      this.revenue = pick<RevenuePoint[]>(revenueRes, [])
      this.statusBreakdown = pick<BreakdownItem[]>(statusRes, [])
      this.methodBreakdown = pick<BreakdownItem[]>(methodRes, [])
      this.topClients = pick<BreakdownItem[]>(topRes, [])
      this.aging = pick<AgingBucket[]>(agingRes, [])
      this.upcoming = pick<Invoice[]>(upcomingRes, [])
      this.overdue = pick<Invoice[]>(overdueRes, [])
      this.churn = pick<ChurnReport>(churnRes as PromiseSettledResult<ChurnReport>, emptyChurnReport())
      this.delinquency = pick<DelinquencyReport | null>(
        delinquencyRes as PromiseSettledResult<DelinquencyReport | null>,
        null,
      )

      const failed = results.filter((r) => r.status === 'rejected')
      if (failed.length === results.length) {
        const reason = (failed[0] as PromiseRejectedResult | undefined)?.reason as
          | { message?: string }
          | undefined
        this.error = reason?.message || 'No se pudo cargar el resumen'
      } else if (failed.length) {
        this.error = null
      }

      this.lastLoadedAt = Date.now()
      this.loading = false
    },

    async refresh() {
      await this.load()
    },

    async generate(period?: string) {
      const target = period || this.period
      const res = await api.generateInvoices(target)
      await this.load()
      return res
    },
  },
})

export default useDashboardStore
