import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { apiErrorMessage } from './clients'
import type {
  BankAccount,
  BankCadence,
  BankCard,
  BankHealth,
  BankSubscription,
  BankSubscriptionStatus,
  BankOverview,
  BankStatement,
  BankSubscriptionsReport,
  BankTransaction,
  SelectOption,
} from '@/types'

/**
 * Banco (Mercury). Solo lectura: la tienda nunca expone acciones que muevan dinero.
 */

export interface BankFilters {
  q: string
  status: string | null
  start: string
  end: string
  /** Deja solo los movimientos marcados como suscripción. */
  onlySubscriptions: boolean
}

/** Filtros de la pestaña Suscripciones (se aplican en memoria). */
export interface BankSubscriptionFilters {
  q: string
  status: BankSubscriptionStatus | null
  cadence: BankCadence | null
}

export interface BankState {
  overview: BankOverview | null
  accounts: BankAccount[]
  accountId: string | null
  transactions: BankTransaction[]
  /** Mercury no da un total real: solo sabemos si existe página siguiente. */
  hasMoreTransactions: boolean
  cards: BankCard[]
  statements: BankStatement[]
  subscriptions: BankSubscriptionsReport | null
  health: BankHealth | null
  filters: BankFilters
  subscriptionFilters: BankSubscriptionFilters
  page: number
  limit: number
  loadingOverview: boolean
  loadingTransactions: boolean
  loadingCards: boolean
  loadingStatements: boolean
  loadingSubscriptions: boolean
  refreshing: boolean
  error: string | null
  /** El backend no tiene MERCURY_API_TOKEN configurado (503). */
  notConfigured: boolean
  /** Mercury respondió pero rechazó la IP/token (502). */
  unreachable: boolean
}

const EMPTY_FILTERS = (): BankFilters => ({
  q: '',
  status: null,
  start: '',
  end: '',
  onlySubscriptions: false,
})

const EMPTY_SUBSCRIPTION_FILTERS = (): BankSubscriptionFilters => ({
  q: '',
  status: null,
  cadence: null,
})

function statusOfError(error: unknown): number | undefined {
  const err = error as { status?: number; response?: { status?: number } }
  return err?.status ?? err?.response?.status
}

export const useBankStore = defineStore('bank', {
  state: (): BankState => ({
    overview: null,
    accounts: [],
    accountId: null,
    transactions: [],
    hasMoreTransactions: false,
    cards: [],
    statements: [],
    subscriptions: null,
    health: null,
    filters: EMPTY_FILTERS(),
    subscriptionFilters: EMPTY_SUBSCRIPTION_FILTERS(),
    page: 1,
    limit: 50,
    loadingOverview: false,
    loadingTransactions: false,
    loadingCards: false,
    loadingStatements: false,
    loadingSubscriptions: false,
    refreshing: false,
    error: null,
    notConfigured: false,
    unreachable: false,
  }),

  getters: {
    account: (state): BankAccount | null =>
      state.accounts.find((a) => a.id === state.accountId) || null,

    accountOptions: (state): SelectOption[] =>
      state.accounts.map((a) => ({
        value: a.id,
        label: a.nickname || a.name || `Cuenta ${a.accountNumber?.slice(-4) || ''}`,
        description: a.accountNumber ? `•••• ${a.accountNumber.slice(-4)}` : undefined,
        icon: a.kind === 'savings' ? 'fa-solid fa-piggy-bank' : 'fa-solid fa-building-columns',
      })),

    totalBalance: (state): number => state.overview?.totals.currentBalance ?? 0,
    availableBalance: (state): number => state.overview?.totals.availableBalance ?? 0,
    pendingCount: (state): number => state.overview?.totals.pendingCount ?? 0,

    /** Flujo del mes en curso (último punto de la serie). */
    currentMonth: (state) => state.overview?.cashflow.at(-1) ?? null,

    activeCards: (state): number =>
      state.cards.filter((c) => String(c.status).toLowerCase() === 'active').length,

    /** Suscripciones que siguen vivas (todo lo que no quedó abandonado). */
    liveSubscriptions: (state) =>
      (state.subscriptions?.items ?? []).filter((item) => item.status !== 'stale'),

    failingSubscriptions: (state) =>
      (state.subscriptions?.items ?? []).filter((item) => item.status === 'failing'),

    subscriptionsMonthly: (state): number => state.subscriptions?.totals.monthlyCost ?? 0,

    /** Suscripciones ya filtradas por búsqueda, estado y frecuencia. */
    filteredSubscriptions: (state): BankSubscription[] => {
      const { q, status, cadence } = state.subscriptionFilters
      const term = q.trim().toLowerCase()

      return (state.subscriptions?.items ?? []).filter((item) => {
        if (status && item.status !== status) return false
        if (cadence && item.cadence !== cadence) return false
        if (!term) return true
        return item.name.toLowerCase().includes(term)
      })
    },

    /** Totales recalculados sobre lo filtrado, para que los indicadores acompañen al filtro. */
    filteredSubscriptionTotals(): { monthlyCost: number; yearlyCost: number; count: number; failing: number } {
      const items = this.filteredSubscriptions.filter((item) => item.status !== 'stale')
      const monthlyCost = items.reduce((sum, item) => sum + item.monthlyCost, 0)
      return {
        monthlyCost,
        yearlyCost: monthlyCost * 12,
        count: items.length,
        failing: this.filteredSubscriptions.filter((item) => item.status === 'failing').length,
      }
    },
  },

  actions: {
    /** Traduce el error de red a los flags de estado que consume la vista. */
    captureError(error: unknown, fallback: string) {
      const status = statusOfError(error)
      this.notConfigured = status === 503
      this.unreachable = status === 502
      this.error = apiErrorMessage(error, fallback)
    },

    async loadOverview(refresh = false) {
      this.loadingOverview = true
      this.error = null
      this.notConfigured = false
      this.unreachable = false
      try {
        const data = await api.bankOverview({ refresh: refresh || undefined })
        this.overview = data
        this.accounts = data.accounts ?? []
        if (!this.accountId || !this.accounts.some((a) => a.id === this.accountId)) {
          this.accountId = this.accounts[0]?.id ?? null
        }
        return data
      } catch (error) {
        this.overview = null
        this.accounts = []
        this.captureError(error, 'No se pudo cargar la información del banco')
        return null
      } finally {
        this.loadingOverview = false
      }
    },

    async loadTransactions(refresh = false) {
      if (!this.accountId) return
      this.loadingTransactions = true
      try {
        const data = await api.bankTransactions(this.accountId, {
          limit: this.limit,
          offset: (this.page - 1) * this.limit,
          order: 'desc',
          search: this.filters.q || undefined,
          status: this.filters.status || undefined,
          start: this.filters.start || undefined,
          end: this.filters.end || undefined,
          onlySubscriptions: this.filters.onlySubscriptions || undefined,
          refresh: refresh || undefined,
        })
        this.transactions = data.items ?? []
        this.hasMoreTransactions = !!data.hasMore
      } catch (error) {
        this.transactions = []
        this.hasMoreTransactions = false
        this.captureError(error, 'No se pudieron cargar los movimientos')
      } finally {
        this.loadingTransactions = false
      }
    },

    async loadCards(refresh = false) {
      if (!this.accountId) return
      this.loadingCards = true
      try {
        this.cards = await api.bankCards(this.accountId, refresh)
      } catch (error) {
        this.cards = []
        this.captureError(error, 'No se pudieron cargar las tarjetas')
      } finally {
        this.loadingCards = false
      }
    },

    async loadStatements() {
      if (!this.accountId) return
      this.loadingStatements = true
      try {
        this.statements = await api.bankStatements(this.accountId, { limit: 24, order: 'desc' })
      } catch (error) {
        this.statements = []
        this.captureError(error, 'No se pudieron cargar los estados de cuenta')
      } finally {
        this.loadingStatements = false
      }
    },

    /** Las suscripciones se calculan sobre todas las cuentas, no sobre la seleccionada. */
    async loadSubscriptions(refresh = false) {
      this.loadingSubscriptions = true
      try {
        this.subscriptions = await api.bankSubscriptions({
          days: 365,
          refresh: refresh || undefined,
        })
      } catch (error) {
        this.subscriptions = null
        this.captureError(error, 'No se pudieron detectar las suscripciones')
      } finally {
        this.loadingSubscriptions = false
      }
    },

    async loadHealth() {
      try {
        this.health = await api.bankHealth()
      } catch (error) {
        const data = (error as { data?: BankHealth })?.data
        this.health = data ?? null
      }
      return this.health
    },

    async selectAccount(id: string) {
      if (this.accountId === id) return
      this.accountId = id
      this.page = 1
      await Promise.all([this.loadTransactions(), this.loadCards(), this.loadStatements()])
    },

    async setPage(page: number) {
      const next = Math.max(page, 1)
      if (next > this.page && !this.hasMoreTransactions) return
      this.page = next
      await this.loadTransactions()
    },

    async applyFilters() {
      this.page = 1
      await this.loadTransactions()
    },

    async resetFilters() {
      this.filters = EMPTY_FILTERS()
      this.page = 1
      await this.loadTransactions()
    },

    resetSubscriptionFilters() {
      this.subscriptionFilters = EMPTY_SUBSCRIPTION_FILTERS()
    },

    /** Fuerza la relectura contra Mercury saltando la caché del backend. */
    async refreshAll() {
      this.refreshing = true
      try {
        await this.loadOverview(true)
        await Promise.all([
          this.loadTransactions(true),
          this.loadCards(true),
          this.loadStatements(),
          this.loadSubscriptions(true),
        ])
        await this.loadHealth()
      } finally {
        this.refreshing = false
      }
    },
  },
})
