<script setup lang="ts">
import { computed, ref } from 'vue'
import { BaseBadge, BaseEmptyState, BaseSkeleton, BaseTable, BaseTabs } from '@/components/base'
import { ChurnReasonBarChart } from '@/components/charts'
import { useFormat } from '@/composables/useFormat'
import { archiveReasonIcon, archiveReasonTone, lifetimeLabel } from '@/config/archiveReasons'
import type { BadgeVariant } from '@/components/base'
import type { ChurnReasonRow } from '@/types'

const props = withDefaults(
  defineProps<{ rows?: ChurnReasonRow[]; loading?: boolean }>(),
  { rows: () => [], loading: false },
)

const { formatMoney } = useFormat()

const metric = ref<string | number>('amount')

const metricTabs = [
  { value: 'amount', label: 'Monto perdido', icon: 'fa-solid fa-arrow-trend-down' },
  { value: 'count', label: 'Cantidad', icon: 'fa-solid fa-hashtag' },
]

const columns = [
  { key: 'label', label: 'Motivo' },
  { key: 'count', label: 'Bajas', align: 'right' },
  { key: 'lostMonthlyAmount', label: 'Monto mensual perdido', align: 'right' },
  { key: 'avgLifetimeDays', label: 'Duración promedio' },
  { key: 'totalLifetimeRevenue', label: 'Ingresos históricos', align: 'right' },
]

const sorted = computed(() =>
  [...props.rows].sort((a, b) => b.lostMonthlyAmount - a.lostMonthlyAmount),
)

const totalCount = computed(() => sorted.value.reduce((acc, r) => acc + r.count, 0))

function share(row: ChurnReasonRow): number {
  if (!totalCount.value) return 0
  return Math.round((row.count / totalCount.value) * 100)
}

function toneOf(row: ChurnReasonRow): BadgeVariant {
  return archiveReasonTone(row.reason) as BadgeVariant
}
</script>

<template>
  <section class="panel">
    <header class="panel__head">
      <h2><i class="fa-solid fa-chart-column" aria-hidden="true" /> Motivos de baja</h2>
      <BaseTabs v-model="metric" :tabs="metricTabs" variant="pills" />
    </header>

    <BaseSkeleton v-if="loading && !rows.length" height="280px" radius="14px" />

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-chart-simple"
      title="Sin motivos registrados"
      message="Cuando des de baja a un cliente con su motivo, aquí verás el desglose."
    />

    <template v-else>
      <ChurnReasonBarChart :rows="rows" :metric="metric === 'count' ? 'count' : 'amount'" :height="300" />

      <BaseTable :columns="columns" :rows="sorted" row-key="reason">
        <template #cell-label="{ row }">
          <BaseBadge :variant="toneOf(row as ChurnReasonRow)" :icon="archiveReasonIcon((row as ChurnReasonRow).reason)">
            {{ (row as ChurnReasonRow).label }}
          </BaseBadge>
        </template>

        <template #cell-count="{ row }">
          <strong>{{ (row as ChurnReasonRow).count }}</strong>
          <span class="share">{{ share(row as ChurnReasonRow) }}% del total</span>
        </template>

        <template #cell-lostMonthlyAmount="{ row }">
          <strong class="loss">{{ formatMoney((row as ChurnReasonRow).lostMonthlyAmount) }}</strong>
        </template>

        <template #cell-avgLifetimeDays="{ row }">
          {{ lifetimeLabel((row as ChurnReasonRow).avgLifetimeDays) }}
        </template>

        <template #cell-totalLifetimeRevenue="{ row }">
          <span class="revenue">{{ formatMoney((row as ChurnReasonRow).totalLifetimeRevenue) }}</span>
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

.share {
  display: block;
  font-size: $fs-xs;
  color: $text-secondary;
}

.loss {
  color: $alert-error;
  font-weight: 800;
}

.revenue {
  color: $alert-success;
  font-weight: 700;
}
</style>
