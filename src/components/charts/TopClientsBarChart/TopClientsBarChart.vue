<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions, ScriptableContext } from 'chart.js'
import { compact, hexToRgba, money, palette, setupCharts, tooltipStyle } from '../chartSetup'
import type { BreakdownItem } from '@/types'

setupCharts()

const props = withDefaults(
  defineProps<{
    items?: BreakdownItem[]
    height?: number
  }>(),
  { items: () => [], height: 280 },
)

const rows = computed(() =>
  [...props.items]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10),
)

const hasData = computed(() => rows.value.length > 0)

function shortLabel(label: string): string {
  return label.length > 14 ? `${label.slice(0, 13)}…` : label
}

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: rows.value.map((r) => shortLabel(r.label || r.key)),
  datasets: [
    {
      label: 'Facturado',
      data: rows.value.map((r) => r.amount),
      backgroundColor: (ctx: ScriptableContext<'bar'>) => {
        const { chart } = ctx
        const { ctx: c, chartArea } = chart
        if (!chartArea) return hexToRgba(palette.primary, 0.75)
        const gradient = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
        gradient.addColorStop(0, hexToRgba(palette.secondary, 0.55))
        gradient.addColorStop(1, hexToRgba(palette.primary, 0.95))
        return gradient
      },
      hoverBackgroundColor: palette.primary,
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 40,
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
        title: (ctx) => rows.value[ctx[0]?.dataIndex ?? 0]?.label ?? '',
        label: (ctx) => {
          const row = rows.value[ctx.dataIndex]
          return ` ${money(row?.amount ?? 0, true)} · ${row?.count ?? 0} cobros`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { maxRotation: 45, minRotation: 0, font: { size: 10, weight: 600 } },
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
    <Bar v-if="hasData" :data="chartData" :options="options" />
    <div v-else class="chartbox__empty">
      <i class="fa-solid fa-ranking-star" />
      <p>Sin clientes facturados en el período</p>
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
