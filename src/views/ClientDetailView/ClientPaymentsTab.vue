<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { BaseBadge, BaseEmptyState, BaseSkeleton } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage, PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS } from '@/stores/clients'
import { usePaymentsStore } from '@/stores/payments'

const props = defineProps<{ clientId: string }>()

const store = usePaymentsStore()
const toast = useToast()
const { formatMoney, formatDateShort, formatPeriod } = useFormat()

const total = computed(() => store.filteredAmount)

onMounted(async () => {
  try {
    await store.fetchByClient(props.clientId)
  } catch (error) {
    toast.error('No se pudieron cargar los pagos', apiErrorMessage(error))
  }
})
</script>

<template>
  <div class="tab">
    <div v-if="store.loading" class="tab__skeleton">
      <BaseSkeleton v-for="n in 4" :key="n" height="68px" />
    </div>

    <BaseEmptyState
      v-else-if="!store.items.length"
      icon="fa-solid fa-receipt"
      title="Sin pagos"
      message="Todavía no se ha registrado ningún pago para este cliente."
    />

    <template v-else>
      <p class="total">
        <i class="fa-solid fa-coins" aria-hidden="true" />
        Total pagado: <strong>{{ formatMoney(total) }}</strong> en {{ store.items.length }} pagos
      </p>

      <TransitionGroup name="list" tag="div" class="rows">
        <article v-for="payment in store.items" :key="payment._id" class="row">
          <div class="row__main">
            <p class="row__amount">{{ formatMoney(payment.amount) }}</p>
            <p class="row__meta">
              <i class="fa-solid fa-calendar-day" aria-hidden="true" />
              {{ formatDateShort(payment.paidAt) }} · {{ formatPeriod(payment.period) }}
            </p>
          </div>

          <BaseBadge variant="info" :icon="PAYMENT_METHOD_ICONS[payment.method]">
            {{ PAYMENT_METHOD_LABELS[payment.method] }}
          </BaseBadge>

          <div class="row__extra">
            <span v-if="payment.reference" class="row__ref">
              <i class="fa-solid fa-hashtag" aria-hidden="true" />{{ payment.reference }}
            </span>
            <a v-if="payment.receiptUrl" :href="payment.receiptUrl" target="_blank" rel="noopener" class="row__link">
              <i class="fa-solid fa-paperclip" aria-hidden="true" /> Comprobante
            </a>
            <span v-if="payment.registeredByName" class="row__by">
              <i class="fa-solid fa-user-pen" aria-hidden="true" />{{ payment.registeredByName }}
            </span>
          </div>
        </article>
      </TransitionGroup>
    </template>
  </div>
</template>

<style scoped lang="scss">
.tab,
.tab__skeleton,
.rows {
  @include flex-col($sp-3);
}

.total {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-sm;
  color: $text-secondary;

  i {
    color: $alert-warning;
  }

  strong {
    color: $primary-dark;
  }
}

.row {
  @include card($sp-4);
  @include flex-col($sp-3);

  @include lg {
    display: grid;
    grid-template-columns: 1fr auto 1.2fr;
    align-items: center;
    gap: $sp-4;
  }
}

.row__amount {
  font-size: $fs-md;
  font-weight: 800;
  color: $alert-success;
}

.row__meta {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: $sp-1;
}

.row__extra {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;

  @include lg {
    justify-content: flex-end;
  }

  i {
    margin-right: $sp-1;
  }
}

.row__link {
  color: $primary;
  font-weight: 600;
  text-decoration: none;
  transition: opacity $transition-base;

  &:hover {
    opacity: 0.75;
  }
}
</style>
