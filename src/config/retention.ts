/**
 * Retención: garantías y reembolsos.
 *
 * Iconos, tonos y opciones para que ningún estado dependa solo del color —los
 * estados de garantía se leen igual en gris que en pantalla a plena luz.
 */
import {
  GUARANTEE_STATUSES,
  GUARANTEE_STATUS_LABELS,
  REFUND_REASONS,
  REFUND_REASON_LABELS,
} from '@/types'
import type { BadgeTone } from '@/components/base'
import type { GuaranteeStatus, RefundReason, SelectOption } from '@/types'

// ── Motivos de reembolso ─────────────────────────────────────────

export const REFUND_REASON_ICONS: Record<RefundReason, string> = {
  garantia: 'fa-solid fa-shield-halved',
  sin_resultados: 'fa-solid fa-chart-line-down',
  servicio_no_prestado: 'fa-solid fa-plug-circle-xmark',
  cobro_duplicado: 'fa-solid fa-clone',
  error_de_cobro: 'fa-solid fa-triangle-exclamation',
  acuerdo_comercial: 'fa-solid fa-handshake',
  otro: 'fa-solid fa-circle-question',
}

export const REFUND_REASON_TONES: Record<RefundReason, BadgeTone> = {
  garantia: 'warning',
  sin_resultados: 'danger',
  servicio_no_prestado: 'danger',
  cobro_duplicado: 'info',
  error_de_cobro: 'info',
  acuerdo_comercial: 'secondary',
  otro: 'primary',
}

export const REFUND_REASON_OPTIONS: SelectOption[] = REFUND_REASONS.map((value) => ({
  value,
  label: REFUND_REASON_LABELS[value],
  icon: REFUND_REASON_ICONS[value],
  color: REFUND_REASON_TONES[value],
}))

export function refundReasonLabel(reason?: RefundReason | null, fallback = 'Sin motivo'): string {
  if (!reason) return fallback
  return REFUND_REASON_LABELS[reason] ?? fallback
}

export function refundReasonIcon(reason?: RefundReason | null): string {
  if (!reason) return 'fa-solid fa-rotate-left'
  return REFUND_REASON_ICONS[reason] ?? 'fa-solid fa-rotate-left'
}

export function refundReasonTone(reason?: RefundReason | null): BadgeTone {
  if (!reason) return 'primary'
  return REFUND_REASON_TONES[reason] ?? 'primary'
}

// ── Estados de garantía ──────────────────────────────────────────

export const GUARANTEE_STATUS_ICONS: Record<GuaranteeStatus, string> = {
  abierta: 'fa-solid fa-shield-halved',
  extendida: 'fa-solid fa-hourglass-half',
  cumplida: 'fa-solid fa-circle-check',
  fallida: 'fa-solid fa-heart-crack',
  cancelada: 'fa-solid fa-ban',
}

export const GUARANTEE_STATUS_TONES: Record<GuaranteeStatus, BadgeTone> = {
  abierta: 'info',
  extendida: 'warning',
  cumplida: 'success',
  fallida: 'danger',
  cancelada: 'secondary',
}

/** Texto corto para chips y tablas, donde la etiqueta larga no entra. */
export const GUARANTEE_STATUS_SHORT: Record<GuaranteeStatus, string> = {
  abierta: 'Mes 1',
  extendida: 'Mes 2',
  cumplida: 'Recuperado',
  fallida: 'Fracaso',
  cancelada: 'Cancelada',
}

export const GUARANTEE_STATUS_OPTIONS: SelectOption[] = GUARANTEE_STATUSES.map((value) => ({
  value,
  label: GUARANTEE_STATUS_LABELS[value],
  icon: GUARANTEE_STATUS_ICONS[value],
  color: GUARANTEE_STATUS_TONES[value],
}))

export function guaranteeStatusLabel(status?: GuaranteeStatus | null, fallback = '—'): string {
  if (!status) return fallback
  return GUARANTEE_STATUS_LABELS[status] ?? fallback
}

export function guaranteeStatusShort(status?: GuaranteeStatus | null, fallback = '—'): string {
  if (!status) return fallback
  return GUARANTEE_STATUS_SHORT[status] ?? fallback
}

export function guaranteeStatusIcon(status?: GuaranteeStatus | null): string {
  if (!status) return 'fa-solid fa-shield-halved'
  return GUARANTEE_STATUS_ICONS[status] ?? 'fa-solid fa-shield-halved'
}

export function guaranteeStatusTone(status?: GuaranteeStatus | null): BadgeTone {
  if (!status) return 'primary'
  return GUARANTEE_STATUS_TONES[status] ?? 'primary'
}

export function isGuaranteeOpen(status?: GuaranteeStatus | null): boolean {
  return status === 'abierta' || status === 'extendida'
}

/** Cómo se puede cerrar una garantía, con el texto que explica la consecuencia. */
export const GUARANTEE_OUTCOME_OPTIONS: Array<{
  value: 'cumplida' | 'fallida' | 'cancelada'
  label: string
  hint: string
  icon: string
  tone: BadgeTone
}> = [
  {
    value: 'cumplida',
    label: 'Hubo resultados',
    hint: 'El cliente vuelve a facturarse el mes que viene con normalidad.',
    icon: 'fa-solid fa-circle-check',
    tone: 'success',
  },
  {
    value: 'fallida',
    label: 'No hubo resultados: fracaso',
    hint: 'Se marca como fracaso y, salvo que lo desmarques, el cliente queda de baja.',
    icon: 'fa-solid fa-heart-crack',
    tone: 'danger',
  },
  {
    value: 'cancelada',
    label: 'Cancelar la garantía',
    hint: 'Se abrió por error: los meses condonados vuelven a quedar por cobrar.',
    icon: 'fa-solid fa-ban',
    tone: 'secondary',
  },
]

/** "2026-09" → "sep 2026". Para chips donde no cabe el mes completo. */
export function periodChip(period?: string | null): string {
  if (!period) return '—'
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  const label = new Intl.DateTimeFormat('es-EC', { month: 'short' }).format(
    new Date(year, month - 1, 1),
  )
  return `${label.replace('.', '')} ${year}`
}
