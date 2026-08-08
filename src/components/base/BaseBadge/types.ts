/** Estados de dominio (cobros y clientes). */
export type BadgeStatus =
  | 'paid'
  | 'pending'
  | 'overdue'
  | 'partial'
  | 'waived'
  | 'cancelled'
  | 'active'
  | 'inactive'
  | 'neutral'

/** Tonos genéricos, útiles cuando la vista mapea a semántica libre. */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'secondary'

export type BadgeVariant = BadgeStatus | BadgeTone

export type BadgeSize = 'sm' | 'md' | 'lg'

export interface BadgeProps {
  variant?: BadgeVariant
  label?: string
  icon?: string
  dot?: boolean
  size?: BadgeSize
  pulse?: boolean
}

/** Etiquetas por defecto en español para cada variante. */
export const BADGE_LABELS: Record<BadgeVariant, string> = {
  paid: 'Pagado',
  pending: 'Pendiente',
  overdue: 'Vencido',
  partial: 'Parcial',
  waived: 'Condonado',
  cancelled: 'Cancelado',
  active: 'Activo',
  inactive: 'Inactivo',
  neutral: '—',
  success: 'Correcto',
  warning: 'Atención',
  danger: 'Alerta',
  info: 'Información',
  primary: '',
  secondary: '',
}

/** Icono FontAwesome sugerido por variante. */
export const BADGE_ICONS: Record<BadgeVariant, string> = {
  paid: 'fa-solid fa-circle-check',
  pending: 'fa-solid fa-clock',
  overdue: 'fa-solid fa-triangle-exclamation',
  partial: 'fa-solid fa-circle-half-stroke',
  waived: 'fa-solid fa-hand-holding-heart',
  cancelled: 'fa-solid fa-ban',
  active: 'fa-solid fa-bolt',
  inactive: 'fa-solid fa-power-off',
  neutral: 'fa-solid fa-circle',
  success: 'fa-solid fa-circle-check',
  warning: 'fa-solid fa-triangle-exclamation',
  danger: 'fa-solid fa-circle-exclamation',
  info: 'fa-solid fa-circle-info',
  primary: 'fa-solid fa-circle',
  secondary: 'fa-solid fa-circle',
}
