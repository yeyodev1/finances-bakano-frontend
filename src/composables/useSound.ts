import { computed, ref } from 'vue'
import { play, setEnabled, setVolume, sounds, type SoundName } from 'cuelume'

/**
 * Sonidos de interfaz (cuelume).
 *
 * La librería aplica volumen y encendido pero **no los persiste**: la
 * preferencia es de la aplicación. Aquí vive en localStorage para que sobreviva
 * a la recarga sin depender del backend, que es donde una preferencia de sonido
 * no pinta nada.
 *
 * Arranca **apagado** a propósito. Un sistema financiero que empieza a sonar
 * solo, en una oficina y sin avisar, es intrusivo: que suene tiene que ser una
 * decisión de quien lo usa, no del que lo programó.
 */

const KEY_ENABLED = 'ui-sound-enabled'
const KEY_VOLUME = 'ui-sound-volume'

/** Volumen por defecto: audible sin sobresaltar. */
const DEFAULT_VOLUME = 0.5

function readEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false
  return localStorage.getItem(KEY_ENABLED) === 'true'
}

function readVolume(): number {
  if (typeof localStorage === 'undefined') return DEFAULT_VOLUME

  // Ojo con `Number()`: convierte `null` (clave ausente) y "" en 0, que aquí
  // significa silencio. Un arranque limpio se quedaba mudo aunque el sonido
  // estuviera activado. Solo se acepta una cadena no vacía; un 0 guardado a
  // propósito sí es válido.
  const stored = localStorage.getItem(KEY_VOLUME)
  if (stored === null || stored.trim() === '') return DEFAULT_VOLUME

  const raw = Number(stored)
  return Number.isFinite(raw) && raw >= 0 && raw <= 1 ? raw : DEFAULT_VOLUME
}

// Estado compartido: la preferencia es una sola para toda la aplicación.
const enabled = ref(readEnabled())
const volume = ref(readVolume())

/** Aplica el estado actual a la librería. Se llama al arrancar y al cambiar. */
function sync(): void {
  setEnabled(enabled.value)
  setVolume(volume.value)
}

let started = false

/**
 * Qué suena en cada situación del sistema. Se mapea por SIGNIFICADO y no por
 * componente: así "algo salió bien" suena igual venga de donde venga, que es lo
 * que permite reconocerlo sin mirar la pantalla.
 */
export const CUES = {
  /** Una acción terminó bien: pago registrado, cliente creado. */
  exito: 'success',
  /** Algo falló pero se puede reintentar. */
  error: 'error',
  /** Aviso que no bloquea: falta un dato, revisa el formulario. */
  aviso: 'droplet',
  /** Se abrió un modal o un panel. */
  abrir: 'bloom',
  /** Se cerró o se descartó. */
  cerrar: 'droplet',
  /** Empezó algo que tarda: generar cobros, exportar. */
  trabajando: 'loading',
  /** Terminó eso que tardaba y ya se puede mirar. */
  listo: 'ready',
  /** Se navegó a otra pantalla. */
  navegar: 'arrival',
  /** Dinero que entra. Se reserva para el cobro, que es EL evento del sistema. */
  cobro: 'sparkle',
} as const satisfies Record<string, SoundName>

export type CueName = keyof typeof CUES

export function useSound() {
  /** Aplica la preferencia guardada. Se llama una vez al arrancar la app. */
  function start(): void {
    if (started) return
    started = true
    sync()
  }

  function setSoundEnabled(value: boolean): void {
    enabled.value = value
    localStorage.setItem(KEY_ENABLED, String(value))
    sync()
    // Confirmación audible al encender: sin ella no hay forma de saber si
    // funciona hasta que ocurra algo, y el navegador además exige un gesto
    // previo para dejar sonar nada.
    if (value) play(CUES.exito, { volume: volume.value })
  }

  function setSoundVolume(value: number): void {
    const clamped = Math.min(Math.max(Number(value) || 0, 0), 1)
    volume.value = clamped
    localStorage.setItem(KEY_VOLUME, String(clamped))
    sync()
  }

  /** Reproduce un sonido por su significado. No hace nada si está apagado. */
  function cue(name: CueName): void {
    if (!enabled.value) return
    play(CUES[name])
  }

  /** Reproduce un sonido concreto del catálogo. Para la pantalla de ajustes. */
  function preview(name: SoundName): void {
    play(name, { volume: volume.value })
  }

  return {
    enabled: computed(() => enabled.value),
    volume: computed(() => volume.value),
    catalog: sounds,
    start,
    setSoundEnabled,
    setSoundVolume,
    cue,
    preview,
  }
}
