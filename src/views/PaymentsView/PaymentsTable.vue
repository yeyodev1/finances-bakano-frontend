<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseEmptyState, BaseSkeleton, BaseTable } from '@/components/base'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useFormat } from '@/composables/useFormat'
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS } from '@/stores/clients'
import type { Payment } from '@/types'

const props = defineProps<{ items: Payment[]; loading: boolean }>()
const emit = defineEmits<{ remove: [payment: Payment]; preview: [payment: Payment] }>()

/** En el listado `clientId` llega crudo; poblado solo en el detalle. */
function clientRoute(payment: Payment): string {
  const raw = payment.clientId
  const id = typeof raw === 'string' ? raw : raw?._id
  return id ? `/clientes/${id}` : ''
}

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
          <RouterLink v-if="clientRoute(payment)" :to="clientRoute(payment)" class="client-link">
            {{ payment.clientName }}
            <i class="fa-solid fa-arrow-right" aria-hidden="true" />
          </RouterLink>
          <h3 v-else>{{ payment.clientName }}</h3>
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
          <button v-if="payment.receiptUrl" type="button" class="receipt" @click="emit('preview', payment)">
            <i class="fa-solid fa-eye" aria-hidden="true" /> Ver comprobante
          </button>
          <span v-else class="muted">Sin comprobante</span>
          <button type="button" class="danger" @click="emit('remove', payment)">
            <i class="fa-solid fa-trash" aria-hidden="true" /> Eliminar
          </button>
        </footer>
      </article>
    </TransitionGroup>

    <BaseTable v-else :columns="columns" :rows="rows" row-key="_id">
      <template #cell-clientName="{ row }">
        <RouterLink v-if="clientRoute(row as Payment)" :to="clientRoute(row as Payment)" class="client-link">
          {{ (row as Payment).clientName }}
          <i class="fa-solid fa-arrow-right" aria-hidden="true" />
        </RouterLink>
        <span v-else class="strong">{{ (row as Payment).clientName }}</span>
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
        <!-- Previsualizar en sitio: abrir pestaña por cada pago hacía perder
             el filtro y el scroll del listado. -->
        <button
          v-if="(row as Payment).receiptUrl"
          type="button"
          class="receipt"
          title="Previsualizar comprobante"
          @click="emit('preview', row as Payment)"
        >
          <i class="fa-solid fa-eye" aria-hidden="true" /> Ver
        </button>
        <span v-else class="muted" title="Este pago se registró sin respaldo">
          <i class="fa-solid fa-circle-minus" aria-hidden="true" /> Sin comprobante
        </span>
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

.client-link {
  @include flex(row, flex-start, center, $sp-2);
  font-weight: 700;
  color: $primary-dark;
  text-decoration: none;

  i {
    font-size: $fs-xs;
    color: $primary;
    opacity: 0;
    transform: translateX(-4px);
    transition: opacity $transition-base, transform $transition-base;
  }

  &:hover {
    color: $primary;

    i { opacity: 1; transform: translateX(0); }
  }

  &:focus-visible {
    @include focus-ring;

    i { opacity: 1; transform: translateX(0); }
  }
}

.receipt {
  @include flex(row, flex-start, center, $sp-2);
  @include pressable;
  padding: $sp-1 $sp-2;
  border: none;
  border-radius: $radius-xs;
  background: transparent;
  color: $primary;
  font-family: inherit;
  font-size: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: background $transition-base;

  &:hover { background: rgba($primary, 0.08); }
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
