import { reactive, readonly } from 'vue'
import type { ToastItem } from '@/types'

type ToastType = ToastItem['type']

const items = reactive<ToastItem[]>([])
const timers = new Map<string, ReturnType<typeof setTimeout>>()

let seq = 0
function nextId(): string {
  seq += 1
  return `t-${Date.now().toString(36)}-${seq}`
}

const DEFAULT_DURATION: Record<ToastType, number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000,
}

function dismiss(id: string): void {
  const idx = items.findIndex((t) => t.id === id)
  if (idx !== -1) items.splice(idx, 1)
  const timer = timers.get(id)
  if (timer) {
    clearTimeout(timer)
    timers.delete(id)
  }
}

function clear(): void {
  timers.forEach((t) => clearTimeout(t))
  timers.clear()
  items.splice(0, items.length)
}

/**
 * Sonido por tipo de aviso. Se engancha aquí y no en cada vista porque todo
 * éxito y todo error del sistema pasa por el toast: un solo punto en vez de
 * cincuenta llamadas repartidas que alguien olvidaría al añadir una pantalla.
 */
const CUE_BY_TYPE: Record<ToastType, 'exito' | 'error' | 'aviso'> = {
  success: 'exito',
  error: 'error',
  warning: 'aviso',
  info: 'aviso',
}

function push(type: ToastType, title: string, message?: string, duration?: number): string {
  // Import diferido: useToast se usa en sitios sin componente montado y no debe
  // arrastrar el audio si el sonido está apagado.
  void import('./useSound').then(({ useSound }) => useSound().cue(CUE_BY_TYPE[type] ?? 'aviso'))

  const id = nextId()
  const ms = duration ?? DEFAULT_DURATION[type]
  items.push({ id, type, title, message, duration: ms })

  // Máximo 5 toasts visibles: descarta el más antiguo
  while (items.length > 5) {
    const oldest = items[0]
    if (oldest) dismiss(oldest.id)
    else break
  }

  if (ms > 0) {
    timers.set(id, setTimeout(() => dismiss(id), ms))
  }
  return id
}

export function useToast() {
  return {
    toasts: readonly(items),
    success: (title: string, message?: string, duration?: number) =>
      push('success', title, message, duration),
    error: (title: string, message?: string, duration?: number) =>
      push('error', title, message, duration),
    warning: (title: string, message?: string, duration?: number) =>
      push('warning', title, message, duration),
    info: (title: string, message?: string, duration?: number) =>
      push('info', title, message, duration),
    dismiss,
    clear,
  }
}

/** Lista reactiva cruda — usada por el contenedor BaseToast. */
export const toastItems = items
