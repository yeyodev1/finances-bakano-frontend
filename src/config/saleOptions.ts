import {
  SALE_FREQUENCIES,
  SALE_FREQUENCY_LABELS,
  SALE_ITEM_KINDS,
  SALE_ITEM_KIND_LABELS,
  SALE_LOST_REASONS,
  SALE_LOST_REASON_LABELS,
  SALE_STATUSES,
  SALE_STATUS_LABELS,
} from '@/types'
import type {
  SaleInstallmentStatus,
  SaleItemKind,
  SaleLostReason,
  SaleStatus,
  SelectOption,
} from '@/types'

export const SALE_ITEM_KIND_OPTIONS: SelectOption[] = SALE_ITEM_KINDS.map((value) => ({
  value,
  label: SALE_ITEM_KIND_LABELS[value],
  icon: value === 'recurrente' ? 'fa-solid fa-repeat' : 'fa-solid fa-1',
}))

/** Atajos para lo que más se vende; el vendedor igual puede escribir lo que sea. */
export const SUGGESTED_CONCEPTS: Array<{ concept: string; kind: SaleItemKind }> = [
  { concept: 'Mensualidad', kind: 'recurrente' },
  { concept: 'Página web', kind: 'unico' },
  { concept: 'Pauta publicitaria', kind: 'recurrente' },
  { concept: 'Setup inicial', kind: 'unico' },
]

export const SALE_FREQUENCY_OPTIONS: SelectOption[] = SALE_FREQUENCIES.map((value) => ({
  value,
  label: SALE_FREQUENCY_LABELS[value],
  icon: value === 'unico' ? 'fa-solid fa-1' : 'fa-solid fa-arrows-rotate',
}))

export const SALE_LOST_REASON_OPTIONS: SelectOption[] = SALE_LOST_REASONS.map((value) => ({
  value,
  label: SALE_LOST_REASON_LABELS[value],
}))

/** Tonos alineados con las variantes de BaseBadge. */
export const SALE_STATUS_TONE: Record<SaleStatus, string> = {
  acordada: 'info',
  cobrando: 'warning',
  cobrada: 'success',
  perdida: 'danger',
}

export const SALE_STATUS_ICON: Record<SaleStatus, string> = {
  acordada: 'fa-solid fa-handshake',
  cobrando: 'fa-solid fa-hourglass-half',
  cobrada: 'fa-solid fa-circle-check',
  perdida: 'fa-solid fa-circle-xmark',
}

export const SALE_STATUS_OPTIONS: SelectOption[] = SALE_STATUSES.map((value) => ({
  value,
  label: SALE_STATUS_LABELS[value],
  icon: SALE_STATUS_ICON[value],
}))

export const INSTALLMENT_TONE: Record<SaleInstallmentStatus, string> = {
  pendiente: 'neutral',
  vencida: 'danger',
  cobrada: 'success',
}

export const INSTALLMENT_ICON: Record<SaleInstallmentStatus, string> = {
  pendiente: 'fa-solid fa-clock',
  vencida: 'fa-solid fa-triangle-exclamation',
  cobrada: 'fa-solid fa-circle-check',
}

export const INSTALLMENT_LABEL: Record<SaleInstallmentStatus, string> = {
  pendiente: 'Pendiente',
  vencida: 'Vencida',
  cobrada: 'Cobrada',
}

export function lostReasonLabel(reason?: SaleLostReason | null): string {
  return reason ? SALE_LOST_REASON_LABELS[reason] : ''
}
