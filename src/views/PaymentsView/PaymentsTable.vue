<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseEmptyState, BaseSkeleton, BaseTable } from '@/components/base'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useFormat } from '@/composables/useFormat'
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS } from '@/stores/clients'
import type { Payment } from '@/types'

const props = defineProps<{ items: Payment[]; loading: boolean }>()
const emit = defineEmits<{ remove: [payment: Payment] }>()

const { isMobile } = useBreakpoint()
const { formatMoney, formatDateShort, formatPeriod } = useFormat()

const columns = [
  { key: 'clientName', label: 'Cliente' },
  { key: 'amount', label: 'Monto', align: 'right' },
  { key: 'paidAt', label: 'Fecha' },
  { key: 'period', label: 'Período' },
  { key: 'method', label: 'Método' },
  { key: 'receipt', label: 'Comprobante' },
  { key: 'actions', label: '', align: 'right' },
]

const rows = computed(() => props.items)
</script>

<template>
  <div class="payments-table">
    <div v-if="loading" class="payments-table__skeleton">
      <BaseSkeleton v-for="n in 6" :key="n" height="60px" />
    </div>

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-receipt"
      title="Sin pagos"
      message="No hay pagos que coincidan con los filtros seleccionados."
    />

    <TransitionGroup v-else-if="isMobile" name="list" tag="div" class="cards">
      <article v-for="payment in rows" :key="payment._id" class="card">
        <header class="card__head">
          <h3>{{ payment.clientName }}</h3>
          <span class="card__amount">{{ formatMoney(payment.amount) }}</span>
        </header>

        <ul class="card__meta">
          <li><i class="fa-solid fa-calendar-day" aria-hidden="true" /> {{ formatDateShort(payment.paidAt) }}</li>
          <li><i class="fa-solid fa-calendar-days" aria-hidden="true" /> {{ formatPeriod(payment.period) }}</li>
          <li>
            <i :class="PAYMENT_METHOD_ICONS[payment.method]" aria-hidden="true" />
            {{ PAYMENT_METHOD_LABELS[payment.method] }}
          </li>
          <li v-if="payment.reference"><i class="fa-solid fa-hashtag" aria-hidden="true" /> {{ payment.reference }}</li>
        </ul>

        <footer class="card__foot">
          <a v-if="payment.receiptUrl" :href="payment.receiptUrl" target="_blank" rel="noopener" class="link">
            <i class="fa-solid fa-paperclip" aria-hidden="true" /> Ver comprobante
          </a>
          <span v-else class="muted">Sin comprobante</span>
          <button type="button" class="danger" @click="emit('remove', payment)">
            <i class="fa-solid fa-trash" aria-hidden="true" /> Eliminar
          </button>
        </footer>
      </article>
    </TransitionGroup>

    <BaseTable v-else :columns="columns" :rows="rows" row-key="_id">
      <template #cell-clientName="{ row }">
        <span class="strong">{{ (row as Payment).clientName }}</span>
        <span v-if="(row as Payment).registeredByName" class="sub">
          Registró {{ (row as Payment).registeredByName }}
        </span>
      </template>

      <template #cell-amount="{ row }">
        <strong class="money">{{ formatMoney((row as Payment).amount) }}</strong>
      </template>

      <template #cell-paidAt="{ row }">{{ formatDateShort((row as Payment).paidAt) }}</template>

      <template #cell-period="{ row }">{{ formatPeriod((row as Payment).period) }}</template>

      <template #cell-method="{ row }">
        <BaseBadge variant="info" :icon="PAYMENT_METHOD_ICONS[(row as Payment).method]">
          {{ PAYMENT_METHOD_LABELS[(row as Payment).method] }}
        </BaseBadge>
      </template>

      <template #cell-receipt="{ row }">
        <a
          v-if="(row as Payment).receiptUrl"
          :href="(row as Payment).receiptUrl"
          target="_blank"
          rel="noopener"
          class="link"
        >
          <i class="fa-solid fa-paperclip" aria-hidden="true" /> Abrir
        </a>
        <span v-else class="muted">—</span>
      </template>

      <template #cell-actions="{ row }">
        <button type="button" class="icon-danger" title="Eliminar pago" @click="emit('remove', row as Payment)">
          <i class="fa-solid fa-trash" aria-hidden="true" />
        </button>
      </template>
    </BaseTable>
  </div>
</template>

<style scoped lang="scss">
.payments-table__skeleton,
.cards {
  @include flex-col($sp-2);
}

.card {
  @include card($sp-4);
  @include card-hover;
  @include flex-col($sp-3);
}

.card__head {
  @include flex-between(center, $sp-3);

  h3 {
    font-weight: 700;
    color: $primary-dark;
  }
}

.card__amount {
  font-size: $fs-lg;
  font-weight: 800;
  color: $alert-success;
}

.card__meta {
  @include flex-col($sp-2);
  list-style: none;
  font-size: $fs-xs;
  color: $text-secondary;

  i {
    width: 16px;
    color: $secondary;
  }
}

.card__foot {
  @include flex-between(center, $sp-3);
  border-top: 1px solid $border-color;
  padding-top: $sp-3;
  font-size: $fs-xs;
}

.strong {
  display: block;
  font-weight: 700;
  color: $primary-dark;
}

.sub {
  font-size: $fs-xs;
  color: $text-secondary;
}

.money {
  color: $alert-success;
  font-weight: 800;
}

.link {
  @include flex(row, flex-start, center, $sp-2);
  color: $primary;
  font-weight: 600;
  text-decoration: none;
  transition: opacity $transition-base;

  &:hover {
    opacity: 0.7;
  }
}

.muted {
  color: $text-secondary;
}

.danger,
.icon-danger {
  @include flex-center($sp-2);
  @include pressable;
  border: none;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  border-radius: $radius-xs;
  padding: $sp-1 $sp-2;
  transition: background $transition-base, color $transition-base;

  &:hover {
    background: $alert-error-bg;
    color: $alert-error;
  }
}

.icon-danger {
  width: 32px;
  height: 32px;
  margin-left: auto;
}
</style>
