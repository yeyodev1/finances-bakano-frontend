<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { money, palette, setupCharts, tooltipStyle } from '../chartSetup'
import type { BreakdownItem } from '@/types'

setupCharts()

const props = withDefaults(
  defineProps<{
    items?: BreakdownItem[]
    height?: number
  }>(),
  { items: () => [], height: 240 },
)

const COLORS: Record<string, string> = {
  paid: palette.green,
  partial: palette.blue,
  pending: palette.amber,
  overdue: palette.red,
  waived: palette.muted,
  cancelled: 'rgba(25, 20, 35, 0.35)',
}

const LABELS: Record<string, string> = {
  paid: 'Cobrado',
  partial: 'Parcial',
  pending: 'Pendiente',
  overdue: 'Vencido',
  waived: 'Condonado',
  cancelled: 'Anulado',
}

const rows = computed(() =>
  props.items
    .filter((item) => item.amount > 0 || item.count > 0)
    .map((item) => ({
      key: item.key,
      label: LABELS[item.key] ?? item.label ?? item.key,
      amount: item.amount,
      count: item.count,
      color: COLORS[item.key] ?? palette.secondary,
    })),
)

const total = computed(() => rows.value.reduce((acc, r) => acc + r.amount, 0))
const hasData = computed(() => total.value > 0)

function percent(amount: number): string {
  if (!total.value) return '0%'
  return `${Math.round((amount / total.value) * 100)}%`
}

const chartData = computed<ChartData<'doughnut'>>(() => ({
  labels: rows.value.map((r) => r.label),
  datasets: [
    {
      data: rows.value.map((r) => r.amount),
      backgroundColor: rows.value.map((r) => r.color),
      borderColor: palette.surface,
      borderWidth: 3,
      hoverOffset: 10,
      spacing: 2,
    },
  ],
}))

const options = computed<ChartOptions<'doughnut'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
  plugins: {
    legend: { display: false },
    tooltip: {
      ...tooltipStyle,
      callbacks: {
        label: (ctx) => ` ${ctx.label}: ${money(Number(ctx.parsed), true)} (${percent(Number(ctx.parsed))})`,
      },
    },
  },
}))
</script>

<template>
  <div class="donut">
    <div v-if="hasData" class="donut__canvas" :style="{ height: `${height}px` }">
      <Doughnut :data="chartData" :options="options" />
      <div class="donut__center">
        <span class="donut__center-label">Total</span>
        <strong class="donut__center-value">{{ money(total) }}</strong>
      </div>
    </div>

    <ul v-if="hasData" class="donut__legend">
      <li v-for="row in rows" :key="row.key" class="donut__legend-item">
        <span class="donut__dot" :style="{ background: row.color }" />
        <span class="donut__legend-label">{{ row.label }}</span>
        <span class="donut__legend-amount">{{ money(row.amount) }}</span>
        <span class="donut__legend-pct">{{ percent(row.amount) }}</span>
      </li>
    </ul>

    <div v-if="!hasData" class="donut__empty" :style="{ height: `${height}px` }">
      <i class="fa-solid fa-chart-pie" />
      <p>Aún no hay cobros en este período</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.donut {
  @include flex-col($sp-4);
  width: 100%;
}

.donut__canvas {
  position: relative;
  width: 100%;
}

.donut__center {
  position: absolute;
  inset: 0;
  @include flex(column, center, center, 2px);
  pointer-events: none;
}

.donut__center-label {
  @include label-text;
  font-size: 0.62rem;
}

.donut__center-value {
  font-size: $fs-lg;
  font-weight: 800;
  color: $primary-dark;
}

.donut__legend {
  @include flex-col($sp-2);
  margin: 0;
  padding: 0;
}

.donut__legend-item {
  @include flex(row, flex-start, center, $sp-2);
  padding: $sp-2;
  border-radius: $radius-xs;
  font-size: $fs-sm;
  transition: background $transition-fast;

  &:hover {
    background: $surface-alt;
  }
}

.donut__dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: $radius-full;
}

.donut__legend-label {
  @include truncate;
  flex: 1 1 auto;
  font-weight: 600;
  color: $primary-dark;
}

.donut__legend-amount {
  font-weight: 700;
  color: $primary-dark;
  white-space: nowrap;
}

.donut__legend-pct {
  min-width: 42px;
  text-align: right;
  color: $text-secondary;
  font-size: $fs-xs;
  font-weight: 700;
}

.donut__empty {
  @include flex(column, center, center, $sp-2);
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
