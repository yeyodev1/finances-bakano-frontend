import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { apiErrorMessage } from './clients'
import type { ChurnReasonRow, ChurnReport } from '@/types'

export function emptyChurnReport(): ChurnReport {
  return {
    byReason: [],
    totals: {
      archivedClients: 0,
      lostMonthlyAmount: 0,
      avgLifetimeDays: 0,
      totalLifetimeRevenue: 0,
    },
    recent: [],
  }
}

export interface ChurnState {
  report: ChurnReport
  loading: boolean
  loaded: boolean
  /** El endpoint todavía no existe o falló: la vista degrada con estado vacío. */
  unavailable: boolean
  error: string | null
}

export const useChurnStore = defineStore('churn', {
  state: (): ChurnState => ({
    report: emptyChurnReport(),
    loading: false,
    loaded: false,
    unavailable: false,
    error: null,
  }),

  getters: {
    totals: (state) => state.report.totals,
    isEmpty: (state): boolean =>
      !state.loading && state.report.byReason.length === 0 && state.report.recent.length === 0,
    topReasons: (state): ChurnReasonRow[] =>
      [...state.report.byReason].sort((a, b) => b.count - a.count),
    reasonsByLoss: (state): ChurnReasonRow[] =>
      [...state.report.byReason].sort((a, b) => b.lostMonthlyAmount - a.lostMonthlyAmount),
  },

  actions: {
    async load() {
      this.loading = true
      this.error = null
      try {
        const data = await api.churnReport()
        const base = emptyChurnReport()
        this.report = {
          byReason: Array.isArray(data?.byReason) ? data.byReason : [],
          totals: { ...base.totals, ...(data?.totals ?? {}) },
          recent: Array.isArray(data?.recent) ? data.recent : [],
          // Un backend viejo no las manda: el panel de retención degrada solo.
          guarantees: data?.guarantees,
          refunds: data?.refunds,
        }
        this.unavailable = false
        this.loaded = true
      } catch (error) {
        this.report = emptyChurnReport()
        this.unavailable = true
        this.error = apiErrorMessage(error, 'No se pudo cargar el reporte de bajas')
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      await this.load()
    },
  },
})

export default useChurnStore
