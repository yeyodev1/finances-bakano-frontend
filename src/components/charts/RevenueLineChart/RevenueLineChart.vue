<script setup lang="ts">
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js'
import {
  compact,
  moneyTooltipLabel,
  palette,
  setupCharts,
  tooltipStyle,
  verticalGradient,
} from '../chartSetup'
import type { RevenuePoint } from '@/types'

setupCharts()

const props = withDefaults(
  defineProps<{
    points?: RevenuePoint[]
    height?: number
  }>(),
  { points: () => [], height: 280 },
)

const hasData = computed(() => props.points.some((p) => p.expected > 0 || p.collected > 0))

const chartData = computed<ChartData<'line'>>(() => ({
  labels: props.points.map((p) => p.label || p.period),
  datasets: [
    {
      label: 'Facturado',
      data: props.points.map((p) => p.expected),
      borderColor: palette.primary,
      backgroundColor: (ctx: ScriptableContext<'line'>) => verticalGradient(ctx, palette.primary),
      pointBackgroundColor: palette.primary,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.38,
      fill: true,
    },
    {
      label: 'Cobrado',
      data: props.points.map((p) => p.collected),
      borderColor: palette.green,
      backgroundColor: (ctx: ScriptableContext<'line'>) => verticalGradient(ctx, palette.green),
      pointBackgroundColor: palette.green,
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.38,
      fill: true,
    },
  ],
}))

const options = computed<ChartOptions<'line'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        boxWidth: 8,
        padding: 16,
        font: { size: 11, weight: 600 },
      },
    },
    tooltip: { ...tooltipStyle, callbacks: { label: moneyTooltipLabel } },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { maxRotation: 0, autoSkipPadding: 12 },
    },
    y: {
      beginAtZero: true,
      grid: { color: palette.grid },
      border: { display: false },
      ticks: { callback: (value) => compact(Number(value)) },
    },
  },
}))
</script>

<template>
  <div class="chartbox" :style="{ height: `${height}px` }">
    <Line v-if="hasData" :data="chartData" :options="options" />
    <div v-else class="chartbox__empty">
      <i class="fa-solid fa-chart-line" />
      <p>Sin historial de facturación todavía</p>
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
