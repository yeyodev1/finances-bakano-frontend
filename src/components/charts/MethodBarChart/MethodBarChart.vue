<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { compact, hexToRgba, money, palette, setupCharts, tooltipStyle } from '../chartSetup'
import type { BreakdownItem } from '@/types'

setupCharts()

const props = withDefaults(
  defineProps<{
    items?: BreakdownItem[]
    height?: number
  }>(),
  { items: () => [], height: 260 },
)

const LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  stripe: 'Stripe',
  cheque: 'Cheque',
  transferencia_o_cheque: 'Transf. o cheque',
  efectivo: 'Efectivo',
  no_paga: 'No paga',
  otro: 'Otro',
}

const SERIES = [palette.primary, palette.secondary, palette.green, palette.blue, palette.amber, palette.red]

const rows = computed(() =>
  [...props.items]
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      label: LABELS[item.key] ?? item.label ?? item.key,
      amount: item.amount,
      count: item.count,
      color: SERIES[index % SERIES.length] ?? palette.primary,
    })),
)

const hasData = computed(() => rows.value.length > 0)

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: rows.value.map((r) => r.label),
  datasets: [
    {
      label: 'Monto',
      data: rows.value.map((r) => r.amount),
      backgroundColor: rows.value.map((r) => hexToRgba(r.color, 0.82)),
      hoverBackgroundColor: rows.value.map((r) => r.color),
      borderRadius: 8,
      borderSkipped: false,
      barThickness: 'flex',
      maxBarThickness: 26,
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
          const row = rows.value[ctx.dataIndex]
          return ` ${money(row?.amount ?? 0, true)} · ${row?.count ?? 0} pagos`
        },
      },
    },
  },
  scales: {
    x: {
      beginAtZero: true,
      grid: { color: palette.grid },
      border: { display: false },
      ticks: { callback: (value) => compact(Number(value)) },
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
      <i class="fa-solid fa-credit-card" />
      <p>Sin pagos registrados en el período</p>
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
