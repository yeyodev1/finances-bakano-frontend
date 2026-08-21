import { defineStore } from 'pinia'
import { api } from '@/services/api.service'
import { apiErrorMessage } from './clients'
import type {
  Sale,
  SaleBilling,
  SaleGoalLine,
  SaleGoalProgress,
  SaleItem,
  SaleLostReason,
  SaleStatus,
  SaleSummary,
} from '@/types'

export interface SaleFilters {
  status: SaleStatus | null
  ownerId: string | null
  q: string
  overdueOnly: boolean
}

export function emptySaleFilters(): SaleFilters {
  return { status: null, ownerId: null, q: '', overdueOnly: false }
}

function emptySummary(): SaleSummary {
  return {
    recurringMonthly: 0,
    newSales: {
      agreed: 0,
      collected: 0,
      pending: 0,
      overdue: 0,
      lost: 0,
      recurringSold: 0,
      oneOffSold: 0,
      missingInvoice: 0,
    },
    expectedTotal: 0,
    byOwner: [],
  }
}

function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

interface SalesState {
  items: Sale[]
  summary: SaleSummary
  /** Objetivo del mes elegido y su avance. */
  goalPeriod: string
  goal: SaleGoalProgress | null
  goalLoading: boolean
  total: number
  page: number
  pages: number
  loading: boolean
  saving: boolean
  error: string | null
  filters: SaleFilters
}

export const useSalesStore = defineStore('sales', {
  state: (): SalesState => ({
    items: [],
    summary: emptySummary(),
    goalPeriod: currentPeriod(),
    goal: null,
    goalLoading: false,
    total: 0,
    page: 1,
    pages: 1,
    loading: false,
    saving: false,
    error: null,
    filters: emptySaleFilters(),
  }),

  getters: {
    isEmpty: (state): boolean => !state.loading && state.items.length === 0,

    /** Próxima cuota sin cobrar de cada venta: es la que hay que perseguir. */
    nextInstallment: () => (sale: Sale) =>
      [...sale.installments]
        .filter((i) => i.status !== 'cobrada')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null,

    pendingOf: () => (sale: Sale) =>
      sale.installments
        .filter((i) => i.status !== 'cobrada')
        .reduce((acc, i) => acc + Number(i.amount || 0), 0),

    collectedOf: () => (sale: Sale) =>
      sale.installments
        .filter((i) => i.status === 'cobrada')
        .reduce((acc, i) => acc + Number(i.paidAmount || i.amount || 0), 0),
  },

  actions: {
    async fetch(page = 1) {
      this.loading = true
      this.error = null
      try {
        const f = this.filters
        const result = await api.listSales({
          status: f.status ?? undefined,
          ownerId: f.ownerId ?? undefined,
          q: f.q.trim() || undefined,
          overdueOnly: f.overdueOnly || undefined,
          page,
          limit: 100,
        })
        this.items = result.items
        this.total = result.total
        this.page = result.page
        this.pages = result.pages
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudieron cargar las ventas')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchSummary() {
      try {
        this.summary = await api.saleSummary()
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudo cargar el resumen de ventas')
      }
    },

    async fetchGoal(period?: string) {
      if (period) this.goalPeriod = period
      this.goalLoading = true
      try {
        this.goal = await api.saleGoalProgress(this.goalPeriod)
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudo cargar el objetivo del mes')
        throw error
      } finally {
        this.goalLoading = false
      }
    },

    async saveGoal(
      lines: Array<Pick<SaleGoalLine, 'categoryId' | 'targetCount' | 'perClientAmount' | 'notes'>>,
      notes?: string,
    ) {
      this.saving = true
      try {
        await api.saveSaleGoal(this.goalPeriod, { lines, notes })
        await this.fetchGoal()
      } finally {
        this.saving = false
      }
    },

    /** Ubica la venta en un tipo y refresca el avance: es lo que la hace contar. */
    async changeCategory(id: string, categoryId: string | null) {
      this.saving = true
      try {
        const sale = await api.changeSaleCategory(id, categoryId)
        this.replaceLocal(sale)
        await this.fetchGoal().catch(() => undefined)
        return sale
      } finally {
        this.saving = false
      }
    },

    async load() {
      await Promise.all([this.fetch(1), this.fetchSummary(), this.fetchGoal().catch(() => undefined)])
    },

    /** Sustituye la venta en la lista tras cualquier mutación. */
    replaceLocal(sale: Sale) {
      const index = this.items.findIndex((s) => s._id === sale._id)
      if (index >= 0) this.items.splice(index, 1, sale)
    },

    async create(payload: Record<string, unknown>) {
      this.saving = true
      try {
        const sale = await api.createSale(payload)
        this.items = [sale, ...this.items]
        this.total += 1
        await Promise.all([this.fetchSummary(), this.fetchGoal().catch(() => undefined)])
        return sale
      } finally {
        this.saving = false
      }
    },

    async payInstallment(
      id: string,
      index: number,
      payload: { amount?: number; paidAt?: string; notes?: string },
    ) {
      this.saving = true
      try {
        const sale = await api.paySaleInstallment(id, index, payload)
        this.replaceLocal(sale)
        await this.fetchSummary()
        return sale
      } finally {
        this.saving = false
      }
    },

    async reschedule(id: string, index: number, payload: { newDueDate: string; reason?: string }) {
      this.saving = true
      try {
        const sale = await api.rescheduleSaleInstallment(id, index, payload)
        this.replaceLocal(sale)
        await this.fetchSummary()
        return sale
      } finally {
        this.saving = false
      }
    },

    async updateItems(id: string, items: SaleItem[]) {
      this.saving = true
      try {
        const sale = await api.updateSaleItems(id, items)
        this.replaceLocal(sale)
        await this.fetchSummary()
        return sale
      } finally {
        this.saving = false
      }
    },

    async updateBilling(id: string, payload: Partial<SaleBilling>) {
      this.saving = true
      try {
        const sale = await api.updateSaleBilling(id, payload)
        this.replaceLocal(sale)
        await this.fetchSummary()
        return sale
      } finally {
        this.saving = false
      }
    },

    async changeOwner(id: string, ownerId: string) {
      this.saving = true
      try {
        const sale = await api.changeSaleOwner(id, ownerId)
        this.replaceLocal(sale)
        await this.fetchSummary()
        return sale
      } finally {
        this.saving = false
      }
    },

    async lose(id: string, payload: { reason: SaleLostReason; notes?: string; lostAt?: string }) {
      this.saving = true
      try {
        const sale = await api.loseSale(id, payload)
        this.replaceLocal(sale)
        await this.fetchSummary()
        return sale
      } finally {
        this.saving = false
      }
    },

    async reopen(id: string) {
      this.saving = true
      try {
        const sale = await api.reopenSale(id)
        this.replaceLocal(sale)
        await this.fetchSummary()
        return sale
      } finally {
        this.saving = false
      }
    },
  },
})
