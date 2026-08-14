import { ARCHIVE_REASON_LABELS } from '@/types'
import type { ArchiveReason, SelectOption } from '@/types'

export const ARCHIVE_REASON_ICONS: Record<ArchiveReason, string> = {
  impago: 'fa-solid fa-money-bill-transfer',
  cancelacion_cliente: 'fa-solid fa-hand',
  cierre_negocio: 'fa-solid fa-shop-slash',
  competencia: 'fa-solid fa-chess-knight',
  precio: 'fa-solid fa-tag',
  insatisfaccion_resultados: 'fa-solid fa-face-frown',
  pausa_temporal: 'fa-solid fa-circle-pause',
  fin_contrato: 'fa-solid fa-file-signature',
  decision_bakano: 'fa-solid fa-gavel',
  reembolso: 'fa-solid fa-rotate-left',
  garantia_fallida: 'fa-solid fa-shield-halved',
  otro: 'fa-solid fa-circle-question',
}

/** Tonos alineados con las variantes de BaseBadge. */
export const ARCHIVE_REASON_TONES: Record<ArchiveReason, string> = {
  impago: 'danger',
  cancelacion_cliente: 'warning',
  cierre_negocio: 'neutral',
  competencia: 'danger',
  precio: 'warning',
  insatisfaccion_resultados: 'danger',
  pausa_temporal: 'info',
  fin_contrato: 'neutral',
  decision_bakano: 'secondary',
  reembolso: 'danger',
  garantia_fallida: 'danger',
  otro: 'neutral',
}

export const ARCHIVE_REASON_COLORS: Record<ArchiveReason, string> = {
  impago: '#ef4444',
  cancelacion_cliente: '#f59e0b',
  cierre_negocio: '#6b7280',
  competencia: '#e6285c',
  precio: '#f97316',
  insatisfaccion_resultados: '#dc2626',
  pausa_temporal: '#3b82f6',
  fin_contrato: '#85529c',
  decision_bakano: '#191423',
  reembolso: '#b91c1c',
  garantia_fallida: '#7f1d1d',
  otro: '#9ca3af',
}

export const ARCHIVE_REASONS = Object.keys(ARCHIVE_REASON_LABELS) as ArchiveReason[]

export const ARCHIVE_REASON_OPTIONS: SelectOption[] = ARCHIVE_REASONS.map((value) => ({
  value,
  label: ARCHIVE_REASON_LABELS[value],
  icon: ARCHIVE_REASON_ICONS[value],
  color: ARCHIVE_REASON_TONES[value],
}))

export function archiveReasonLabel(reason?: ArchiveReason | null, fallback = 'Sin motivo'): string {
  if (!reason) return fallback
  return ARCHIVE_REASON_LABELS[reason] ?? fallback
}

export function archiveReasonIcon(reason?: ArchiveReason | null): string {
  if (!reason) return 'fa-solid fa-box-archive'
  return ARCHIVE_REASON_ICONS[reason] ?? 'fa-solid fa-box-archive'
}

export function archiveReasonTone(reason?: ArchiveReason | null): string {
  if (!reason) return 'neutral'
  return ARCHIVE_REASON_TONES[reason] ?? 'neutral'
}

export function archiveReasonColor(reason?: ArchiveReason | null): string {
  if (!reason) return ARCHIVE_REASON_COLORS.otro
  return ARCHIVE_REASON_COLORS[reason] ?? ARCHIVE_REASON_COLORS.otro
}

/** 430 → "1 año y 2 meses (430 días)" */
export function lifetimeLabel(days?: number | null): string {
  const total = Number(days ?? 0)
  if (!Number.isFinite(total) || total <= 0) return 'Menos de un día'
  const months = Math.floor(total / 30)
  if (months < 1) return `${total} ${total === 1 ? 'día' : 'días'}`
  const years = Math.floor(months / 12)
  const restMonths = months % 12
  const parts: string[] = []
  if (years) parts.push(`${years} ${years === 1 ? 'año' : 'años'}`)
  if (restMonths) parts.push(`${restMonths} ${restMonths === 1 ? 'mes' : 'meses'}`)
  if (!parts.length) parts.push(`${months} ${months === 1 ? 'mes' : 'meses'}`)
  return `${parts.join(' y ')} (${total} días)`
}

/** Días transcurridos desde una fecha hasta hoy. */
export function daysSince(from?: string | null): number {
  if (!from) return 0
  const start = new Date(from).getTime()
  if (Number.isNaN(start)) return 0
  return Math.max(Math.floor((Date.now() - start) / 86_400_000), 0)
}
