import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { apiErrorMessage } from './clients'
import type {
  PaymentSubmission,
  StripeCustomerRow,
  StripeImportResult,
  SubmissionStatus,
} from '@/types'

export interface SubmissionsState {
  items: PaymentSubmission[]
  total: number
  page: number
  limit: number
  pages: number
  loading: boolean
  saving: boolean
  error: string | null
  filters: { status: SubmissionStatus | null }
}

/** Comprobantes de transferencia subidos por clientes: cola de verificación (SLA 48h laborables). */
export const useSubmissionsStore = defineStore('submissions', {
  state: (): SubmissionsState => ({
    items: [],
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
    loading: false,
    saving: false,
    error: null,
    filters: { status: 'pending' },
  }),

  getters: {
    isEmpty: (state): boolean => !state.loading && state.items.length === 0,
    pendingCount: (state): number => state.items.filter((s) => s.status === 'pending').length,
  },

  actions: {
    async fetch(page = 1) {
      this.loading = true
      this.error = null
      try {
        const result = await api.listSubmissions({
          status: this.filters.status ?? undefined,
          page,
          limit: this.limit,
        })
        this.items = result.items
        this.total = result.total
        this.page = result.page
        this.pages = result.pages
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudieron cargar los comprobantes')
        throw error
      } finally {
        this.loading = false
      }
    },

    async approve(id: string, payload: { invoiceId?: string; reviewNote?: string } = {}) {
      this.saving = true
      try {
        const result = await api.approveSubmission(id, payload)
        this.replaceItem(result.submission)
        return result
      } finally {
        this.saving = false
      }
    },

    async reject(id: string, payload: { reviewNote: string }) {
      this.saving = true
      try {
        const result = await api.rejectSubmission(id, payload)
        this.replaceItem(result.submission)
        return result
      } finally {
        this.saving = false
      }
    },

    replaceItem(submission: PaymentSubmission) {
      const index = this.items.findIndex((s) => s._id === submission._id)
      if (index === -1) return
      // Con el filtro "pendientes", lo revisado sale de la cola en vez de quedarse.
      if (this.filters.status && submission.status !== this.filters.status) {
        this.items.splice(index, 1)
        this.total = Math.max(this.total - 1, 0)
      } else {
        this.items.splice(index, 1, submission)
      }
    },
  },
})

export interface StripeImportState {
  customers: StripeCustomerRow[]
  configured: boolean | null
  loading: boolean
  /** stripeCustomerId de la fila que se está vinculando/desvinculando: el estado es POR FILA. */
  savingId: string | null
  importing: string | null
  error: string | null
  lastImport: StripeImportResult | null
}

/** Vinculación 1 a 1 de customers de Stripe con clientes e importación de cargos. */
export const useStripeImportStore = defineStore('stripeImport', {
  state: (): StripeImportState => ({
    customers: [],
    configured: null,
    loading: false,
    savingId: null,
    importing: null,
    error: null,
    lastImport: null,
  }),

  getters: {
    linkedCount: (state): number => state.customers.filter((c) => c.linkedClientId).length,
  },

  actions: {
    /** `silent` refresca los datos sin volver a mostrar los skeletons de carga. */
    async fetch(silent = false) {
      if (!silent) this.loading = true
      this.error = null
      try {
        const status = await api.stripeStatus()
        this.configured = status.configured
        this.customers = status.configured ? await api.stripeImportCustomers() : []
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudo consultar Stripe')
        throw error
      } finally {
        if (!silent) this.loading = false
      }
    },

    async link(clientId: string, stripeCustomerId: string) {
      this.savingId = stripeCustomerId
      try {
        const result = await api.stripeLinkCustomer({ clientId, stripeCustomerId })
        // Se actualiza SOLO la fila vinculada: nada de recargar la tabla entera.
        const row = this.customers.find((c) => c.stripeCustomerId === stripeCustomerId)
        if (row) {
          row.linkedClientId = result.client._id
          row.linkedClientName = result.client.name
          row.suggestions = []
        }
        return result
      } finally {
        this.savingId = null
      }
    },

    async unlink(clientId: string, stripeCustomerId?: string) {
      this.savingId = stripeCustomerId || clientId
      try {
        const result = await api.stripeUnlinkCustomer(clientId, stripeCustomerId)
        for (const row of this.customers) {
          const removed = stripeCustomerId
            ? row.stripeCustomerId === stripeCustomerId
            : row.linkedClientId === clientId
          if (removed) {
            row.linkedClientId = null
            row.linkedClientName = null
          }
        }
        // Refresco silencioso para recuperar las sugerencias de la fila liberada.
        void this.fetch(true).catch(() => undefined)
        return result
      } finally {
        this.savingId = null
      }
    },

    async importCharges(clientId: string) {
      this.importing = clientId
      try {
        this.lastImport = await api.stripeImportCharges(clientId)
        return this.lastImport
      } finally {
        this.importing = null
      }
    },
  },
})
