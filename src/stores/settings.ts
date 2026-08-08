import { defineStore } from 'pinia'
import api from '@/services/api.service'
import type { AppSettings } from '@/types'

const CDN = 'https://res.cloudinary.com/bihiitae/image/upload/bakano-finanzas/brand'

/**
 * El logo original de bakano.ec es blanco (pensado para fondos oscuros), así que
 * sobre las superficies claras de la app se usa la variante oscura y la blanca
 * queda reservada para los fondos con degradado.
 */
export const BRAND_ASSETS = {
  logoDark: `${CDN}/logo-bakano-dark.png`,
  logoLight: `${CDN}/logo-bakano-light.png`,
  iconDark: `${CDN}/logo-bakano-icon.png`,
  iconLight: `${CDN}/logo-bakano-icon-light.png`,
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  appName: 'Bakano Finanzas',
  logoUrl: BRAND_ASSETS.logoDark,
  iconUrl: BRAND_ASSETS.iconDark,
  brandColors: {},
  currency: 'USD',
  timezone: 'America/Guayaquil',
}

export interface SettingsState {
  settings: AppSettings
  loading: boolean
  loaded: boolean
  error: string | null
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    settings: { ...DEFAULT_APP_SETTINGS },
    loading: false,
    loaded: false,
    error: null,
  }),

  getters: {
    appName: (state): string => state.settings.appName || DEFAULT_APP_SETTINGS.appName,
    logoUrl: (state): string => state.settings.logoUrl || DEFAULT_APP_SETTINGS.logoUrl,
    iconUrl: (state): string => state.settings.iconUrl || DEFAULT_APP_SETTINGS.iconUrl,
    /** Logo blanco, para fondos oscuros o con degradado. */
    logoLightUrl: (): string => BRAND_ASSETS.logoLight,
    iconLightUrl: (): string => BRAND_ASSETS.iconLight,
    currency: (state): string => state.settings.currency || 'USD',
  },

  actions: {
    async load(force = false) {
      if (this.loaded && !force) return this.settings
      if (this.loading) return this.settings
      this.loading = true
      this.error = null
      try {
        const data = await api.getAppSettings()
        this.settings = { ...DEFAULT_APP_SETTINGS, ...data }
        this.loaded = true
      } catch (err) {
        this.error = (err as { message?: string })?.message || 'No se pudo cargar la configuración'
      } finally {
        this.loading = false
      }
      return this.settings
    },

    apply(patch: Partial<AppSettings>) {
      this.settings = { ...this.settings, ...patch }
    },
  },
})

export default useSettingsStore
