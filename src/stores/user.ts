import { defineStore } from 'pinia'
import api from '@/services/api.service'
import router from '@/router'
import type { User } from '@/types'

const TOKEN_KEY = 'access_token'
const USER_ID_KEY = 'user_id'
const USER_KEY = 'auth_user'

export interface UserState {
  user: User | null
  token: string | null
  loading: boolean
  initialized: boolean
}

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

function writeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage no disponible */
  }
}

/** Cachea el usuario para que al recargar la sesión aparezca sin esperar al backend. */
function readUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

function writeUser(user: User | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* storage no disponible */
  }
}

/**
 * Solo un 401/403 significa que la sesión dejó de ser válida. Cualquier otro fallo
 * (backend caído, sin red, 500) no debe cerrar la sesión: el token sigue siendo bueno.
 */
function isAuthError(error: unknown): boolean {
  const status = (error as { status?: number } | null)?.status
  return status === 401 || status === 403
}

let expiredListenerBound = false

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    user: readUser(),
    token: readToken(),
    loading: false,
    initialized: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.token,
    isSuperadmin: (state): boolean => state.user?.role === 'superadmin',
    role: (state): string | null => state.user?.role ?? null,
    displayName: (state): string => state.user?.name || state.user?.email || 'Usuario',
    initials(state): string {
      const source = state.user?.name || state.user?.email || ''
      const parts = source.trim().split(/\s+/).filter(Boolean)
      const first = parts[0] ?? ''
      if (!first) return 'BK'
      const second = parts[1] ?? ''
      if (!second) return first.slice(0, 2).toUpperCase()
      return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
    },
  },

  actions: {
    setSession(token: string, user: User) {
      this.token = token
      this.user = user
      writeToken(token)
      writeUser(user)
      try {
        localStorage.setItem(USER_ID_KEY, user._id)
      } catch {
        /* storage no disponible */
      }
    },

    async login(email: string, password: string) {
      this.loading = true
      try {
        const data = await api.login(email.trim().toLowerCase(), password)
        this.setSession(data.token, data.user)
        this.initialized = true
        return data.user
      } finally {
        this.loading = false
      }
    },

    async fetchMe() {
      if (!this.token) return null
      this.loading = true
      try {
        const user = await api.me()
        this.user = user
        writeUser(user)
        return user
      } finally {
        this.loading = false
      }
    },

    clear() {
      this.user = null
      this.token = null
      writeToken(null)
      writeUser(null)
      try {
        localStorage.removeItem(USER_ID_KEY)
      } catch {
        /* storage no disponible */
      }
    },

    async logout(redirect = true) {
      this.clear()
      this.initialized = true
      if (redirect && router.currentRoute.value.path !== '/login') {
        await router.replace('/login')
      }
    },

    bindTokenExpired() {
      if (expiredListenerBound || typeof window === 'undefined') return
      expiredListenerBound = true
      window.addEventListener('auth:token-expired', () => {
        if (!this.token) return
        void this.logout(true)
        void import('@/composables/useToast')
          .then(({ useToast }) => {
            useToast().warning('Tu sesión expiró', 'Vuelve a ingresar para continuar.')
          })
          .catch(() => undefined)
      })
    },

    async bootstrap() {
      this.bindTokenExpired()
      if (this.initialized) return
      if (!this.token) {
        this.initialized = true
        return
      }
      try {
        await this.fetchMe()
      } catch (error) {
        // Solo cerramos sesión si el backend dice que el token ya no vale.
        // Si está caído o no hay red, seguimos con el usuario cacheado.
        if (isAuthError(error)) {
          await this.logout(true)
        } else {
          console.warn('[auth] No se pudo verificar la sesión; se mantiene la actual.', error)
        }
      } finally {
        this.initialized = true
      }
    },
  },
})

export default useUserStore
