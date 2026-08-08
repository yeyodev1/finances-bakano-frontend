import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { apiErrorMessage } from './clients'
import type { Invoice, InvoiceStatus, SelectOption } from '@/types'

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: 'Pendiente',
  partial: 'Parcial',
  paid: 'Pagado',
  overdue: 'Vencido',
  waived: 'Condonado',
  cancelled: 'Anulado',
}

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const INVOICE_STATUS_TONE: Record<InvoiceStatus, BadgeTone> = {
  pending: 'warning',
  partial: 'info',
  paid: 'success',
  overdue: 'danger',
  waived: 'neutral',
  cancelled: 'neutral',
}

export const INVOICE_STATUS_ICONS: Record<InvoiceStatus, string> = {
  pending: 'fa-solid fa-hourglass-half',
  partial: 'fa-solid fa-circle-half-stroke',
  paid: 'fa-solid fa-circle-check',
  overdue: 'fa-solid fa-triangle-exclamation',
  waived: 'fa-solid fa-hand-holding-heart',
  cancelled: 'fa-solid fa-ban',
}

export const INVOICE_STATUS_OPTIONS: SelectOption[] = (
  Object.keys(INVOICE_STATUS_LABELS) as InvoiceStatus[]
).map((value) => ({
  value,
  label: INVOICE_STATUS_LABELS[value],
  icon: INVOICE_STATUS_ICONS[value],
}))

export interface InvoiceSummary {
  period: string
  total: number
  paid: number
  pending: number
  overdue: number
  waived: number
  cancelled: number
  collectedAmount: number
  expectedAmount: number
  pendingAmount: number
  collectionRate: number
}

export interface InvoiceFilters {
  period: string
  status: InvoiceStatus | null
  clientId: string | null
  q: string
  overdueOnly: boolean
  deferredOnly: boolean
  advanceOnly: boolean
}

export interface DeferInvoiceInput {
  newDueDate: string
  reason?: string
  notes?: string
}

export interface AdvanceInvoiceInput {
  clientId: string
  period: string
  amount?: number
  dueDate?: string
  splitIndex?: number
  notes?: string
}

/** Una factura está prorrogada si tiene al menos un acuerdo de pago aplicado. */
export function isDeferred(invoice: Invoice): boolean {
  return (invoice.deferrals?.length ?? 0) > 0
}

export function lastDeferral(invoice: Invoice) {
  const list = invoice.deferrals ?? []
  return list.length ? list[list.length - 1] : null
}

export function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function emptySummary(period: string): InvoiceSummary {
  return {
    period,
    total: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    waived: 0,
    cancelled: 0,
    collectedAmount: 0,
    expectedAmount: 0,
    pendingAmount: 0,
    collectionRate: 0,
  }
}

export interface InvoicesState {
  items: Invoice[]
  summary: InvoiceSummary
  total: number
  page: number
  limit: number
  pages: number
  loading: boolean
  working: boolean
  error: string | null
  filters: InvoiceFilters
}

export const useInvoicesStore = defineStore('invoices', {
  state: (): InvoicesState => ({
    items: [],
    summary: emptySummary(currentPeriod()),
    total: 0,
    page: 1,
    limit: 100,
    pages: 1,
    loading: false,
    working: false,
    error: null,
    filters: {
      period: currentPeriod(),
      status: null,
      clientId: null,
      q: '',
      overdueOnly: false,
      deferredOnly: false,
      advanceOnly: false,
    },
  }),

  getters: {
    isEmpty: (state): boolean => !state.loading && state.items.length === 0,
    pendingBalance: (state): number =>
      state.items.reduce((acc, inv) => {
        if (inv.status === 'waived' || inv.status === 'cancelled' || inv.status === 'paid') return acc
        return acc + Math.max(inv.amount - inv.paidAmount, 0)
      }, 0),
  },

  actions: {
    /** Red de seguridad: si el backend todavía no soporta los filtros, se aplican en cliente. */
    applyLocalFilters(items: Invoice[]): Invoice[] {
      const f = this.filters
      let list = items
      if (f.deferredOnly) list = list.filter((inv) => isDeferred(inv))
      if (f.advanceOnly) list = list.filter((inv) => inv.isAdvance === true)
      return list
    },

    async fetch(page = 1) {
      this.loading = true
      this.error = null
      try {
        const f = this.filters
        const result = await api.listInvoices({
          period: f.period || undefined,
          status: f.status ?? undefined,
          clientId: f.clientId ?? undefined,
          q: f.q.trim() || undefined,
          overdueOnly: f.overdueOnly || undefined,
          deferredOnly: f.deferredOnly || undefined,
          advanceOnly: f.advanceOnly || undefined,
          page,
          limit: this.limit,
        })
        this.items = this.applyLocalFilters(result.items)
        this.total = result.total
        this.page = result.page
        this.pages = result.pages
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudieron cargar los cobros')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchByClient(clientId: string) {
      this.loading = true
      this.error = null
      try {
        const result = await api.listInvoices({ clientId, limit: 200 })
        this.items = result.items
        this.total = result.total
        return result.items
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudieron cargar los cobros del cliente')
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchSummary(period?: string) {
      const target = period ?? this.filters.period
      try {
        const data = (await api.invoiceSummary(target)) as unknown as Partial<InvoiceSummary>
        this.summary = { ...emptySummary(target), ...data, period: target }
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudo cargar el resumen del período')
      }
    },

    replaceLocal(invoice: Invoice) {
      const idx = this.items.findIndex((i) => i._id === invoice._id)
      if (idx !== -1) this.items.splice(idx, 1, invoice)
    },

    async generate(period: string, force = false) {
      this.working = true
      try {
        return await api.generateInvoices(period, force)
      } finally {
        this.working = false
      }
    },

    async recalc() {
      this.working = true
      try {
        return await api.recalcInvoices()
      } finally {
        this.working = false
      }
    },

    async waive(id: string, reason: string) {
      const updated = await api.waiveInvoice(id, reason)
      this.replaceLocal(updated)
      return updated
    },

    async cancel(id: string, reason: string) {
      const updated = await api.cancelInvoice(id, reason)
      this.replaceLocal(updated)
      return updated
    },

    /** Prórroga: mueve el vencimiento de ESTA factura, no el día de cobro del cliente. */
    async defer(id: string, input: DeferInvoiceInput) {
      this.working = true
      try {
        const updated = await api.deferInvoice(id, {
          newDueDate: input.newDueDate,
          reason: input.reason?.trim() || undefined,
          notes: input.notes?.trim() || undefined,
        })
        if (updated?._id) this.replaceLocal(updated)
        return updated
      } finally {
        this.working = false
      }
    },

    async undoDefer(id: string) {
      this.working = true
      try {
        const updated = await api.undoDeferInvoice(id)
        if (updated?._id) this.replaceLocal(updated)
        return updated
      } finally {
        this.working = false
      }
    },

    /** Cobro anticipado: crea el cobro de un período futuro para poder pagarlo hoy. */
    async createAdvance(input: AdvanceInvoiceInput) {
      this.working = true
      try {
        const created = await api.createAdvanceInvoice(input)
        if (created?._id && created.period === this.filters.period) {
          this.items = [created, ...this.items]
          this.total += 1
        }
        return created
      } finally {
        this.working = false
      }
    },

    setPeriod(period: string) {
      this.filters.period = period
    },

    resetSpecialFilters() {
      this.filters.deferredOnly = false
      this.filters.advanceOnly = false
    },
  },
})
