import { onBeforeUnmount, reactive, ref, type Ref } from 'vue'

export interface FloatingPosition {
  top: number
  left: number
  width: number
  placement: 'bottom' | 'top'
}

export interface FloatingOptions {
  /** Separación entre el trigger y el panel (px). */
  offset?: number
  /** Alto estimado del panel para decidir arriba/abajo. */
  estimatedHeight?: number
  /** Ancho mínimo del panel (px). */
  minWidth?: number
  /** Si es true, el panel iguala el ancho del trigger. */
  matchWidth?: boolean
}

/**
 * Calcula la posición absoluta de un panel teletransportado al body
 * respecto de un elemento trigger, eligiendo arriba/abajo según el espacio.
 */
export function useFloatingPanel(
  triggerRef: Ref<HTMLElement | null>,
  options: FloatingOptions = {},
) {
  const { offset = 8, estimatedHeight = 300, minWidth = 200, matchWidth = true } = options

  const position = reactive<FloatingPosition>({
    top: 0,
    left: 0,
    width: minWidth,
    placement: 'bottom',
  })

  const active = ref(false)
  let raf = 0

  function update() {
    const el = triggerRef.value
    if (!el || typeof window === 'undefined') return

    const rect = el.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const openUp = spaceBelow < estimatedHeight + offset && spaceAbove > spaceBelow

    const width = matchWidth ? Math.max(rect.width, minWidth) : minWidth
    let left = rect.left
    // Mantiene el panel dentro del viewport horizontalmente
    const maxLeft = window.innerWidth - width - 8
    if (left > maxLeft) left = Math.max(8, maxLeft)
    if (left < 8) left = 8

    position.placement = openUp ? 'top' : 'bottom'
    position.top = openUp ? rect.top - offset : rect.bottom + offset
    position.left = left
    position.width = width
  }

  function onScrollOrResize() {
    if (raf) cancelAnimationFrame(raf)
    raf = requestAnimationFrame(update)
  }

  function start() {
    if (active.value || typeof window === 'undefined') return
    active.value = true
    update()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
  }

  function stop() {
    if (!active.value || typeof window === 'undefined') return
    active.value = false
    window.removeEventListener('scroll', onScrollOrResize, true)
    window.removeEventListener('resize', onScrollOrResize)
    if (raf) cancelAnimationFrame(raf)
  }

  onBeforeUnmount(stop)

  return { position, update, start, stop }
}
