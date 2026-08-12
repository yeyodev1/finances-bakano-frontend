import type { BadgeVariant } from '@/components/base'
import type { BankTransaction } from '@/types'

/** Etiquetas y semántica compartidas por la vista Banco. */

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  sent: 'paid',
  pending: 'pending',
  failed: 'overdue',
  cancelled: 'cancelled',
  reversed: 'partial',
  blocked: 'overdue',
}

const STATUS_LABEL: Record<string, string> = {
  sent: 'Enviado',
  pending: 'Pendiente',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  reversed: 'Reversado',
  blocked: 'Bloqueado',
}

const KIND_LABEL: Record<string, string> = {
  externalTransfer: 'Transferencia externa',
  internalTransfer: 'Transferencia interna',
  outgoingPayment: 'Pago enviado',
  creditCardCredit: 'Crédito de tarjeta',
  creditCardTransaction: 'Consumo de tarjeta',
  debitCardTransaction: 'Consumo de débito',
  incomingDomesticWire: 'Wire recibido',
  outgoingDomesticWire: 'Wire enviado',
  incomingInternationalWire: 'Wire internacional recibido',
  checkDeposit: 'Depósito de cheque',
  treasuryTransfer: 'Movimiento de tesorería',
  wireFee: 'Comisión wire',
  cardInternationalTransactionFee: 'Comisión internacional',
  other: 'Otro',
}

/**
 * Estado de una tarjeta. Cada uno tiene color **e** icono propio: el color solo no alcanza
 * para distinguirlos si alguien no ve bien los tonos.
 */
const CARD_STATUS: Record<string, { variant: BadgeVariant; label: string; icon: string }> = {
  active: { variant: 'active', label: 'Activa', icon: 'fa-solid fa-circle-check' },
  frozen: { variant: 'info', label: 'Congelada', icon: 'fa-solid fa-snowflake' },
  locked: { variant: 'danger', label: 'Bloqueada', icon: 'fa-solid fa-lock' },
  cancelled: { variant: 'cancelled', label: 'Cancelada', icon: 'fa-solid fa-ban' },
  canceled: { variant: 'cancelled', label: 'Cancelada', icon: 'fa-solid fa-ban' },
}

export function cardStatus(status?: string | null) {
  return (
    CARD_STATUS[String(status || '').toLowerCase()] ?? {
      variant: 'neutral' as BadgeVariant,
      label: status ? String(status) : '—',
      icon: 'fa-solid fa-circle',
    }
  )
}


export function statusVariant(status?: string | null): BadgeVariant {
  return STATUS_VARIANT[String(status || '').toLowerCase()] ?? 'neutral'
}

export function statusLabel(status?: string | null): string {
  const key = String(status || '').toLowerCase()
  return STATUS_LABEL[key] ?? (status ? String(status) : '—')
}

export function kindLabel(kind?: string | null): string {
  if (!kind) return '—'
  return KIND_LABEL[kind] ?? kind.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())
}

const SUBSCRIPTION_STATUS: Record<string, { variant: BadgeVariant; label: string }> = {
  active: { variant: 'active', label: 'Al día' },
  failing: { variant: 'overdue', label: 'Cobro rechazado' },
  due: { variant: 'pending', label: 'Cobro atrasado' },
  stale: { variant: 'inactive', label: 'Sin cobros' },
}

export function subscriptionStatus(status?: string | null) {
  return SUBSCRIPTION_STATUS[String(status || '')] ?? { variant: 'neutral' as BadgeVariant, label: '—' }
}

/** Descripción legible del movimiento, en el orden en que Mercury la trae. */
export function describe(tx: BankTransaction): string {
  return (
    tx.counterpartyNickname ||
    tx.counterpartyName ||
    tx.externalMemo ||
    tx.bankDescription ||
    tx.note ||
    'Movimiento'
  )
}
