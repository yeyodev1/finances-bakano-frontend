import { defineStore } from 'pinia'
import api from '@/services/api.service'
import type {
  ArchiveReason,
  BillingType,
  Client,
  ClientCategory,
  PaymentMethod,
  SelectOption,
} from '@/types'

export function apiErrorMessage(error: unknown, fallback = 'Ocurrió un error inesperado'): string {
  const err = error as { response?: { data?: { message?: string; error?: string } }; message?: string }
  return err?.response?.data?.message || err?.response?.data?.error || err?.message || fallback
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: 'Transferencia',
  stripe: 'Stripe',
  cheque: 'Cheque',
  transferencia_o_cheque: 'Transferencia o cheque',
  efectivo: 'Efectivo',
  no_paga: 'No paga',
  otro: 'Otro',
}

export const PAYMENT_METHOD_ICONS: Record<PaymentMethod, string> = {
  transferencia: 'fa-solid fa-building-columns',
  stripe: 'fa-brands fa-stripe-s',
  cheque: 'fa-solid fa-money-check',
  transferencia_o_cheque: 'fa-solid fa-money-check-dollar',
  efectivo: 'fa-solid fa-money-bill-wave',
  no_paga: 'fa-solid fa-ban',
  otro: 'fa-solid fa-circle-question',
}

export const PAYMENT_METHOD_OPTIONS: SelectOption[] = (
  Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]
).map((value) => ({
  value,
  label: PAYMENT_METHOD_LABELS[value],
  icon: PAYMENT_METHOD_ICONS[value],
}))

export const BILLING_TYPE_LABELS: Record<BillingType, string> = {
  monthly: 'Mensual',
  no_charge: 'Sin cobro',
  special: 'Especial',
}

export const BILLING_TYPE_OPTIONS: SelectOption[] = (
  Object.keys(BILLING_TYPE_LABELS) as BillingType[]
).map((value) => ({
  value,
  label: BILLING_TYPE_LABELS[value],
  icon: value === 'monthly' ? 'fa-solid fa-calendar-days' : 'fa-solid fa-star',
}))

/** `false` = solo activos (por defecto), `true` = solo archivados, `'all'` = todos. */
export type ArchivedFilter = boolean | 'all'

export interface ClientFilters {
  q: string
  paymentMethod: PaymentMethod | null
  billingType: BillingType | null
  isActive: boolean | null
  hasWorkspace: boolean | null
  tag: string | null
  categoryId: string | null
  archived: ArchivedFilter
}

export interface ClientStats {
  totalClients: number
  activeClients: number
  inactiveClients: number
  archivedClients: number
  linkedWorkspaces: number
  expectedMonthlyAmount: number
  idealMonthlyAmount: number
}

export interface ArchiveClientInput {
  reason: ArchiveReason
  notes?: string
  attachments?: File[]
  /** Fecha real de la baja (YYYY-MM-DD). Si se omite, el backend usa hoy. */
  archivedAt?: string
}

export interface ClientsState {
  items: Client[]
  /**
   * Lista completa y SIN filtros para alimentar los selectores de cliente.
   * `items` está paginado y sujeto a los filtros de la vista /clientes: si un
   * modal lo reutiliza, el cliente que no entró en la página (o que el filtro
   * dejó fuera) desaparece del desplegable sin explicación.
   */
  categories: ClientCategory[]
  picker: Client[]
  pickerLoading: boolean
  pickerLoaded: boolean
  current: Client | null
  stats: ClientStats
  total: number
  page: number
  limit: number
  pages: number
  loading: boolean
  saving: boolean
  error: string | null
  filters: ClientFilters
}

export function emptyClientFilters(): ClientFilters {
  return {
    q: '',
    paymentMethod: null,
    billingType: null,
    isActive: null,
    hasWorkspace: null,
    tag: null,
    categoryId: null,
    archived: false,
  }
}

export const ARCHIVED_FILTER_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Activos', icon: 'fa-solid fa-user-check', color: 'success' },
  { value: 'archived', label: 'Archivados', icon: 'fa-solid fa-box-archive', color: 'danger' },
  { value: 'all', label: 'Todos', icon: 'fa-solid fa-list' },
]

export const useClientsStore = defineStore('clients', {
  state: (): ClientsState => ({
    items: [],
    categories: [],
    picker: [],
    pickerLoading: false,
    pickerLoaded: false,
    current: null,
    stats: {
      totalClients: 0,
      activeClients: 0,
      inactiveClients: 0,
      archivedClients: 0,
      linkedWorkspaces: 0,
      expectedMonthlyAmount: 0,
      idealMonthlyAmount: 0,
    },
    total: 0,
    page: 1,
    limit: 50,
    pages: 1,
    loading: false,
    saving: false,
    error: null,
    filters: emptyClientFilters(),
  }),

  getters: {
    isEmpty: (state): boolean => !state.loading && state.items.length === 0,
    activeFilterCount: (state): number => {
      const f = state.filters
      let n = 0
      if (f.q.trim()) n += 1
      if (f.paymentMethod) n += 1
      if (f.billingType) n += 1
      if (f.isActive !== null) n += 1
      if (f.hasWorkspace !== null) n += 1
      if (f.tag) n += 1
      if (f.categoryId) n += 1
      if (f.archived !== false) n += 1
      return n
    },
    archivedItems: (state): Client[] => state.items.filter((c) => c.isArchived),
    clientOptions: (state): SelectOption[] =>
      state.picker.map((c) => ({ value: c._id, label: c.name, description: c.workspaceName || undefined })),

    /**
     * Opciones para cualquier selector de cliente: lista completa, con logo del
     * espacio y los inactivos marcados en vez de escondidos — ocultarlos hacía
     * que un cliente existente pareciera no existir.
     */
    pickerOptions(state): SelectOption[] {
      return [...state.picker]
        .sort((a, b) => {
          if (a.isActive !== b.isActive) return a.isActive ? -1 : 1
          return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        })
        .map((c) => ({
          value: c._id,
          label: c.name,
          // `null` a propósito: sin logo se pinta el avatar de iniciales.
          image: c.workspaceImageUrl || null,
          description: [
            new Intl.NumberFormat('es-EC', {
              style: 'currency',
              currency: c.currency || 'USD',
            }).format(Number(c.amount || 0)),
            c.isActive ? '' : 'Inactivo',
          ]
            .filter(Boolean)
            .join(' · '),
        }))
    },
  },

  actions: {
    async fetch(page?: number) {
      this.loading = true
      this.error = null
      try {
        const targetPage = page ?? this.page
        const f = this.filters
        const result = await api.listClients({
          q: f.q.trim() || undefined,
          paymentMethod: f.paymentMethod ?? undefined,
          billingType: f.billingType ?? undefined,
          isActive: f.isActive ?? undefined,
          hasWorkspace: f.hasWorkspace ?? undefined,
          tag: f.tag ?? undefined,
          categoryId: f.categoryId ?? undefined,
          archived: f.archived === 'all' ? 'all' : f.archived,
          page: targetPage,
          limit: this.limit,
        })
        this.items = result.items
        this.total = result.total
        this.page = result.page
        this.pages = result.pages
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudieron cargar los clientes')
        throw error
      } finally {
        this.loading = false
      }
    },

    /**
     * Carga la lista para los selectores. No toca `items` ni `filters`: abrir un
     * modal desde /cobros no debe reescribir la tabla de /clientes.
     */
    async fetchCategories() {
      this.categories = await api.listCategories()
      return this.categories
    },

    async createCategory(payload: { name: string; color?: string; icon?: string }) {
      const created = await api.createCategory(payload)
      await this.fetchCategories()
      return created
    },

    async deleteCategory(id: string) {
      await api.deleteCategory(id)
      await this.fetchCategories()
    },

    async fetchPicker(force = false) {
      if (this.pickerLoading) return
      if (this.pickerLoaded && !force) return
      this.pickerLoading = true
      try {
        // El backend valida `limit` con max(200) (validators/common.schema.ts):
        // pedir más devuelve 400. Se pagina hasta traer todos los clientes.
        const PER_PAGE = 200
        const MAX_PAGES = 10
        const all: Client[] = []
        let page = 1
        let pages = 1

        do {
          const result = await api.listClients({ archived: false, page, limit: PER_PAGE })
          all.push(...result.items)
          pages = result.pages || 1
          page += 1
        } while (page <= pages && page <= MAX_PAGES)

        this.picker = all
        this.pickerLoaded = true
      } catch (error) {
        this.pickerLoaded = false
        throw error
      } finally {
        this.pickerLoading = false
      }
    },

    async fetchStats() {
      try {
        const data = (await api.clientStats()) as unknown as Partial<ClientStats>
        this.stats = {
          totalClients: Number(data.totalClients || 0),
          activeClients: Number(data.activeClients || 0),
          inactiveClients: Number(data.inactiveClients || 0),
          archivedClients: Number(data.archivedClients || 0),
          linkedWorkspaces: Number(data.linkedWorkspaces || 0),
          expectedMonthlyAmount: Number(data.expectedMonthlyAmount || 0),
          idealMonthlyAmount: Number(
            data.idealMonthlyAmount || data.expectedMonthlyAmount || 0,
          ),
        }
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudieron cargar las métricas de clientes')
      }
    },

    async fetchOne(id: string) {
      this.loading = true
      this.error = null
      try {
        this.current = await api.getClient(id)
        return this.current
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudo cargar el cliente')
        throw error
      } finally {
        this.loading = false
      }
    },

    replaceLocal(client: Client) {
      const idx = this.items.findIndex((c) => c._id === client._id)
      if (idx !== -1) this.items.splice(idx, 1, client)
      if (this.current?._id === client._id) this.current = client
    },

    async create(payload: Partial<Client>) {
      this.saving = true
      try {
        const created = await api.createClient(payload)
        this.items.unshift(created)
        this.total += 1
        return created
      } finally {
        this.saving = false
      }
    },

    async update(id: string, payload: Partial<Client>) {
      this.saving = true
      try {
        const updated = await api.updateClient(id, payload)
        this.replaceLocal(updated)
        return updated
      } finally {
        this.saving = false
      }
    },

    async toggle(id: string, isActive: boolean, reason?: string) {
      const updated = await api.toggleClient(id, isActive, reason)
      this.replaceLocal(updated)
      return updated
    },

    /**
     * Corrige fecha de entrada y/o de baja. El backend recalcula la antigüedad
     * y el historial del ciclo de vida, que se derivan de esas fechas.
     */
    async updateLifecycleDates(id: string, payload: { startDate?: string; archivedAt?: string }) {
      this.saving = true
      try {
        const client = await api.updateLifecycleDates(id, payload)
        if (client?._id) {
          this.replaceLocal(client)
          if (this.current?._id === client._id) this.current = client
        }
        return client
      } finally {
        this.saving = false
      }
    },

    /** Baja del cliente: se archiva conservando todo el historial. Nunca borra. */
    async archive(id: string, input: ArchiveClientInput) {
      this.saving = true
      try {
        const form = new FormData()
        form.append('reason', input.reason)
        if (input.notes?.trim()) form.append('notes', input.notes.trim())
        if (input.archivedAt) form.append('archivedAt', input.archivedAt)
        ;(input.attachments ?? []).forEach((file) => form.append('attachments', file))

        const result = await api.archiveClient(id, form)
        const client = (result as { client?: Client })?.client ?? (result as unknown as Client)
        if (client?._id) {
          this.replaceLocal(client)
          if (this.filters.archived === false) {
            this.items = this.items.filter((c) => c._id !== id)
            this.total = Math.max(this.total - 1, 0)
          }
        }
        return result
      } finally {
        this.saving = false
      }
    },

    async reactivate(id: string, notes?: string) {
      this.saving = true
      try {
        const updated = await api.reactivateClient(id, notes?.trim() || undefined)
        if (updated?._id) this.replaceLocal(updated)
        return updated
      } finally {
        this.saving = false
      }
    },

    async addAttachments(id: string, files: File[]) {
      if (!files.length) return null
      this.saving = true
      try {
        const form = new FormData()
        files.forEach((file) => form.append('attachments', file))
        const updated = await api.addClientAttachments(id, form)
        if (updated?._id) this.replaceLocal(updated)
        return updated
      } finally {
        this.saving = false
      }
    },

    async fetchArchived() {
      return api.listArchivedClients({ limit: 200 })
    },

    /** Borrado real. Solo superadmin y solo si el cliente nunca tuvo pagos. */
    async purge(id: string) {
      await api.purgeClient(id)
      this.items = this.items.filter((c) => c._id !== id)
      this.total = Math.max(this.total - 1, 0)
      if (this.current?._id === id) this.current = null
    },

    async link(id: string, workspaceId: string, workspaceName: string) {
      const updated = await api.linkWorkspace(id, workspaceId, workspaceName)
      this.replaceLocal(updated)
      return updated
    },

    async unlink(id: string) {
      const updated = await api.unlinkWorkspace(id)
      this.replaceLocal(updated)
      return updated
    },

    async backfill(id: string, fromDate: string, markPaidUntil?: string | null) {
      return api.backfillClient(id, { fromDate, markPaidUntil: markPaidUntil || null })
    },

    resetFilters() {
      this.filters = emptyClientFilters()
    },
  },
})
