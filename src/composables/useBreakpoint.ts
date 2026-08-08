import { onBeforeUnmount, onMounted, readonly, ref, computed } from 'vue'

const BP_SM = 480
const BP_MD = 768
const BP_LG = 1024
const BP_XL = 1280

const width = ref<number>(typeof window !== 'undefined' ? window.innerWidth : BP_LG)
let listeners = 0
let handler: (() => void) | null = null

function ensureListener() {
  if (typeof window === 'undefined') return
  if (!handler) {
    handler = () => {
      width.value = window.innerWidth
    }
    window.addEventListener('resize', handler, { passive: true })
  }
  listeners += 1
}

function releaseListener() {
  listeners -= 1
  if (listeners <= 0 && handler && typeof window !== 'undefined') {
    window.removeEventListener('resize', handler)
    handler = null
    listeners = 0
  }
}

export function useBreakpoint() {
  onMounted(() => {
    ensureListener()
    if (typeof window !== 'undefined') width.value = window.innerWidth
  })
  onBeforeUnmount(releaseListener)

  const isMobile = computed(() => width.value < BP_MD)
  const isTablet = computed(() => width.value >= BP_MD && width.value < BP_LG)
  const isDesktop = computed(() => width.value >= BP_LG)
  const isSmall = computed(() => width.value < BP_SM)
  const isWide = computed(() => width.value >= BP_XL)

  return {
    width: readonly(width),
    isMobile,
    isTablet,
    isDesktop,
    isSmall,
    isWide,
  }
}

export const breakpoints = { BP_SM, BP_MD, BP_LG, BP_XL }
