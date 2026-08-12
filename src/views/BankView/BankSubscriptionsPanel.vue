<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseCard, BaseEmptyState, BaseSkeleton, BaseTable } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { subscriptionStatus } from './bankFormat'
import type { TableColumn } from '@/components/base'
import type { BankSubscription, BankSubscriptionsReport } from '@/types'

/**
 * Suscripciones detectadas automáticamente a partir de los cargos recurrentes.
 * Es una inferencia, no un dato que dé Mercury: la vista lo dice explícitamente.
 */

const props = withDefaults(
  defineProps<{
    report?: BankSubscriptionsReport | null
    items?: BankSubscription[]
    /** Totales ya recalculados sobre lo filtrado. */
    totals?: { monthlyCost: number; yearlyCost: number; count: number; failing: number } | null
    loading?: boolean
  }>(),
  { report: null, items: () => [], totals: null, loading: false },
)

defineEmits<{ open: [subscription: BankSubscription] }>()

const { formatMoney, formatDateShort } = useFormat()

const items = computed(() => props.items)
const totals = computed(() => props.totals)
const history = computed(() => props.report?.history ?? null)

const allCount = computed(() => props.report?.items.length ?? 0)
const isFiltered = computed(() => items.value.length !== allCount.value)

const failing = computed(() => items.value.filter((item) => item.status === 'failing'))

/** Suma real de lo rechazado dentro de lo filtrado. */
const failedAmount = computed(() =>
  failing.value.reduce((sum, item) => sum + item.failedAmount, 0),
)

const columns: TableColumn[] = [
  { key: 'name', label: 'Servicio' },
  { key: 'amount', label: 'Cobro', align: 'right', width: '120px' },
  { key: 'cadenceLabel', label: 'Frecuencia', hideOnMobile: true, width: '170px' },
  { key: 'monthlyCost', label: 'Costo mensual', align: 'right', width: '140px' },
  { key: 'nextChargeAt', label: 'Próximo cobro', align: 'right', hideOnMobile: true, width: '140px' },
  { key: 'status', label: 'Estado', align: 'center', width: '130px' },
]
</script>

<template>
  <div class="bsub">
    <!-- ── Lo que cuesta al mes, en una línea ────────────────── -->
    <div class="bsub__summary">
      <div class="bsub__figure">
        <span class="bsub__figure-label">Cuesta al mes</span>
        <strong>{{ formatMoney(totals?.monthlyCost) }}</strong>
        <small>{{ formatMoney(totals?.yearlyCost) }} al año</small>
      </div>

      <div class="bsub__figure">
        <span class="bsub__figure-label">Servicios</span>
        <strong>{{ totals?.count ?? 0 }}</strong>
        <small v-if="isFiltered">de {{ allCount }} detectados</small>
        <small v-else>cobros recurrentes</small>
      </div>

      <div class="bsub__figure" :class="{ 'bsub__figure--bad': totals?.failing }">
        <span class="bsub__figure-label">Rechazados</span>
        <strong>{{ totals?.failing ?? 0 }}</strong>
        <small>{{ formatMoney(failedAmount) }} sin cobrar</small>
      </div>
    </div>

    <slot name="filters" />

    <!-- ── Alerta de cobros rebotados ────────────────────────── -->
    <div v-if="failing.length" class="bsub__alert">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      <div>
        <strong>
          {{ failing.length }}
          {{ failing.length === 1 ? 'suscripción tiene' : 'suscripciones tienen' }}
          el cobro rechazado
        </strong>
        <p>
          {{ failing.map((f) => f.name).join(' · ') }} — son
          {{ formatMoney(failedAmount) }} que el banco no dejó pasar. Si no se arregla la
          tarjeta o el saldo, esos servicios se cortan.
        </p>
      </div>
    </div>

    <!-- ── Tabla ─────────────────────────────────────────────── -->
    <div v-if="props.loading && !items.length" class="bsub__loading">
      <BaseSkeleton v-for="n in 4" :key="n" height="52px" />
    </div>

    <BaseEmptyState
      v-else-if="!items.length && isFiltered"
      icon="fa-solid fa-filter-circle-xmark"
      title="Sin resultados"
      message="Ninguna suscripción coincide con los filtros aplicados."
    />

    <BaseEmptyState
      v-else-if="!items.length"
      icon="fa-solid fa-arrows-rotate"
      title="Sin suscripciones detectadas"
      message="No hay cargos que se repitan con el mismo monto en el historial disponible. Con más meses de movimientos van a empezar a aparecer."
    />

    <BaseTable
      v-else
      :columns="columns"
      :rows="items"
      row-key="key"
      @row-click="$emit('open', $event)"
    >
      <template #cell-name="{ row }">
        <div class="bsub__name">
          <span class="bsub__icon"><i class="fa-solid fa-arrows-rotate" aria-hidden="true" /></span>
          <div>
            <strong>{{ row.name }}</strong>
            <small>
              {{ row.charges }} {{ row.charges === 1 ? 'cobro' : 'cobros' }}
              <template v-if="row.failedAttempts">
                · {{ row.failedAttempts }} intentos rechazados
              </template>
            </small>
          </div>
        </div>
      </template>

      <template #cell-amount="{ row }">
        <span class="bsub__amount">{{ formatMoney(row.amount) }}</span>
      </template>

      <template #cell-cadenceLabel="{ row }">
        <span class="bsub__muted">
          {{ row.cadenceLabel }}
          <template v-if="row.intervalDays"> · cada {{ row.intervalDays }}d</template>
        </span>
      </template>

      <template #cell-monthlyCost="{ row }">
        <div class="bsub__monthly">
          <strong>{{ formatMoney(row.monthlyCost) }}</strong>
          <small v-if="row.estimated">estimado</small>
        </div>
      </template>

      <template #cell-nextChargeAt="{ row }">
        <span class="bsub__muted">
          {{ row.nextChargeAt ? formatDateShort(row.nextChargeAt) : '—' }}
        </span>
      </template>

      <template #cell-status="{ row }">
        <BaseBadge
          :variant="subscriptionStatus(row.status).variant"
          :label="subscriptionStatus(row.status).label"
          size="sm"
        />
      </template>
    </BaseTable>

    <!-- ── Cómo se arma esta lista ───────────────────────────── -->
    <p v-if="items.length" class="bsub__note">
      Detectadas automáticamente: se agrupan los cargos que se repiten con el mismo monto en el
      mismo comercio. Los gastos de monto variable quedan fuera.
      <template v-if="history?.from">
        Calculado sobre {{ history.days }} días de historial ({{ formatDateShort(history.from) }}
        — {{ formatDateShort(history.to) }}); con más meses, la frecuencia se afina.
      </template>
    </p>

    <!-- ── Gasto recurrente que no es suscripción ────────────── -->
    <BaseCard
      v-if="props.report?.candidates?.length"
      title="Gasto recurrente de monto variable"
      subtitle="Comercios donde se gasta seguido pero el monto cambia: no son suscripciones"
      icon="fa-solid fa-repeat"
    >
      <ul class="bsub__cands">
        <li v-for="candidate in props.report.candidates" :key="candidate.name">
          <span>{{ candidate.name }}</span>
          <span class="bsub__muted">{{ candidate.charges }} cargos</span>
          <strong>{{ formatMoney(candidate.totalPaid) }}</strong>
        </li>
      </ul>
    </BaseCard>
  </div>
</template>

<style scoped lang="scss">
.bsub {
  @include flex-col($sp-4);
}

.bsub__note {
  font-size: 0.68rem;
  color: $text-secondary;
  line-height: 1.6;
}

.bsub__summary {
  // Móvil: filas etiqueta/valor. Desde tablet: tres bloques separados por hairline.
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  background: $surface;

  @include md {
    flex-direction: row;
    align-items: stretch;
  }
}

.bsub__figure {
  @include flex(row, space-between, baseline, $sp-3);
  position: relative;
  flex-wrap: wrap;

  @include md {
    @include flex-col(2px);
    align-items: flex-start;
    flex: 1 1 0;
    min-width: 0;
  }

  + .bsub__figure {
    padding-top: $sp-3;
    border-top: 1px solid $border-color;

    @include md {
      padding-top: 0;
      border-top: none;
      padding-left: $sp-4;
      border-left: 1px solid $border-color;
    }
  }

  strong {
    font-size: $fs-lg;
    font-weight: 800;
    color: $primary-dark;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }

  small {
    font-size: 0.65rem;
    color: $text-secondary;
  }

  &--bad strong {
    color: $alert-error;
  }
}

.bsub__figure-label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: $text-secondary;
  font-weight: 700;
}

.bsub__alert {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-4;
  border-radius: $radius-lg;
  border: 1px solid rgba($alert-error, 0.25);
  background: $alert-error-bg;

  > i {
    color: $alert-error;
    margin-top: 2px;
  }

  strong {
    font-size: $fs-sm;
    color: $primary-dark;
  }

  p {
    font-size: $fs-xs;
    color: $text-secondary;
    margin-top: $sp-1;
    line-height: 1.5;
  }
}

.bsub__loading {
  @include flex-col($sp-2);
}

.bsub__name {
  @include flex(row, flex-start, center, $sp-3);
  min-width: 0;

  strong {
    display: block;
    font-size: $fs-sm;
    font-weight: 600;
    color: $primary-dark;
    @include truncate;
  }

  small {
    font-size: 0.68rem;
    color: $text-secondary;
  }
}

.bsub__icon {
  @include flex-center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: $radius-md;
  background: rgba($secondary, 0.12);
  color: $secondary;
  font-size: $fs-xs;
}

.bsub__amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: $primary-dark;
}

.bsub__monthly {
  @include flex-col($sp-0);
  align-items: flex-end;

  strong {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: $primary-dark;
  }

  small {
    font-size: 0.65rem;
    color: $text-secondary;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

.bsub__muted {
  font-size: $fs-xs;
  color: $text-secondary;
}

.bsub__cands {
  @include flex-col($sp-2);
  list-style: none;

  li {
    @include flex(row, space-between, center, $sp-3);
    font-size: $fs-xs;
    color: $primary-dark;
    padding-bottom: $sp-2;
    border-bottom: 1px solid $border-color;

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    span:first-child {
      flex: 1;
      @include truncate;
    }

    strong {
      font-variant-numeric: tabular-nums;
    }
  }
}
</style>
