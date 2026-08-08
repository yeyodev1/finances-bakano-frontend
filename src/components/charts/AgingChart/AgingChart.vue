<script setup lang="ts">
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import type { ChartData, ChartOptions } from 'chart.js'
import { agingScale, compact, hexToRgba, money, palette, setupCharts, tooltipStyle } from '../chartSetup'
import type { AgingBucket } from '@/types'

setupCharts()

const props = withDefaults(
  defineProps<{
    buckets?: AgingBucket[]
    height?: number
  }>(),
  { buckets: () => [], height: 240 },
)

const ORDER = ['0-7', '8-15', '16-30', '30+']

const LABELS: Record<string, string> = {
  '0-7': '0 a 7 días',
  '8-15': '8 a 15 días',
  '16-30': '16 a 30 días',
  '30+': 'Más de 30',
}

const rows = computed(() => {
  const map = new Map(props.buckets.map((b) => [b.bucket, b]))
  const keys = ORDER.filter((k) => map.has(k))
  const extras = props.buckets.map((b) => b.bucket).filter((k) => !ORDER.includes(k))
  return [...keys, ...extras].map((key, index) => {
    const bucket = map.get(key)
    return {
      key,
      label: LABELS[key] ?? key,
      amount: bucket?.amount ?? 0,
      count: bucket?.count ?? 0,
      color: agingScale[Math.min(index, agingScale.length - 1)] ?? palette.amber,
    }
  })
})

const hasData = computed(() => rows.value.some((r) => r.amount > 0 || r.count > 0))

const chartData = computed<ChartData<'bar'>>(() => ({
  labels: rows.value.map((r) => r.label),
  datasets: [
    {
      label: 'Monto en mora',
      data: rows.value.map((r) => r.amount),
      backgroundColor: rows.value.map((r) => hexToRgba(r.color, 0.85)),
      hoverBackgroundColor: rows.value.map((r) => r.color),
      borderRadius: 8,
      borderSkipped: false,
      maxBarThickness: 46,
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
          const row = rows.value[ctx.dataIndex]
          return ` ${money(row?.amount ?? 0, true)} · ${row?.count ?? 0} facturas`
        },
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      border: { display: false },
      ticks: { font: { size: 11, weight: 600 } },
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
  <div class="aging">
    <div class="chartbox" :style="{ height: `${height}px` }">
      <Bar v-if="hasData" :data="chartData" :options="options" />
      <div v-else class="chartbox__empty">
        <i class="fa-solid fa-circle-check" />
        <p>No hay facturas en mora</p>
      </div>
    </div>

    <ul v-if="hasData" class="aging__legend">
      <li v-for="row in rows" :key="row.key">
        <span class="aging__dot" :style="{ background: row.color }" />
        <span class="aging__label">{{ row.label }}</span>
        <strong>{{ row.count }}</strong>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.aging {
  @include flex-col($sp-3);
  width: 100%;
}

.chartbox {
  position: relative;
  width: 100%;
  min-height: 180px;
}

.chartbox__empty {
  @include flex(column, center, center, $sp-2);
  height: 100%;
  color: $text-secondary;
  text-align: center;

  i {
    font-size: 1.8rem;
    color: rgba($alert-success, 0.5);
  }

  p {
    font-size: $fs-sm;
    margin: 0;
  }
}

.aging__legend {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  margin: 0;
  padding: 0;

  li {
    @include flex(row, flex-start, center, $sp-2);
    font-size: $fs-xs;
    color: $text-secondary;
  }

  strong {
    color: $primary-dark;
  }
}

.aging__dot {
  width: 8px;
  height: 8px;
  border-radius: $radius-full;
}

.aging__label {
  font-weight: 600;
}
</style>
