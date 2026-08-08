import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js'
import type { ChartOptions, ScriptableContext, TooltipItem } from 'chart.js'

let registered = false

export function setupCharts() {
  if (registered) return
  Chart.register(
    ArcElement,
    BarController,
    BarElement,
    CategoryScale,
    DoughnutController,
    Filler,
    Legend,
    LineController,
    LineElement,
    LinearScale,
    PointElement,
    Title,
    Tooltip,
  )
  Chart.defaults.font.family = "'Montserrat', sans-serif"
  Chart.defaults.font.size = 11
  Chart.defaults.color = '#6b7280'
  Chart.defaults.animation = { duration: 700, easing: 'easeOutQuart' }
  registered = true
}

setupCharts()

export const palette = {
  primary: '#e6285c',
  primaryDark: '#191423',
  secondary: '#85529c',
  green: '#3bb77e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  grid: 'rgba(25, 20, 35, 0.06)',
  muted: '#6b7280',
  surface: '#ffffff',
}

export const agingScale = ['#fbbf24', '#f59e0b', '#f97316', '#ef4444']

const moneyFmt = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

const moneyFmtExact = new Intl.NumberFormat('es-EC', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function money(value: number, exact = false): string {
  const n = Number.isFinite(value) ? value : 0
  return exact ? moneyFmtExact.format(n) : moneyFmt.format(n)
}

export function compact(value: number): string {
  const n = Math.abs(value)
  if (n >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `$${Math.round(value / 1000)}k`
  return `$${Math.round(value)}`
}

export const tooltipStyle = {
  backgroundColor: 'rgba(25, 20, 35, 0.94)',
  titleColor: '#ffffff',
  bodyColor: '#f5f5f5',
  padding: 12,
  cornerRadius: 10,
  displayColors: true,
  boxPadding: 4,
  titleFont: { weight: 700 as const, size: 12 },
  bodyFont: { size: 12 },
}

export function moneyTooltipLabel(ctx: TooltipItem<'line' | 'bar' | 'doughnut'>): string {
  const raw = typeof ctx.raw === 'number' ? ctx.raw : Number(ctx.parsed ?? 0)
  const label = ctx.dataset.label || ctx.label || ''
  return `${label ? `${label}: ` : ''}${money(raw, true)}`
}

export function verticalGradient(
  ctx: ScriptableContext<'line'>,
  color: string,
  alphaTop = 0.28,
): CanvasGradient | string {
  const { chart } = ctx
  const { ctx: c, chartArea } = chart
  if (!chartArea) return 'transparent'
  const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, hexToRgba(color, alphaTop))
  gradient.addColorStop(1, hexToRgba(color, 0))
  return gradient
}

export function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((ch) => ch + ch)
          .join('')
      : clean
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export const baseOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
}

export default Chart
