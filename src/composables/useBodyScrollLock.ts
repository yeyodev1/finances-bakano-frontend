import { onBeforeUnmount } from 'vue'

let locks = 0
let previousOverflow = ''
let previousPaddingRight = ''

function applyLock() {
  if (typeof document === 'undefined') return
  const body = document.body
  const scrollbar = window.innerWidth - document.documentElement.clientWidth
  previousOverflow = body.style.overflow
  previousPaddingRight = body.style.paddingRight
  body.style.overflow = 'hidden'
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`
}

function releaseLock() {
  if (typeof document === 'undefined') return
  const body = document.body
  body.style.overflow = previousOverflow
  body.style.paddingRight = previousPaddingRight
}

/** Bloquea el scroll del body mientras haya al menos un consumidor activo. */
export function useBodyScrollLock() {
  let owned = false

  function lock() {
    if (owned) return
    owned = true
    locks += 1
    if (locks === 1) applyLock()
  }

  function unlock() {
    if (!owned) return
    owned = false
    locks = Math.max(0, locks - 1)
    if (locks === 0) releaseLock()
  }

  onBeforeUnmount(unlock)

  return { lock, unlock }
}
