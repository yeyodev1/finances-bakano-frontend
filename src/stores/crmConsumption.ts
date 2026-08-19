import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { apiErrorMessage } from './clients'
import type { CrmConsumption, CrmConsumptionTotals } from '@/types'

export interface CrmConsumptionState {
  items: CrmConsumption[]
  totals: CrmConsumptionTotals
  total: number
  page: number
  limit: number
  pages: number
  loading: boolean
  saving: boolean
  error: string | null
  filters: { clientId: string | null; period: string | null }
}

/**
 * Consumo del CRM (GoHighLevel) por cliente: cargos de Stripe que no son
 * mensualidades. Llegan solos desde el webhook y la importación; acá se ven,
 * se reclasifican a factura si hizo falta, o se eliminan (superadmin).
 */
export const useCrmConsumptionStore = defineStore('crmConsumption', {
  state: (): CrmConsumptionState => ({
    items: [],
    totals: { total: 0, currentMonth: 0, byClient: [] },
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
    loading: false,
    saving: false,
    error: null,
    filters: { clientId: null, period: null },
  }),

  getters: {
    isEmpty: (state): boolean => !state.loading && state.items.length === 0,
  },

  actions: {
    async fetch(page = 1) {
      this.loading = true
      this.error = null
      try {
        const result = await api.listCrmConsumption({
          clientId: this.filters.clientId ?? undefined,
          period: this.filters.period ?? undefined,
          page,
          limit: this.limit,
        })
        this.items = result.items
        this.totals = result.totals
        this.total = result.total
        this.page = result.page
        this.pages = result.pages
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudo cargar el consumo CRM')
        throw error
      } finally {
        this.loading = false
      }
    },

    /** Reclasifica el cargo como pago de la factura elegida y lo saca de la lista. */
    async apply(id: string, invoiceId: string) {
      this.saving = true
      try {
        const result = await api.applyCrmConsumption(id, invoiceId)
        await this.fetch(this.page)
        return result
      } finally {
        this.saving = false
      }
    },

    async remove(id: string) {
      this.saving = true
      try {
        const result = await api.removeCrmConsumption(id)
        await this.fetch(this.page)
        return result
      } finally {
        this.saving = false
      }
    },
  },
})
