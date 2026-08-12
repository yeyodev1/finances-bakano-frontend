<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { compact, hexToRgba, money, palette, setupCharts, tooltipStyle } from '../chartSetup'
import { useFormat } from '@/composables/useFormat'
import type { BankCashflowPoint } from '@/types'

setupCharts()

const props = withDefaults(
  defineProps<{
    points?: BankCashflowPoint[]
    height?: number
    loading?: boolean
  }>(),
  { points: () => [], height: 280, loading: false },
)

const { formatPeriodShort } = useFormat()

const hasData = computed(() => props.points.some((p) => p.inflow > 0 || p.outflow > 0))

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: props.points.map((p) => formatPeriodShort(p.period)),
  datasets: [
    {
      label: 'Entradas',
      data: props.points.map((p) => p.inflow),
      backgroundColor: hexToRgba(palette.green, 0.82),
      hoverBackgroundColor: palette.green,
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 28,
    },
    {
      label: 'Salidas',
      data: props.points.map((p) => p.outflow),
      backgroundColor: hexToRgba(palette.primary, 0.82),
      hoverBackgroundColor: palette.primary,
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 28,
    },
  ],
}))

const options = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 8, font: { size: 11, weight: 600 } },
    },
    tooltip: {
      ...tooltipStyle,
      callbacks: {
        label: (ctx) => ` ${ctx.dataset.label}: ${money(Number(ctx.parsed.y || 0), true)}`,
        footer: (items) => {
          const point = props.points[items[0]?.dataIndex ?? 0]
          if (!point) return ''
          return `Neto: ${money(point.net, true)} · ${point.count} movimientos`
        },
      },
    },
  },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { font: { weight: 600 } } },
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
    <!-- Mientras carga se dibujan barras fantasma: decir "sin movimientos" antes de tener
         los datos hace creer que la cuenta está vacía. -->
    <div v-if="props.loading && !hasData" class="chartbox__loading" aria-hidden="true">
      <span
        v-for="(h, i) in [45, 70, 55, 85, 40, 65]"
        :key="i"
        class="chartbox__bar"
        :style="{ height: `${h}%` }"
      />
    </div>

    <Bar v-else-if="hasData" :data="chartData" :options="options" />

    <div v-else class="chartbox__empty">
      <i class="fa-solid fa-chart-column" />
      <p>Sin movimientos en el período analizado</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.chartbox {
  position: relative;
  width: 100%;
  min-height: 200px;
}

.chartbox__loading {
  @include flex(row, space-around, flex-end, $sp-3);
  height: 100%;
  padding: $sp-4 0;
}

.chartbox__bar {
  flex: 1 1 0;
  max-width: 42px;
  border-radius: $radius-sm $radius-sm 0 0;
  background: linear-gradient(180deg, rgba($primary-dark, 0.1), rgba($primary-dark, 0.04));
  animation: chartbox-pulse 1.4s ease-in-out infinite;

  @for $i from 1 through 6 {
    &:nth-child(#{$i}) {
      animation-delay: #{$i * 0.09}s;
    }
  }
}

@keyframes chartbox-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

@media (prefers-reduced-motion: reduce) {
  .chartbox__bar {
    animation: none;
  }
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
    font-size: $fs-xs;
  }
}
</style>
