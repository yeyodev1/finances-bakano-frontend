<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseTable } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { cardStatus } from './bankFormat'
import type { TableColumn } from '@/components/base'
import type { BankCard } from '@/types'

const props = withDefaults(
  defineProps<{
    items?: BankCard[]
    loading?: boolean
  }>(),
  { items: () => [], loading: false },
)

const { formatDateShort } = useFormat()

const columns: TableColumn[] = [
  { key: 'nameOnCard', label: 'Titular' },
  { key: 'number', label: 'Número', width: '130px' },
  { key: 'type', label: 'Tipo', hideOnMobile: true },
  { key: 'physical', label: 'Formato', align: 'center', hideOnMobile: true },
  { key: 'status', label: 'Estado', align: 'center', width: '140px' },
  { key: 'createdAt', label: 'Emitida', align: 'right', hideOnMobile: true, width: '110px' },
]

const rows = computed(() =>
  props.items.map((card) => ({
    ...card,
    id: card.cardId,
    number: card.lastFourDigits ? `•••• ${card.lastFourDigits}` : '—',
    physical: card.physicalCardStatus || 'Virtual',
    statusKey: String(card.status || '').toLowerCase(),
  })),
)

/** Conteo por estado, en el orden en que importa: lo vivo primero. */
const summary = computed(() => {
  const order = ['active', 'frozen', 'locked', 'cancelled']
  const counts = new Map<string, number>()

  for (const row of rows.value) {
    const key = row.statusKey === 'canceled' ? 'cancelled' : row.statusKey
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .sort(([a], [b]) => {
      const ia = order.indexOf(a)
      const ib = order.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    .map(([key, count]) => ({ key, count, ...cardStatus(key) }))
})

/** Las canceladas se atenúan para que las vivas salten a la vista. */
function rowClass(row: { statusKey: string }): string {
  return row.statusKey === 'cancelled' || row.statusKey === 'canceled' ? 'bcard-row--dead' : ''
}
</script>

<template>
  <div class="bcards">
    <div v-if="summary.length" class="bcards__summary">
      <span v-for="entry in summary" :key="entry.key" :class="`chip chip--${entry.variant}`">
        <i :class="entry.icon" aria-hidden="true" />
        <strong>{{ entry.count }}</strong>
        {{ entry.count === 1 ? entry.label : `${entry.label}s` }}
      </span>
    </div>

    <BaseTable
      :columns="columns"
      :rows="rows"
      :loading="props.loading"
      row-key="id"
      :row-class="rowClass"
      empty-icon="fa-solid fa-credit-card"
      empty-text="Esta cuenta no tiene tarjetas emitidas"
    >
      <template #cell-nameOnCard="{ row }">
        <div class="bcards__holder">
          <span :class="`bcards__chipicon bcards__chipicon--${cardStatus(row.status).variant}`">
            <i class="fa-solid fa-credit-card" aria-hidden="true" />
          </span>
          <strong>{{ row.nameOnCard || 'Sin titular' }}</strong>
        </div>
      </template>

      <template #cell-number="{ row }">
        <span class="bcards__mono">{{ row.number }}</span>
      </template>

      <template #cell-type="{ row }">
        <span class="bcards__muted">{{ row.type || row.network || '—' }}</span>
      </template>

      <template #cell-physical="{ row }">
        <span class="bcards__muted">{{ row.physical }}</span>
      </template>

      <template #cell-status="{ row }">
        <BaseBadge
          :variant="cardStatus(row.status).variant"
          :label="cardStatus(row.status).label"
          :icon="cardStatus(row.status).icon"
          size="sm"
        />
      </template>

      <template #cell-createdAt="{ row }">
        <span class="bcards__muted">{{ formatDateShort(row.createdAt) }}</span>
      </template>
    </BaseTable>
  </div>
</template>

<style scoped lang="scss">
.bcards {
  @include flex-col($sp-4);
}

.bcards__summary {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.chip {
  @include flex(row, flex-start, center, $sp-2);
  padding: 5px $sp-3;
  border-radius: $radius-full;
  border: 1px solid transparent;
  font-size: $fs-xs;
  color: $text-secondary;

  strong {
    font-weight: 800;
  }

  i {
    font-size: 0.85em;
  }

  &--active {
    background: rgba($alert-success, 0.12);
    border-color: rgba($alert-success, 0.3);
    color: darken($alert-success, 12);
  }

  &--info {
    background: rgba($alert-info, 0.12);
    border-color: rgba($alert-info, 0.3);
    color: darken($alert-info, 12);
  }

  &--danger {
    background: rgba($alert-error, 0.12);
    border-color: rgba($alert-error, 0.3);
    color: darken($alert-error, 12);
  }

  &--cancelled,
  &--neutral {
    background: rgba($primary-dark, 0.05);
    border-color: $border-color;
  }
}

.bcards__holder {
  @include flex(row, flex-start, center, $sp-3);
  min-width: 0;

  strong {
    font-size: $fs-sm;
    font-weight: 600;
    color: $primary-dark;
    @include truncate;
  }
}

.bcards__chipicon {
  @include flex-center;
  width: 30px;
  height: 30px;
  flex: none;
  border-radius: $radius-sm;
  font-size: 0.75rem;
  background: rgba($primary-dark, 0.06);
  color: $text-secondary;

  &--active {
    background: rgba($alert-success, 0.14);
    color: darken($alert-success, 8);
  }

  &--info {
    background: rgba($alert-info, 0.14);
    color: darken($alert-info, 8);
  }

  &--danger {
    background: rgba($alert-error, 0.14);
    color: darken($alert-error, 8);
  }
}

.bcards__mono {
  font-variant-numeric: tabular-nums;
  font-size: $fs-xs;
  color: $primary-dark;
}

.bcards__muted {
  font-size: $fs-xs;
  color: $text-secondary;
}

// Las canceladas siguen consultables, pero no compiten con las vivas.
:deep(.bcard-row--dead) {
  opacity: 0.55;
}
</style>
