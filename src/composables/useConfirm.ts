import { reactive, readonly } from 'vue'

export type ConfirmVariant = 'danger' | 'warning' | 'primary'

export interface ConfirmOptions {
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  /** Alias de `confirmLabel`. */
  confirmText?: string
  /** Alias de `cancelLabel`. */
  cancelText?: string
  variant?: ConfirmVariant
  icon?: string
}

interface ConfirmState {
  open: boolean
  loading: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  variant: ConfirmVariant
  icon: string
}

const state = reactive<ConfirmState>({
  open: false,
  loading: false,
  title: '¿Estás seguro?',
  message: 'Esta acción no se puede deshacer.',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  variant: 'danger',
  icon: '',
})

let resolver: ((value: boolean) => void) | null = null

function settle(value: boolean): void {
  state.open = false
  state.loading = false
  const done = resolver
  resolver = null
  if (done) done(value)
}

function confirm(options: ConfirmOptions | string = {}): Promise<boolean> {
  const opts: ConfirmOptions = typeof options === 'string' ? { message: options } : options

  // Si había un diálogo abierto, se resuelve como cancelado
  if (resolver) settle(false)

  state.title = opts.title ?? '¿Estás seguro?'
  state.message = opts.message ?? 'Esta acción no se puede deshacer.'
  state.confirmLabel = opts.confirmLabel ?? opts.confirmText ?? 'Confirmar'
  state.cancelLabel = opts.cancelLabel ?? opts.cancelText ?? 'Cancelar'
  state.variant = opts.variant ?? 'danger'
  state.icon = opts.icon ?? ''
  state.loading = false
  state.open = true

  return new Promise<boolean>((resolve) => {
    resolver = resolve
  })
}

/** Marca el diálogo como "procesando" sin cerrarlo (útil en acciones async). */
function setLoading(value: boolean): void {
  state.loading = value
}

export function useConfirm() {
  return {
    confirm,
    setLoading,
    state: readonly(state),
  }
}

/** API interna usada por BaseConfirmHost. */
export const confirmState = state
export const resolveConfirm = (value: boolean) => settle(value)
