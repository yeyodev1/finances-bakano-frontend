import { onBeforeUnmount, reactive, ref, type Ref } from 'vue'

export interface FloatingPosition {
  top: number
  left: number
  width: number
  placement: 'bottom' | 'top'
  /** Alto máximo para que el panel quepa en pantalla; el panel scrollea dentro. */
  maxHeight: number
}

export interface FloatingOptions {
  /** Separación entre el trigger y el panel (px). */
  offset?: number
  /** Alto estimado del panel, usado solo hasta poder medirlo de verdad. */
  estimatedHeight?: number
  /** Ancho mínimo del panel (px). */
  minWidth?: number
  /** Si es true, el panel iguala el ancho del trigger. */
  matchWidth?: boolean
  /** Alto mínimo utilizable; por debajo de esto no vale la pena abrir hacia ese lado. */
  minHeight?: number
}

/** Margen con el borde de la ventana, para que nunca quede pegado. */
const VIEWPORT_MARGIN = 8

/**
 * Calcula la posición de un panel teletransportado al body respecto de su
 * trigger, eligiendo arriba o abajo según el espacio real.
 *
 * El lado no se decide solo por "dónde hay más sitio": hay que comprobar que el
 * panel QUEPA. Antes, con el trigger en la mitad baja de un modal, se abría
 * hacia arriba aunque el calendario fuera más alto que el hueco, y como se
 * posiciona con `translateY(-100%)` se salía por encima de la ventana y perdías
 * la cabecera del mes. Ahora el alto se recorta al espacio disponible y el panel
 * scrollea por dentro.
 */
export function useFloatingPanel(
  triggerRef: Ref<HTMLElement | null>,
  options: FloatingOptions = {},
) {
  const {
    offset = 8,
    estimatedHeight = 300,
    minWidth = 200,
    matchWidth = true,
    minHeight = 180,
  } = options

  const position = reactive<FloatingPosition>({
    top: 0,
    left: 0,
    width: minWidth,
    placement: 'bottom',
    maxHeight: estimatedHeight,
  })

  /** Panel real, para medir su alto en vez de adivinarlo. */
  const panelRef = ref<HTMLElement | null>(null)

  const active = ref(false)
  let raf = 0

  function update() {
    const el = triggerRef.value
    if (!el || typeof window === 'undefined') return

    const rect = el.getBoundingClientRect()

    // El alto natural del panel: se mide si ya está en el DOM, si no se estima.
    const measured = panelRef.value?.scrollHeight ?? 0
    const desiredHeight = measured > 0 ? measured : estimatedHeight

    const spaceBelow = window.innerHeight - rect.bottom - offset - VIEWPORT_MARGIN
    const spaceAbove = rect.top - offset - VIEWPORT_MARGIN

    // Solo se abre hacia arriba si abajo no cabe y arriba hay más sitio.
    const fitsBelow = spaceBelow >= desiredHeight
    const openUp = !fitsBelow && spaceAbove > spaceBelow

    const available = Math.max(openUp ? spaceAbove : spaceBelow, 0)
    // Nunca menos de `minHeight`: con un hueco ridículo es preferible que el
    // panel se solape un poco antes que quedar inservible.
    const maxHeight = Math.max(Math.min(desiredHeight, available), minHeight)

    const width = matchWidth ? Math.max(rect.width, minWidth) : minWidth
    let left = rect.left
    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN
    if (left > maxLeft) left = Math.max(VIEWPORT_MARGIN, maxLeft)
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN

    position.placement = openUp ? 'top' : 'bottom'
    position.maxHeight = maxHeight
    position.width = width
    position.left = left

    if (openUp) {
      // El panel se ancla con translateY(-100%), así que `top` es su borde
      // inferior. Se baja lo necesario para que su borde superior no se salga.
      position.top = Math.max(rect.top - offset, maxHeight + VIEWPORT_MARGIN)
    } else {
      position.top = Math.min(
        rect.bottom + offset,
        window.innerHeight - VIEWPORT_MARGIN - maxHeight,
      )
    }
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

  return { position, panelRef, update, start, stop }
}
