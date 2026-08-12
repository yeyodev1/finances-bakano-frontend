import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'

/**
 * Avisa cuando se desplegó una versión nueva de la aplicación.
 *
 * Los bundles llevan hash en el nombre, así que quien deja la pestaña abierta
 * sigue con el JS viejo indefinidamente. Peor: al navegar a una vista con carga
 * diferida, el chunk que pide ya no existe en el servidor y la navegación
 * revienta sin explicación. Se cubren los dos casos: se compara el id de la
 * compilación contra `/version.json`, y se escucha el fallo de import dinámico
 * como señal de que la versión caducó.
 */

/** Cada 5 min basta: un despliegue no es urgente y no conviene añadir ruido. */
const POLL_MS = 5 * 60 * 1000

/** Estado compartido: el aviso es uno solo aunque lo consulten varias vistas. */
const updateAvailable = ref(false)
const checking = ref(false)
let started = false
let timer: ReturnType<typeof setInterval> | null = null

function currentBuildId(): string {
  return typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : ''
}

async function check(): Promise<void> {
  if (updateAvailable.value || checking.value) return
  checking.value = true
  try {
    // `cache: no-store` y el parámetro sirven contra la caché del navegador y la
    // del CDN: sin esto se compararía siempre el mismo archivo cacheado.
    const url = `${import.meta.env.BASE_URL}version.json?t=${Date.now()}`
    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) return

    const data = (await res.json()) as { buildId?: string }
    const served = String(data?.buildId ?? '')
    const running = currentBuildId()
    if (served && running && served !== running) updateAvailable.value = true
  } catch {
    // Sin red o servidor caído: se reintenta en el próximo ciclo, sin molestar.
  } finally {
    checking.value = false
  }
}

/** Marca la versión como caducada; la usa el manejador de errores del router. */
function flagStale(): void {
  updateAvailable.value = true
}

function reload(): void {
  window.location.reload()
}

function onVisible(): void {
  if (document.visibilityState === 'visible') void check()
}

export function useAppVersion(options: { autoStart?: boolean } = {}) {
  const { autoStart = false } = options

  if (autoStart) {
    onMounted(() => {
      // Solo el primer consumidor arranca el sondeo, aunque se use en varias vistas.
      if (started) return
      started = true
      void check()
      timer = setInterval(check, POLL_MS)
      // Al volver a la pestaña es cuando más probable es haberse quedado atrás.
      document.addEventListener('visibilitychange', onVisible)
      window.addEventListener('focus', onVisible)
    })

    onBeforeUnmount(() => {
      if (timer) clearInterval(timer)
      timer = null
      started = false
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    })
  }

  return {
    updateAvailable: readonly(updateAvailable),
    checking: readonly(checking),
    check,
    flagStale,
    reload,
  }
}
