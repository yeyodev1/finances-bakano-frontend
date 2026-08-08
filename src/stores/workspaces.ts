import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { apiErrorMessage } from './clients'
import { isOverrideActive } from '@/composables/useAccessOverride'
import type { Client, SelectOption, Workspace } from '@/types'

export interface WorkspaceSuggestion {
  workspaceId: string
  workspaceName: string
  isActive: boolean
  adminName?: string
  adminEmail?: string
  imageUrl?: string | null
  score: number
}

export interface WorkspaceFilters {
  q: string
  isActive: boolean | null
  unlinkedOnly: boolean
  shouldBeClosedOnly: boolean
  overrideOnly: boolean
}

export interface WorkspacesState {
  items: Workspace[]
  suggestions: WorkspaceSuggestion[]
  overrides: Client[]
  total: number
  loading: boolean
  loadingSuggestions: boolean
  loadingOverrides: boolean
  overridesUnavailable: boolean
  syncingImages: boolean
  working: boolean
  error: string | null
  notConfigured: boolean
  filters: WorkspaceFilters
}

const EMPTY_FILTERS = (): WorkspaceFilters => ({
  q: '',
  isActive: null,
  unlinkedOnly: false,
  shouldBeClosedOnly: false,
  overrideOnly: false,
})

export const useWorkspacesStore = defineStore('workspaces', {
  state: (): WorkspacesState => ({
    items: [],
    suggestions: [],
    overrides: [],
    total: 0,
    loading: false,
    loadingSuggestions: false,
    loadingOverrides: false,
    overridesUnavailable: false,
    syncingImages: false,
    working: false,
    error: null,
    notConfigured: false,
    filters: EMPTY_FILTERS(),
  }),

  getters: {
    filtered: (state): Workspace[] => {
      const term = state.filters.q.trim().toLowerCase()
      return state.items.filter((w) => {
        if (state.filters.isActive !== null && w.isActive !== state.filters.isActive) return false
        if (state.filters.unlinkedOnly && w.client) return false
        if (state.filters.shouldBeClosedOnly && !(w.shouldBeClosed && w.isActive)) return false
        if (state.filters.overrideOnly && !isOverrideActive(w.accessOverride)) return false
        if (!term) return true
        return (
          w.name.toLowerCase().includes(term) ||
          (w.adminName || '').toLowerCase().includes(term) ||
          (w.adminEmail || '').toLowerCase().includes(term) ||
          (w.pageName || '').toLowerCase().includes(term) ||
          (w.instagramAccountName || '').toLowerCase().includes(term) ||
          (w.client?.name || '').toLowerCase().includes(term)
        )
      })
    },
    activeCount: (state): number => state.items.filter((w) => w.isActive).length,
    linkedCount: (state): number => state.items.filter((w) => !!w.client).length,
    withImageCount: (state): number =>
      state.items.filter((w) => !!(w.imageUrl || w.logoUrl || w.pictureUrl)).length,
    shouldBeClosedCount: (state): number =>
      state.items.filter((w) => w.shouldBeClosed && w.isActive).length,
    overrideCount: (state): number =>
      state.items.filter((w) => isOverrideActive(w.accessOverride)).length,
    activeOverrides: (state): Client[] =>
      state.overrides.filter((c) => isOverrideActive(c.accessOverride)),
    options: (state): SelectOption[] =>
      state.items.map((w) => ({
        value: w._id,
        label: w.name,
        description: w.adminEmail || w.adminName || undefined,
        icon: w.isActive ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark',
      })),
  },

  actions: {
    async fetch() {
      this.loading = true
      this.error = null
      this.notConfigured = false
      try {
        const data = await api.listWorkspaces()
        this.items = Array.isArray(data) ? data : []
        this.total = this.items.length
      } catch (error) {
        const err = error as { response?: { status?: number } }
        if (err?.response?.status === 503) this.notConfigured = true
        this.error = apiErrorMessage(error, 'No se pudieron cargar los espacios de trabajo')
        this.items = []
        this.total = 0
        if (!this.notConfigured) throw error
      } finally {
        this.loading = false
      }
    },

    async fetchSuggestions(clientId: string) {
      this.loadingSuggestions = true
      try {
        const raw = (await api.workspaceSuggestions(clientId)) as unknown as WorkspaceSuggestion[]
        this.suggestions = Array.isArray(raw) ? raw : []
        return this.suggestions
      } catch (error) {
        this.suggestions = []
        this.error = apiErrorMessage(error, 'No se pudieron cargar las sugerencias')
        throw error
      } finally {
        this.loadingSuggestions = false
      }
    },

    async setActive(id: string, isActive: boolean, reason?: string) {
      this.working = true
      try {
        const updated = await api.setWorkspaceActive(id, isActive, reason)
        const idx = this.items.findIndex((w) => w._id === id)
        if (idx !== -1) {
          this.items.splice(idx, 1, { ...this.items[idx], ...updated, isActive })
        }
        return updated
      } finally {
        this.working = false
      }
    },

    /** Abre el acceso a un cliente moroso. El espacio queda marcado como excepción. */
    async grantAccess(clientId: string, payload: { reason: string; until?: string | null }) {
      this.working = true
      try {
        const client = await api.grantAccess(clientId, payload)
        this.applyClientOverride(clientId, client)
        return client
      } finally {
        this.working = false
      }
    },

    async revokeAccess(clientId: string, closeWorkspace = true) {
      this.working = true
      try {
        const client = await api.revokeAccess(clientId, closeWorkspace)
        this.applyClientOverride(clientId, client, closeWorkspace)
        this.overrides = this.overrides.filter((c) => c._id !== clientId)
        return client
      } finally {
        this.working = false
      }
    },

    /** Refleja en la lista local el nuevo estado de excepción del cliente. */
    applyClientOverride(clientId: string, client: Client | null, closeWorkspace = false) {
      const idx = this.items.findIndex((w) => w.client?._id === clientId)
      if (idx === -1) return
      const current = this.items[idx]
      if (!current) return
      this.items.splice(idx, 1, {
        ...current,
        accessOverride: client?.accessOverride ?? null,
        isActive: closeWorkspace ? false : true,
      })
    },

    async loadOverrides() {
      this.loadingOverrides = true
      this.overridesUnavailable = false
      try {
        const data = await api.listAccessOverrides()
        this.overrides = Array.isArray(data) ? data : []
        return this.overrides
      } catch {
        this.overrides = []
        this.overridesUnavailable = true
        return []
      } finally {
        this.loadingOverrides = false
      }
    },

    /** Refresca desde métricas las imágenes cacheadas de los espacios vinculados. */
    async syncImages() {
      this.syncingImages = true
      try {
        const result = await api.syncWorkspaceImages()
        await this.fetch()
        return result
      } finally {
        this.syncingImages = false
      }
    },

    resetFilters() {
      this.filters = EMPTY_FILTERS()
    },
  },
})
