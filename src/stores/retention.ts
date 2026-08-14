import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { apiErrorMessage } from './clients'
import { isGuaranteeOpen } from '@/config/retention'
import type {
  Guarantee,
  GuaranteeOutcome,
  GuaranteeStatus,
  GuaranteeSummary,
  Invoice,
  Refund,
  RefundReason,
  RefundSummary,
} from '@/types'

/**
 * Garantías y reembolsos viven en el mismo store porque son el mismo relato: qué
 * se regala para retener a un cliente y qué se devuelve cuando no funcionó. La
 * vista los muestra juntos y cerrar una garantía puede crear un reembolso, así
 * que separarlos obligaba a recargar dos stores en cada acción.
 */

export interface OpenGuaranteeInput {
  clientId: string
  period?: string
  triggerPeriod?: string
  reason?: string
}

export interface CloseGuaranteeInput {
  outcome: GuaranteeOutcome
  notes?: string
  archiveClient?: boolean
  refund?: {
    paymentId?: string
    invoiceId?: string
    amount: number
    reason?: RefundReason
    refundedAt?: string
    notes?: string
  }
}

export interface RegisterRefundInput {
  paymentId?: string
  invoiceId?: string
  amount: number
  reason: RefundReason
  refundedAt?: string
  reference?: string
  notes?: string
  receipt?: File | null
  archiveClient?: boolean
  archiveNotes?: string
}

export function emptyGuaranteeSummary(): GuaranteeSummary {
  return {
    open: 0,
    firstMonth: 0,
    secondMonth: 0,
    recovered: 0,
    failed: 0,
    cancelled: 0,
    waivedMonthly: 0,
    waivedTotal: 0,
    recoveryRate: 0,
  }
}

export function emptyRefundSummary(): RefundSummary {
  return { count: 0, amount: 0, monthCount: 0, monthAmount: 0, archivedClients: 0, byReason: [] }
}

export interface RetentionState {
  guarantees: Guarantee[]
  refunds: Refund[]
  guaranteeSummary: GuaranteeSummary
  refundSummary: RefundSummary
  statusFilter: GuaranteeStatus | 'abiertas' | null
  /** Cobros de un cliente con dinero devolvible. Se llena al abrir el modal. */
  refundable: Invoice[]
  refundableLoading: boolean
  loading: boolean
  saving: boolean
  loaded: boolean
  error: string | null
}

export const useRetentionStore = defineStore('retention', {
  state: (): RetentionState => ({
    guarantees: [],
    refunds: [],
    guaranteeSummary: emptyGuaranteeSummary(),
    refundSummary: emptyRefundSummary(),
    statusFilter: null,
    refundable: [],
    refundableLoading: false,
    loading: false,
    saving: false,
    loaded: false,
    error: null,
  }),

  getters: {
    openGuarantees: (state): Guarantee[] => state.guarantees.filter((g) => isGuaranteeOpen(g.status)),
    closedGuarantees: (state): Guarantee[] =>
      state.guarantees.filter((g) => !isGuaranteeOpen(g.status)),
    visibleGuarantees(state): Guarantee[] {
      if (state.statusFilter === 'abiertas') return this.openGuarantees
      if (!state.statusFilter) return state.guarantees
      return state.guarantees.filter((g) => g.status === state.statusFilter)
    },
    isEmpty: (state): boolean =>
      !state.loading && state.guarantees.length === 0 && state.refunds.length === 0,
    /** Cuánto se ha regalado más cuánto se ha devuelto: el costo total de la política. */
    retentionCost: (state): number =>
      Math.round((state.guaranteeSummary.waivedTotal + state.refundSummary.amount) * 100) / 100,
  },

  actions: {
    async load() {
      this.loading = true
      this.error = null
      try {
        const [guarantees, refunds, guaranteeSummary, refundSummary] = await Promise.all([
          api.listGuarantees({ limit: 200 }),
          api.listRefunds({ limit: 200 }),
          api.guaranteeSummary(),
          api.refundSummary(),
        ])
        this.guarantees = guarantees.items ?? []
        this.refunds = refunds.items ?? []
        this.guaranteeSummary = { ...emptyGuaranteeSummary(), ...guaranteeSummary }
        this.refundSummary = { ...emptyRefundSummary(), ...refundSummary }
        this.loaded = true
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudo cargar garantías y reembolsos')
        this.loaded = true
        throw error
      } finally {
        this.loading = false
      }
    },

    async refresh() {
      await this.load()
    },

    /**
     * Cobros de un cliente que todavía tienen plata devolvible.
     *
     * No se reutiliza el store de facturas a propósito: `fetchByClient` pisa su
     * lista y el usuario perdería los filtros de la pantalla de cobros al abrir
     * este modal encima.
     */
    async fetchRefundable(clientId: string): Promise<Invoice[]> {
      this.refundableLoading = true
      try {
        const result = await api.listInvoices({ clientId, limit: 200 })
        this.refundable = (result.items ?? []).filter(
          (invoice) =>
            Number(invoice.paidAmount || 0) - Number(invoice.refundedAmount || 0) > 0.009,
        )
        return this.refundable
      } catch (error) {
        this.refundable = []
        this.error = apiErrorMessage(error, 'No se pudieron cargar los cobros del cliente')
        throw error
      } finally {
        this.refundableLoading = false
      }
    },

    async openGuarantee(input: OpenGuaranteeInput) {
      this.saving = true
      try {
        const result = await api.openGuarantee(input)
        await this.load()
        return result
      } finally {
        this.saving = false
      }
    },

    async extendGuarantee(id: string, payload: { period?: string; resultNotes?: string } = {}) {
      this.saving = true
      try {
        const result = await api.extendGuarantee(id, payload)
        await this.load()
        return result
      } finally {
        this.saving = false
      }
    },

    async closeGuarantee(id: string, input: CloseGuaranteeInput) {
      this.saving = true
      try {
        const result = await api.closeGuarantee(id, input)
        await this.load()
        return result
      } finally {
        this.saving = false
      }
    },

    async registerRefund(input: RegisterRefundInput) {
      this.saving = true
      try {
        const form = new FormData()
        if (input.paymentId) form.append('paymentId', input.paymentId)
        if (input.invoiceId) form.append('invoiceId', input.invoiceId)
        form.append('amount', String(input.amount))
        form.append('reason', input.reason)
        if (input.refundedAt) form.append('refundedAt', input.refundedAt)
        if (input.reference) form.append('reference', input.reference)
        if (input.notes) form.append('notes', input.notes)
        if (input.archiveClient) form.append('archiveClient', 'true')
        if (input.archiveNotes) form.append('archiveNotes', input.archiveNotes)
        if (input.receipt) form.append('receipt', input.receipt)

        const result = await api.registerRefund(form)
        await this.load()
        return result
      } finally {
        this.saving = false
      }
    },

    async removeRefund(id: string) {
      const result = await api.deleteRefund(id)
      await this.load()
      return result
    },

    guaranteeOf(clientId: string): Guarantee | null {
      return (
        this.guarantees.find(
          (g) => isGuaranteeOpen(g.status) && idOf(g.clientId) === clientId,
        ) ?? null
      )
    },
  },
})

/** El backend devuelve el cliente poblado o solo su id según el endpoint. */
function idOf(value: Guarantee['clientId']): string {
  return typeof value === 'string' ? value : (value?._id ?? '')
}

export default useRetentionStore
