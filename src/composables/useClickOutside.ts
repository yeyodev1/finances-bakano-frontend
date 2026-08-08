import { onBeforeUnmount, onMounted, unref, type Ref } from 'vue'

type MaybeEl = HTMLElement | null | undefined
export type ClickOutsideTarget = Ref<MaybeEl> | (() => MaybeEl)

function resolve(target: ClickOutsideTarget): MaybeEl {
  return typeof target === 'function' ? target() : unref(target)
}

/**
 * Ejecuta `handler` cuando se hace click fuera de todos los targets indicados.
 * Acepta refs de elementos o funciones que devuelvan elementos (útil con Teleport).
 */
export function useClickOutside(
  targets: ClickOutsideTarget | ClickOutsideTarget[],
  handler: (event: PointerEvent) => void,
  options: { enabled?: Ref<boolean> | (() => boolean) } = {},
) {
  const list = Array.isArray(targets) ? targets : [targets]

  const isEnabled = () => {
    const en = options.enabled
    if (!en) return true
    return typeof en === 'function' ? en() : unref(en)
  }

  const onPointerDown = (event: PointerEvent) => {
    if (!isEnabled()) return
    const path = event.composedPath()
    for (const t of list) {
      const el = resolve(t)
      if (el && (path.includes(el) || el.contains(event.target as Node))) return
    }
    handler(event)
  }

  onMounted(() => document.addEventListener('pointerdown', onPointerDown, true))
  onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown, true))

  return {
    stop: () => document.removeEventListener('pointerdown', onPointerDown, true),
  }
}
