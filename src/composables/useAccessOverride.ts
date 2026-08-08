import type { AccessOverride } from '@/types'

const DAY_MS = 86_400_000

/** Está abierto por excepción ahora mismo: habilitado, sin revocar y sin vencer. */
export function isOverrideActive(override?: AccessOverride | null): boolean {
  if (!override?.enabled) return false
  if (override.revokedAt) return false
  if (!override.until) return true
  const until = new Date(override.until).getTime()
  if (Number.isNaN(until)) return true
  return until >= Date.now()
}

/** Días que le quedan a la excepción. `null` cuando es indefinida. */
export function overrideDaysLeft(override?: AccessOverride | null): number | null {
  if (!override?.until) return null
  const until = new Date(override.until).getTime()
  if (Number.isNaN(until)) return null
  return Math.max(0, Math.ceil((until - Date.now()) / DAY_MS))
}

export function overrideExpiryLabel(override?: AccessOverride | null): string {
  const days = overrideDaysLeft(override)
  if (days === null) return 'Sin fecha de cierre'
  if (days === 0) return 'Vence hoy'
  if (days === 1) return 'Vence mañana'
  return `Vence en ${days} días`
}

export function useAccessOverride() {
  return { isOverrideActive, overrideDaysLeft, overrideExpiryLabel }
}
