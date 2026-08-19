<script setup lang="ts">
import { computed, ref } from 'vue'
import { BaseEmptyState, BaseSkeleton, BaseTable, BaseTabs } from '@/components/base'
import { ChurnMonthlyBarChart } from '@/components/charts'
import { useFormat } from '@/composables/useFormat'
import type { ChurnMonthRow } from '@/types'

const props = withDefaults(
  defineProps<{ rows?: ChurnMonthRow[]; loading?: boolean }>(),
  { rows: () => [], loading: false },
)

const { formatMoney } = useFormat()

const metric = ref<string | number>('count')

const metricTabs = [
  { value: 'count', label: 'Cantidad', icon: 'fa-solid fa-hashtag' },
  { value: 'amount', label: 'Monto perdido', icon: 'fa-solid fa-arrow-trend-down' },
]

const range = ref<string | number>('12')

const rangeTabs = [
  { value: '6', label: '6 meses' },
  { value: '12', label: '12 meses' },
  { value: 'all', label: 'Todo' },
]

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function monthName(month: string): string {
  const [year, mm] = month.split('-')
  const idx = Number(mm) - 1
  return `${MONTH_NAMES[idx] ?? mm} ${year}`
}

function shiftMonth(month: string, delta: number): string {
  const [year = 0, mm = 1] = month.split('-').map(Number)
  const total = year * 12 + (mm - 1) + delta
  const y = Math.floor(total / 12)
  const m = (total % 12) + 1
  return `${y}-${String(m).padStart(2, '0')}`
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Serie continua: los meses sin bajas se rellenan con cero para que el
 * gráfico no "salte" meses y se vea el ritmo real.
 */
const series = computed<ChurnMonthRow[]>(() => {
  const byMonth = new Map(props.rows.map((r) => [r.month, r]))
  const end = currentMonth()
  let start: string

  if (range.value === 'all') {
    const first = props.rows[0]?.month
    if (!first) return []
    start = first < end ? first : end
  } else {
    start = shiftMonth(end, -(Number(range.value) - 1))
  }

  const out: ChurnMonthRow[] = []
  for (let m = start; m <= end; m = shiftMonth(m, 1)) {
    out.push(byMonth.get(m) ?? { month: m, count: 0, lostMonthlyAmount: 0 })
  }
  return out
})

const hasAny = computed(() => props.rows.length > 0)

const totalInRange = computed(() => series.value.reduce((acc, r) => acc + r.count, 0))
const lostInRange = computed(() => series.value.reduce((acc, r) => acc + r.lostMonthlyAmount, 0))

const columns = [
  { key: 'month', label: 'Mes' },
  { key: 'count', label: 'Bajas', align: 'right' },
  { key: 'lostMonthlyAmount', label: 'Monto mensual perdido', align: 'right' },
]

// En la tabla solo los meses con bajas, del más reciente al más viejo.
const tableRows = computed(() =>
  [...series.value].filter((r) => r.count > 0).reverse(),
)
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h2><i class="fa-solid fa-calendar-days" aria-hidden="true" /> Bajas por mes</h2>

      <div class="panel__filters">
        <BaseTabs v-model="range" :tabs="rangeTabs" variant="pills" />
        <BaseTabs v-model="metric" :tabs="metricTabs" variant="pills" />
      </div>
    </header>

    <BaseSkeleton v-if="loading && !hasAny" height="280px" radius="14px" />

    <BaseEmptyState
      v-else-if="!hasAny"
      icon="fa-solid fa-calendar-xmark"
      title="Sin bajas por mes"
      message="Cuando registres bajas, aquí verás cuántos clientes se fueron cada mes."
    />

    <template v-else>
      <p class="panel__resume">
        <strong>{{ totalInRange }}</strong> baja{{ totalInRange === 1 ? '' : 's' }} en el período
        <span class="panel__loss">· {{ formatMoney(lostInRange) }}/mes perdido</span>
      </p>

      <ChurnMonthlyBarChart
        :rows="series"
        :metric="metric === 'amount' ? 'amount' : 'count'"
        :height="280"
      />

      <BaseTable v-if="tableRows.length" :columns="columns" :rows="tableRows" row-key="month">
        <template #cell-month="{ row }">
          <strong>{{ monthName((row as ChurnMonthRow).month) }}</strong>
        </template>

        <template #cell-count="{ row }">
          <strong>{{ (row as ChurnMonthRow).count }}</strong>
        </template>

        <template #cell-lostMonthlyAmount="{ row }">
          <span class="loss">{{ formatMoney((row as ChurnMonthRow).lostMonthlyAmount) }}</span>
        </template>
      </BaseTable>
    </template>
  </section>
</template>

<style scoped lang="scss">
.panel {
  @include card($sp-5);
  @include flex-col($sp-4);
}

.panel__head {
  @include flex-col($sp-3);

  @include md {
    @include flex-between(center, $sp-4);
  }

  h2 {
    @include flex(row, flex-start, center, $sp-2);
    font-size: $fs-md;
    font-weight: 800;
    color: $primary-dark;

    i {
      color: $primary;
    }
  }
}

.panel__filters {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.panel__resume {
  font-size: $fs-sm;
  color: $text-secondary;

  strong {
    color: $primary-dark;
    font-weight: 800;
  }
}

.panel__loss,
.loss {
  color: $alert-error;
  font-weight: 700;
}
</style>
