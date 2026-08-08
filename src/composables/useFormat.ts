const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const MONTHS_ES_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
]

// Semana empezando en lunes
const WEEKDAYS_ES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const WEEKDAYS_ES_MIN = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

const moneyFormatter = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const numberFormatter = new Intl.NumberFormat('es-EC', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export type DateLike = string | number | Date | null | undefined

function toDate(value: DateLike): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }
  // Fechas "YYYY-MM-DD" se interpretan como local para evitar desfase de zona horaria
  const plain = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (plain) {
    return new Date(Number(plain[1]), Number(plain[2]) - 1, Number(plain[3]))
  }
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function useFormat() {
  /** 1234.5 → "$ 1.234,50" (es-EC, USD) */
  function formatMoney(value: number | null | undefined, fallback = '$0,00'): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback
    return moneyFormatter.format(Number(value))
  }

  /** 1234.5 → "1.234,50" (sin símbolo) */
  function formatNumber(value: number | null | undefined, fallback = '0,00'): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback
    return numberFormatter.format(Number(value))
  }

  /** 0.734 → "73,4 %" */
  function formatPercent(value: number | null | undefined, decimals = 1): string {
    if (value === null || value === undefined || Number.isNaN(Number(value))) return '0 %'
    const n = Number(value)
    const pct = Math.abs(n) <= 1 ? n * 100 : n
    return `${pct.toFixed(decimals).replace('.', ',')} %`
  }

  /** "2026-08-15" → "15 de agosto de 2026" */
  function formatDate(value: DateLike, fallback = '—'): string {
    const d = toDate(value)
    if (!d) return fallback
    return `${d.getDate()} de ${(MONTHS_ES[d.getMonth()] ?? '').toLowerCase()} de ${d.getFullYear()}`
  }

  /** "2026-08-15" → "15 Ago 2026" */
  function formatDateShort(value: DateLike, fallback = '—'): string {
    const d = toDate(value)
    if (!d) return fallback
    return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_ES_SHORT[d.getMonth()]} ${d.getFullYear()}`
  }

  /** "2026-08-15T14:32:00Z" → "15 Ago 2026, 14:32" */
  function formatDateTime(value: DateLike, fallback = '—'): string {
    const d = toDate(value)
    if (!d) return fallback
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    return `${formatDateShort(d)}, ${hh}:${mm}`
  }

  /** "2026-08" → "Agosto 2026" */
  function formatPeriod(period: string | null | undefined, fallback = '—'): string {
    if (!period) return fallback
    const m = /^(\d{4})-(\d{1,2})$/.exec(period)
    if (!m) return period
    const idx = Number(m[2]) - 1
    if (idx < 0 || idx > 11) return period
    return `${MONTHS_ES[idx]} ${m[1]}`
  }

  /** "2026-08" → "Ago 2026" */
  function formatPeriodShort(period: string | null | undefined, fallback = '—'): string {
    if (!period) return fallback
    const m = /^(\d{4})-(\d{1,2})$/.exec(period)
    if (!m) return period
    const idx = Number(m[2]) - 1
    if (idx < 0 || idx > 11) return period
    return `${MONTHS_ES_SHORT[idx]} ${m[1]}`
  }

  /** 15 → "Día 15" */
  function dayLabel(day: number | null | undefined, fallback = 'Sin día fijo'): string {
    if (day === null || day === undefined || Number.isNaN(Number(day))) return fallback
    return `Día ${Number(day)}`
  }

  /** Diferencia en días respecto a hoy, en texto: "en 3 días", "hace 2 días", "hoy" */
  function relativeDays(value: DateLike, fallback = '—'): string {
    const d = toDate(value)
    if (!d) return fallback
    const today = new Date()
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const diff = Math.round((a - b) / 86_400_000)
    if (diff === 0) return 'hoy'
    if (diff === 1) return 'mañana'
    if (diff === -1) return 'ayer'
    if (diff > 0) return diff < 30 ? `en ${diff} días` : `en ${Math.round(diff / 30)} meses`
    const abs = Math.abs(diff)
    return abs < 30 ? `hace ${abs} días` : `hace ${Math.round(abs / 30)} meses`
  }

  /** Días entre la fecha y hoy (positivo = futuro) */
  function daysDiff(value: DateLike): number | null {
    const d = toDate(value)
    if (!d) return null
    const today = new Date()
    const a = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    const b = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    return Math.round((a - b) / 86_400_000)
  }

  /** Date → "YYYY-MM-DD" en horario local */
  function toISODate(value: DateLike): string | null {
    const d = toDate(value)
    if (!d) return null
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${mm}-${dd}`
  }

  /** Date → "YYYY-MM" */
  function toPeriod(value: DateLike): string | null {
    const d = toDate(value)
    if (!d) return null
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  /** "Diego Reyes" → "DR" */
  function initials(name: string | null | undefined, max = 2): string {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (!parts.length) return '?'
    return parts.slice(0, max).map((p) => p.charAt(0).toUpperCase()).join('')
  }

  return {
    formatMoney,
    formatNumber,
    formatPercent,
    formatDate,
    formatDateShort,
    formatDateTime,
    formatPeriod,
    formatPeriodShort,
    dayLabel,
    relativeDays,
    daysDiff,
    toISODate,
    toPeriod,
    initials,
    toDate,
    MONTHS_ES,
    MONTHS_ES_SHORT,
    WEEKDAYS_ES_SHORT,
    WEEKDAYS_ES_MIN,
  }
}

export { MONTHS_ES, MONTHS_ES_SHORT, WEEKDAYS_ES_SHORT, WEEKDAYS_ES_MIN }
