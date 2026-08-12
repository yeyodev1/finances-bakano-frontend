<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseButton, BaseDrawer } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { describe, kindLabel, statusLabel, statusVariant } from './bankFormat'
import type { BankTransaction } from '@/types'

const props = defineProps<{
  modelValue: boolean
  transaction: BankTransaction | null
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { formatMoney, formatDateTime } = useFormat()

const amount = computed(() => Number(props.transaction?.amount || 0))

const rows = computed(() => {
  const tx = props.transaction
  if (!tx) return []
  return [
    { label: 'Tipo', value: kindLabel(tx.kind) },
    { label: 'Contraparte', value: tx.counterpartyName || '—' },
    { label: 'Creado', value: formatDateTime(tx.createdAt) },
    { label: 'Posteado', value: tx.postedAt ? formatDateTime(tx.postedAt) : 'Sin postear' },
    { label: 'Entrega estimada', value: tx.estimatedDeliveryDate ? formatDateTime(tx.estimatedDeliveryDate) : '—' },
    { label: 'Categoría Mercury', value: tx.mercuryCategory || '—' },
    { label: 'Memo externo', value: tx.externalMemo || '—' },
    { label: 'Nota interna', value: tx.note || '—' },
    { label: 'Descripción del banco', value: tx.bankDescription || '—' },
    { label: 'Tarjeta', value: tx.cardId ? `•••• ${tx.cardId.slice(-4)}` : '—' },
    { label: 'Motivo de falla', value: tx.reasonForFailure || '—' },
    { label: 'ID', value: tx.id },
  ]
})

function openInMercury() {
  const url = props.transaction?.dashboardLink
  if (url) window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <BaseDrawer
    :model-value="props.modelValue"
    title="Detalle del movimiento"
    icon="fa-solid fa-money-bill-transfer"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="props.transaction" class="btxd">
      <header class="btxd__head">
        <p class="btxd__amount" :class="amount >= 0 ? 'btxd__amount--in' : 'btxd__amount--out'">
          {{ amount >= 0 ? '+' : '−' }}{{ formatMoney(Math.abs(amount)) }}
        </p>
        <h3>{{ describe(props.transaction) }}</h3>
        <BaseBadge
          :variant="statusVariant(props.transaction.status)"
          :label="statusLabel(props.transaction.status)"
          size="sm"
        />
      </header>

      <p v-if="props.transaction.subscription" class="btxd__sub">
        <i class="fa-solid fa-arrows-rotate" aria-hidden="true" />
        Este cargo es parte de la suscripción
        <strong>{{ props.transaction.subscription.name }}</strong>
        ({{ props.transaction.subscription.cadenceLabel.toLowerCase() }},
        {{ formatMoney(props.transaction.subscription.monthlyCost) }}/mes).
      </p>

      <dl class="btxd__list">
        <div v-for="row in rows" :key="row.label" class="btxd__row">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>

      <BaseButton
        v-if="props.transaction.dashboardLink"
        variant="outline"
        icon="fa-solid fa-arrow-up-right-from-square"
        block
        @click="openInMercury"
      >
        Ver en Mercury
      </BaseButton>
    </div>
  </BaseDrawer>
</template>

<style scoped lang="scss">
.btxd {
  @include flex-col($sp-5);
}

.btxd__head {
  @include flex-col($sp-2);
  align-items: flex-start;
  padding-bottom: $sp-4;
  border-bottom: 1px solid $border-color;

  h3 {
    font-size: $fs-sm;
    font-weight: 600;
    color: $primary-dark;
  }
}

.btxd__amount {
  font-size: $fs-2xl;
  font-weight: 800;
  font-variant-numeric: tabular-nums;

  &--in {
    color: $alert-success;
  }

  &--out {
    color: $primary-dark;
  }
}

.btxd__sub {
  @include flex(row, flex-start, flex-start, $sp-2);
  padding: $sp-3;
  border-radius: $radius-md;
  background: rgba($secondary, 0.1);
  color: $primary-dark;
  font-size: $fs-xs;
  line-height: 1.5;

  i {
    color: $secondary;
    margin-top: 3px;
  }
}

.btxd__list {
  @include flex-col($sp-3);
}

.btxd__row {
  @include flex(row, space-between, flex-start, $sp-4);

  dt {
    font-size: $fs-xs;
    color: $text-secondary;
    flex-shrink: 0;
  }

  dd {
    font-size: $fs-xs;
    color: $primary-dark;
    font-weight: 600;
    text-align: right;
    word-break: break-word;
  }
}
</style>
