import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { apiErrorMessage } from './clients'
import type { Invoice, Payment, PaymentMethod } from '@/types'

export interface PaymentFilters {
  clientId: string | null
  period: string | null
  method: PaymentMethod | null
  from: string | null
  to: string | null
}

export interface RegisterPaymentInput {
  invoiceId: string
  amount: number
  paidAt: string
  method: PaymentMethod
  reference?: string
  notes?: string
  receipt?: File | null
}

export interface RegisterPaymentResult {
  payment: Payment | null
  invoice: Invoice | null
  reactivated: boolean
}

export function emptyPaymentFilters(): PaymentFilters {
  return { clientId: null, period: null, method: null, from: null, to: null }
}

export interface PaymentsState {
  items: Payment[]
  total: number
  page: number
  limit: number
  pages: number
  loading: boolean
  saving: boolean
  error: string | null
  filters: PaymentFilters
}

export const usePaymentsStore = defineStore('payments', {
  state: (): PaymentsState => ({
    items: [],
    total: 0,
    page: 1,
    limit: 100,
    pages: 1,
    loading: false,
    saving: false,
    error: null,
    filters: emptyPaymentFilters(),
  }),

  getters: {
    isEmpty: (state): boolean => !state.loading && state.items.length === 0,
    filteredAmount: (state): number => state.items.reduce((acc, p) => acc + Number(p.amount || 0), 0),
    activeFilterCount: (state): number =>
      Object.values(state.filters).filter((v) => v !== null && v !== '').length,
  },

  actions: {
    async fetch(page = 1) {
      this.loading = true
      this.error = null
      try {
        const f = this.filters
        const result = await api.listPayments({
          clientId: f.clientId ?? undefined,
          period: f.period ?? undefined,
          method: f.method ?? undefined,
          from: f.from ?? undefined,
          to: f.to ?? undefined,
          page,
          limit: this.limit,
        })
        this.items = result.items
        this.total = result.total
        this.page = result.page
        this.pages = result.pages
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudieron cargar los pagos')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchByClient(clientId: string) {
      this.loading = true
      this.error = null
      try {
        const result = await api.listPayments({ clientId, limit: 200 })
        this.items = result.items
        this.total = result.total
        return result.items
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudieron cargar los pagos del cliente')
        throw error
      } finally {
        this.loading = false
      }
    },

    async register(input: RegisterPaymentInput): Promise<RegisterPaymentResult> {
      this.saving = true
      try {
        const form = new FormData()
        form.append('invoiceId', input.invoiceId)
        form.append('amount', String(input.amount))
        form.append('paidAt', input.paidAt)
        form.append('method', input.method)
        if (input.reference) form.append('reference', input.reference)
        if (input.notes) form.append('notes', input.notes)
        if (input.receipt) form.append('receipt', input.receipt)

        const raw = (await api.registerPayment(form)) as unknown as
          | Payment
          | { payment: Payment; invoice: Invoice }

        const payment = 'payment' in raw ? raw.payment : (raw as Payment)
        const invoice = 'invoice' in raw ? raw.invoice : null
        const reactivated = Boolean(invoice?.deactivation?.reactivatedAt)

        if (payment) this.items.unshift(payment)
        return { payment: payment ?? null, invoice, reactivated }
      } finally {
        this.saving = false
      }
    },

    /**
     * Un solo pago que salda varios cobros del mismo cliente, del más viejo al más
     * nuevo. Es el caso de los cobros divididos: debe 210 el 8 y 210 el 23 pero
     * transfiere los 420 de una.
     */
    async settle(input: {
      clientId: string
      amount: number
      paidAt?: string
      method?: PaymentMethod
      reference?: string
      notes?: string
      invoiceIds?: string[]
    }) {
      this.saving = true
      try {
        return await api.settlePayment(input)
      } finally {
        this.saving = false
      }
    },

    async remove(id: string) {
      await api.deletePayment(id)
      this.items = this.items.filter((p) => p._id !== id)
      this.total = Math.max(this.total - 1, 0)
    },

    resetFilters() {
      this.filters = emptyPaymentFilters()
    },
  },
})
