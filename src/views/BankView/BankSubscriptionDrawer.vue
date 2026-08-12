<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseDrawer } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { subscriptionStatus } from './bankFormat'
import type { BankSubscription } from '@/types'

const props = defineProps<{
  modelValue: boolean
  subscription: BankSubscription | null
}>()

defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { formatMoney, formatDateShort } = useFormat()

const rows = computed(() => {
  const s = props.subscription
  if (!s) return []
  return [
    { label: 'Monto por cobro', value: formatMoney(s.amount) },
    { label: 'Frecuencia', value: s.cadenceLabel + (s.intervalDays ? ` (cada ${s.intervalDays} días)` : '') },
    { label: 'Costo mensual', value: `${formatMoney(s.monthlyCost)}${s.estimated ? ' (estimado)' : ''}` },
    { label: 'Costo anual', value: formatMoney(s.yearlyCost) },
    { label: 'Cobros exitosos', value: String(s.charges) },
    { label: 'Cobros rechazados', value: `${s.failedCharges} (${s.failedAttempts} intentos)` },
    { label: 'Total pagado', value: formatMoney(s.totalPaid) },
    { label: 'Primer cobro', value: s.firstChargeAt ? formatDateShort(s.firstChargeAt) : '—' },
    { label: 'Último cobro', value: s.lastChargeAt ? formatDateShort(s.lastChargeAt) : 'Nunca salió' },
    { label: 'Próximo estimado', value: s.nextChargeAt ? formatDateShort(s.nextChargeAt) : '—' },
    { label: 'Tarjetas usadas', value: s.cardIds.length ? s.cardIds.map((id) => `••${id.slice(-4)}`).join(', ') : 'Sin tarjeta' },
  ]
})
</script>

<template>
  <BaseDrawer
    :model-value="props.modelValue"
    title="Detalle de la suscripción"
    icon="fa-solid fa-arrows-rotate"
    width="480px"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="props.subscription" class="bsd">
      <header class="bsd__head">
        <h3>{{ props.subscription.name }}</h3>
        <p class="bsd__cost">
          {{ formatMoney(props.subscription.monthlyCost) }}<span>/mes</span>
        </p>
        <BaseBadge
          :variant="subscriptionStatus(props.subscription.status).variant"
          :label="subscriptionStatus(props.subscription.status).label"
          size="sm"
        />
      </header>

      <p v-if="props.subscription.status === 'failing'" class="bsd__warn">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        El banco rechazó el último cobro. El comercio va a seguir reintentando y, si no pasa,
        corta el servicio.
      </p>

      <dl class="bsd__list">
        <div v-for="row in rows" :key="row.label" class="bsd__row">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>

      <section class="bsd__history">
        <h4>Últimos cobros</h4>
        <ul>
          <li
            v-for="charge in props.subscription.recentCharges"
            :key="charge.id"
            :class="{ 'bsd__charge--failed': charge.failed }"
          >
            <span class="bsd__charge-date">{{ formatDateShort(charge.date) }}</span>
            <span class="bsd__charge-amount">{{ formatMoney(charge.amount) }}</span>
            <span class="bsd__charge-tag">
              <template v-if="charge.failed">
                Rechazado<template v-if="charge.attempts > 1"> · {{ charge.attempts }} intentos</template>
              </template>
              <template v-else>Cobrado</template>
            </span>
          </li>
        </ul>
      </section>
    </div>
  </BaseDrawer>
</template>

<style scoped lang="scss">
.bsd {
  @include flex-col($sp-5);
}

.bsd__head {
  @include flex-col($sp-2);
  align-items: flex-start;
  padding-bottom: $sp-4;
  border-bottom: 1px solid $border-color;

  h3 {
    font-size: $fs-md;
    font-weight: 700;
    color: $primary-dark;
  }
}

.bsd__cost {
  font-size: $fs-2xl;
  font-weight: 800;
  color: $primary;
  font-variant-numeric: tabular-nums;

  span {
    font-size: $fs-sm;
    font-weight: 600;
    color: $text-secondary;
  }
}

.bsd__warn {
  @include flex(row, flex-start, flex-start, $sp-2);
  padding: $sp-3;
  border-radius: $radius-md;
  background: $alert-error-bg;
  color: $primary-dark;
  font-size: $fs-xs;
  line-height: 1.5;

  i {
    color: $alert-error;
    margin-top: 2px;
  }
}

.bsd__list {
  @include flex-col($sp-3);
}

.bsd__row {
  @include flex(row, space-between, flex-start, $sp-4);

  dt {
    font-size: $fs-xs;
    color: $text-secondary;
  }

  dd {
    font-size: $fs-xs;
    font-weight: 600;
    color: $primary-dark;
    text-align: right;
  }
}

.bsd__history {
  h4 {
    font-size: $fs-xs;
    font-weight: 700;
    color: $primary-dark;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-bottom: $sp-3;
  }

  ul {
    @include flex-col($sp-2);
    list-style: none;
  }

  li {
    @include flex(row, space-between, center, $sp-3);
    font-size: $fs-xs;
    color: $primary-dark;
    padding: $sp-2 $sp-3;
    border-radius: $radius-sm;
    background: $surface-alt;
  }
}

.bsd__charge--failed {
  background: $alert-error-bg;

  .bsd__charge-tag {
    color: $alert-error;
  }
}

.bsd__charge-date {
  color: $text-secondary;
  font-variant-numeric: tabular-nums;
}

.bsd__charge-amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.bsd__charge-tag {
  font-size: 0.68rem;
  color: $text-secondary;
}
</style>
