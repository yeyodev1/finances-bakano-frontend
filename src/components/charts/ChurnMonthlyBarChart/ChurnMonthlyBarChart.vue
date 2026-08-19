<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { compact, hexToRgba, money, palette, setupCharts, tooltipStyle } from '../chartSetup'
import type { ChurnMonthRow } from '@/types'

setupCharts()

const props = withDefaults(
  defineProps<{
    rows?: ChurnMonthRow[]
    height?: number
    metric?: 'count' | 'amount'
  }>(),
  { rows: () => [], height: 280, metric: 'count' },
)

const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function monthLabel(month: string): string {
  const [year, mm] = month.split('-')
  const idx = Number(mm) - 1
  return `${MONTH_LABELS[idx] ?? mm} ${year}`
}

const hasData = computed(() => props.rows.length > 0)

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.rows.map((r) => monthLabel(r.month)),
  datasets: [
    {
      label: props.metric === 'count' ? 'Bajas' : 'Monto mensual perdido',
      data: props.rows.map((r) => (props.metric === 'count' ? r.count : Number(r.lostMonthlyAmount || 0))),
      backgroundColor: hexToRgba(palette.primary, 0.82),
      hoverBackgroundColor: palette.primary,
      borderRadius: 8,
      borderSkipped: false,
      barThickness: 'flex',
      maxBarThickness: 36,
    },
  ],
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipStyle,
      callbacks: {
        label: (ctx) => {
          const row = props.rows[ctx.dataIndex]
          if (!row) return ''
          return ` ${row.count} baja${row.count === 1 ? '' : 's'} · ${money(Number(row.lostMonthlyAmount || 0), true)}/mes perdido`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { weight: 600 } },
    },
    y: {
      beginAtZero: true,
      grid: { color: palette.grid },
      border: { display: false },
      ticks: {
        precision: 0,
        callback: (value) =>
          props.metric === 'count' ? String(value) : compact(Number(value)),
      },
    },
  },
}))
</script>

<template>
  <div class="chartbox" :style="{ height: `${height}px` }">
    <Bar v-if="hasData" :data="chartData" :options="options" />
    <div v-else class="chartbox__empty">
      <i class="fa-solid fa-calendar-xmark" aria-hidden="true" />
      <p>Sin bajas registradas todavía</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chartbox {
  position: relative;
  width: 100%;
  min-height: 200px;
}

.chartbox__empty {
  @include flex(column, center, center, $sp-2);
  height: 100%;
  color: $text-secondary;
  text-align: center;

  i {
    font-size: 1.8rem;
    opacity: 0.35;
  }

  p {
    font-size: $fs-sm;
    margin: 0;
  }
}
</style>
