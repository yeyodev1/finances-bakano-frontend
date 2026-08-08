<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { compact, hexToRgba, money, palette, setupCharts, tooltipStyle } from '../chartSetup'
import { archiveReasonColor } from '@/config/archiveReasons'
import type { ChurnReasonRow } from '@/types'

setupCharts()

const props = withDefaults(
  defineProps<{
    rows?: ChurnReasonRow[]
    height?: number
    metric?: 'amount' | 'count'
  }>(),
  { rows: () => [], height: 280, metric: 'amount' },
)

const data = computed(() =>
  [...props.rows]
    .filter((row) => row.count > 0)
    .sort((a, b) =>
      props.metric === 'count' ? b.count - a.count : b.lostMonthlyAmount - a.lostMonthlyAmount,
    )
    .map((row) => ({
      label: row.label,
      count: row.count,
      amount: Number(row.lostMonthlyAmount || 0),
      avgDays: Math.round(Number(row.avgLifetimeDays || 0)),
      color: archiveReasonColor(row.reason),
    })),
)

const hasData = computed(() => data.value.length > 0)

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: data.value.map((r) => r.label),
  datasets: [
    {
      label: props.metric === 'count' ? 'Bajas' : 'Monto mensual perdido',
      data: data.value.map((r) => (props.metric === 'count' ? r.count : r.amount)),
      backgroundColor: data.value.map((r) => hexToRgba(r.color, 0.82)),
      hoverBackgroundColor: data.value.map((r) => r.color),
      borderRadius: 8,
      borderSkipped: false,
      barThickness: 'flex',
      maxBarThickness: 28,
    },
  ],
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipStyle,
      callbacks: {
        label: (ctx) => {
          const row = data.value[ctx.dataIndex]
          if (!row) return ''
          return ` ${row.count} bajas · ${money(row.amount, true)}/mes · ${row.avgDays} días de vida`
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: palette.grid },
      border: { display: false },
      ticks: {
        callback: (value) =>
          props.metric === 'count' ? String(value) : compact(Number(value)),
      },
    },
    y: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { weight: 600 } },
    },
  },
}))
</script>

<template>
  <div class="chartbox" :style="{ height: `${height}px` }">
    <Bar v-if="hasData" :data="chartData" :options="options" />
    <div v-else class="chartbox__empty">
      <i class="fa-solid fa-user-slash" aria-hidden="true" />
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
