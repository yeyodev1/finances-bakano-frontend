<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseTable } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { describe, kindLabel, statusLabel, statusVariant } from './bankFormat'
import type { TableColumn } from '@/components/base'
import type { BankTransaction } from '@/types'

const props = withDefaults(
  defineProps<{
    items?: BankTransaction[]
    loading?: boolean
  }>(),
  { items: () => [], loading: false },
)

defineEmits<{ open: [tx: BankTransaction] }>()

const { formatMoney, formatDateShort } = useFormat()

const columns: TableColumn[] = [
  { key: 'date', label: 'Fecha', width: '110px' },
  { key: 'description', label: 'Detalle' },
  { key: 'kind', label: 'Tipo', hideOnMobile: true },
  { key: 'status', label: 'Estado', align: 'center', width: '120px' },
  { key: 'amount', label: 'Monto', align: 'right', width: '140px' },
]

const rows = computed(() =>
  props.items.map((tx) => ({
    ...tx,
    date: tx.postedAt || tx.createdAt,
    description: describe(tx),
    amountValue: Number(tx.amount || 0),
  })),
)
</script>

<template>
  <BaseTable
    :columns="columns"
    :rows="rows"
    :loading="props.loading"
    row-key="id"
    empty-icon="fa-solid fa-money-bill-transfer"
    empty-text="No hay movimientos con estos filtros"
    @row-click="$emit('open', $event)"
  >
    <template #cell-date="{ row }">
      <span class="btx__date">{{ formatDateShort(row.date) }}</span>
    </template>

    <template #cell-description="{ row }">
      <div class="btx__desc">
        <div class="btx__title">
          <strong>{{ row.description }}</strong>
          <!-- Marca los cargos que forman parte de una suscripción detectada. -->
          <span
            v-if="row.subscription"
            class="btx__sub"
            :class="{ 'btx__sub--failing': row.subscription.status === 'failing' }"
            :title="`Suscripción ${row.subscription.cadenceLabel.toLowerCase()} · ${formatMoney(row.subscription.monthlyCost)}/mes`"
          >
            <i class="fa-solid fa-arrows-rotate" aria-hidden="true" />
            Suscripción
          </span>
        </div>
        <small v-if="row.note || row.externalMemo">{{ row.note || row.externalMemo }}</small>
      </div>
    </template>

    <template #cell-kind="{ row }">
      <span class="btx__kind">{{ kindLabel(row.kind) }}</span>
    </template>

    <template #cell-status="{ row }">
      <BaseBadge :variant="statusVariant(row.status)" :label="statusLabel(row.status)" size="sm" />
    </template>

    <template #cell-amount="{ row }">
      <span class="btx__amount" :class="row.amountValue >= 0 ? 'btx__amount--in' : 'btx__amount--out'">
        {{ row.amountValue >= 0 ? '+' : '−' }}{{ formatMoney(Math.abs(row.amountValue)) }}
      </span>
    </template>
  </BaseTable>
</template>

<style scoped lang="scss">
.btx__date {
  font-size: $fs-xs;
  color: $text-secondary;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.btx__desc {
  @include flex-col($sp-0);
  min-width: 0;

  strong {
    font-size: $fs-sm;
    font-weight: 600;
    color: $primary-dark;
    @include truncate;
  }

  .btx__title {
    @include flex(row, flex-start, center, $sp-2);
    min-width: 0;
  }

  .btx__sub {
    @include flex(row, flex-start, center, 4px);
    flex-shrink: 0;
    padding: 2px $sp-2;
    border-radius: $radius-full;
    background: rgba($secondary, 0.12);
    color: $secondary;
    font-size: 0.62rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;

    &--failing {
      background: rgba($alert-error, 0.12);
      color: $alert-error;
    }
  }

  small {
    font-size: $fs-xs;
    color: $text-secondary;
    @include truncate;
  }
}

.btx__kind {
  font-size: $fs-xs;
  color: $text-secondary;
}

.btx__amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;

  &--in {
    color: $alert-success;
  }

  &--out {
    color: $primary-dark;
  }
}
</style>
