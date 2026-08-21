import { defineStore } from 'pinia'
import api from '@/services/api.service'
import { apiErrorMessage } from './clients'
import type { PaginatedResult, SelectOption, User, UserDirectoryItem, UserRole } from '@/types'

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  viewer: 'Solo lectura',
}

export const ROLE_ICONS: Record<UserRole, string> = {
  superadmin: 'fa-solid fa-user-shield',
  admin: 'fa-solid fa-user-gear',
  viewer: 'fa-solid fa-user',
}

export const ROLE_OPTIONS: SelectOption[] = (Object.keys(ROLE_LABELS) as UserRole[]).map((value) => ({
  value,
  label: ROLE_LABELS[value],
  icon: ROLE_ICONS[value],
}))

export interface UserFilters {
  q: string
  role: UserRole | null
  isActive: boolean | null
}

export interface UsersState {
  items: User[]
  /** Directorio ligero (cualquier rol): para vendedor / cobrador. */
  directory: UserDirectoryItem[]
  total: number
  loading: boolean
  saving: boolean
  error: string | null
  filters: UserFilters
}

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    items: [],
    directory: [],
    total: 0,
    loading: false,
    saving: false,
    error: null,
    filters: { q: '', role: null, isActive: null },
  }),

  getters: {
    isEmpty: (state): boolean => !state.loading && state.items.length === 0,
    activeCount: (state): number => state.items.filter((u) => u.isActive).length,
    notifiedCount: (state): number => state.items.filter((u) => u.receivesNotifications).length,

    directoryOptions: (state): SelectOption[] =>
      state.directory.map((u) => ({
        value: u._id,
        label: u.name,
        description: u.email,
        image: u.photoUrl || null,
      })),
  },

  actions: {
    async fetchDirectory() {
      this.directory = await api.userDirectory()
      return this.directory
    },

    async fetch() {
      this.loading = true
      this.error = null
      try {
        const f = this.filters
        const data = await api.listUsers({
          q: f.q.trim() || undefined,
          role: f.role ?? undefined,
          isActive: f.isActive ?? undefined,
          limit: 200,
        })
        if (Array.isArray(data)) {
          this.items = data
          this.total = data.length
        } else {
          const paginated = data as PaginatedResult<User>
          this.items = paginated.items || []
          this.total = paginated.total || this.items.length
        }
      } catch (error) {
        this.error = apiErrorMessage(error, 'No se pudieron cargar los usuarios')
        throw error
      } finally {
        this.loading = false
      }
    },

    replaceLocal(user: User) {
      const idx = this.items.findIndex((u) => u._id === user._id)
      if (idx !== -1) this.items.splice(idx, 1, user)
    },

    async create(payload: Partial<User> & { password: string }) {
      this.saving = true
      try {
        const created = await api.createUser(payload)
        this.items.unshift(created)
        this.total += 1
        return created
      } finally {
        this.saving = false
      }
    },

    async update(id: string, payload: Partial<User> & { password?: string }) {
      this.saving = true
      try {
        const updated = await api.updateUser(id, payload)
        this.replaceLocal(updated)
        return updated
      } finally {
        this.saving = false
      }
    },

    async toggle(id: string, isActive: boolean) {
      const updated = await api.toggleUser(id, isActive)
      this.replaceLocal(updated)
      return updated
    },

    async remove(id: string) {
      await api.deleteUser(id)
      this.items = this.items.filter((u) => u._id !== id)
      this.total = Math.max(this.total - 1, 0)
    },

    resetFilters() {
      this.filters = { q: '', role: null, isActive: null }
    },
  },
})
