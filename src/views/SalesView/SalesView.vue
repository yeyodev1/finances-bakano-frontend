<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BaseBadge,
  BaseButton,
  BaseEmptyState,
  BaseSearchInput,
  BaseSelect,
  BaseSkeleton,
  BaseStatCard,
} from '@/components/base'
import SaleFormModal from './SaleFormModal.vue'
import SaleDetailModal from './SaleDetailModal.vue'
import SaleLoseModal from './SaleLoseModal.vue'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { useSalesStore } from '@/stores/sales'
import { SALE_STATUS_ICON, SALE_STATUS_OPTIONS, SALE_STATUS_TONE } from '@/config/saleOptions'
import { SALE_STATUS_LABELS } from '@/types'
import type { BadgeVariant } from '@/components/base'
import type { Sale, SelectOption } from '@/types'

const store = useSalesStore()
const toast = useToast()
const { formatMoney, formatDateShort } = useFormat()

const formOpen = ref(false)
const detailOpen = ref(false)
const loseOpen = ref(false)
const selected = ref<Sale | null>(null)

const statusOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'Todos los estados', icon: 'fa-solid fa-list' },
  ...SALE_STATUS_OPTIONS,
])

const statusModel = computed<string | number | null>({
  get: () => store.filters.status ?? 'all',
  set: (value) => {
    store.filters.status = value === 'all' || value === null ? null : (value as Sale['status'])
    void load()
  },
})

async function load() {
  try {
    await store.load()
  } catch (error) {
    toast.error('Error al cargar ventas', apiErrorMessage(error))
  }
}

onMounted(load)

function openDetail(sale: Sale) {
  selected.value = sale
  detailOpen.value = true
}

function openLose(sale: Sale) {
  selected.value = sale
  detailOpen.value = false
  loseOpen.value = true
}

function toneOf(sale: Sale): BadgeVariant {
  return SALE_STATUS_TONE[sale.status] as BadgeVariant
}

/** Días hasta la próxima cuota: negativo significa que ya venció. */
function daysToNext(sale: Sale): number | null {
  const next = store.nextInstallment(sale)
  if (!next) return null
  const diff = new Date(next.dueDate).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / 86_400_000)
}
</script>

<template>
  <div class="sales">
    <header class="sales__header">
      <div class="sales__title">
        <h1><i class="fa-solid fa-handshake" aria-hidden="true" /> Ventas</h1>
        <p>Acuerdos cerrados y cuánto dinero debe entrar</p>
      </div>

      <div class="sales__actions">
        <BaseButton icon="fa-solid fa-plus" @click="formOpen = true">Registrar venta</BaseButton>
        <BaseButton variant="ghost" icon="fa-solid fa-rotate" :loading="store.loading" @click="load">
          Actualizar
        </BaseButton>
      </div>
    </header>

    <div class="sales__stats">
      <BaseStatCard
        label="Debe entrar este mes"
        :value="formatMoney(store.summary.expectedTotal)"
        icon="fa-solid fa-sack-dollar"
        color="primary"
        hint="Recurrente de clientes + ventas nuevas por cobrar"
      />
      <BaseStatCard
        label="Recurrente de clientes"
        :value="formatMoney(store.summary.recurringMonthly)"
        icon="fa-solid fa-repeat"
        color="info"
        hint="Los que ya tenemos"
      />
      <BaseStatCard
        label="Ventas nuevas por cobrar"
        :value="formatMoney(store.summary.newSales.pending)"
        icon="fa-solid fa-hourglass-half"
        color="warning"
        :hint="`${formatMoney(store.summary.newSales.overdue)} ya vencido`"
      />
      <BaseStatCard
        label="Cobrado de ventas nuevas"
        :value="formatMoney(store.summary.newSales.collected)"
        icon="fa-solid fa-circle-check"
        color="success"
        :hint="`${formatMoney(store.summary.newSales.lost)} perdido`"
      />
    </div>

    <p class="sales__mix">
      <i class="fa-solid fa-list-check" aria-hidden="true" />
      De lo vendido: <strong>{{ formatMoney(store.summary.newSales.recurringSold) }}</strong> en
      mensualidades y <strong>{{ formatMoney(store.summary.newSales.oneOffSold) }}</strong> en
      extras puntuales.
      <span v-if="store.summary.newSales.missingInvoice > 0" class="sales__mix-warn">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        {{ store.summary.newSales.missingInvoice }} venta(s) piden factura y no tienen número.
      </span>
    </p>

    <section v-if="store.summary.byOwner.length" class="owners">
      <h2 class="owners__title">
        <i class="fa-solid fa-user-tie" aria-hidden="true" /> Quién debe cobrar qué
      </h2>
      <ul class="owners__list">
        <li v-for="owner in store.summary.byOwner" :key="owner.ownerName" class="owner">
          <span class="owner__name">{{ owner.ownerName }}</span>
          <span class="owner__count">{{ owner.count }} venta(s)</span>
          <span class="owner__pending">{{ formatMoney(owner.pending) }} por cobrar</span>
          <span v-if="owner.overdue > 0" class="owner__overdue">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            {{ formatMoney(owner.overdue) }} vencido
          </span>
        </li>
      </ul>
    </section>

    <div class="sales__filters">
      <BaseSearchInput
        v-model="store.filters.q"
        placeholder="Buscar por negocio…"
        @search="load"
      />
      <BaseSelect v-model="statusModel" :options="statusOptions" label="Estado" />
    </div>

    <div v-if="store.loading && !store.items.length" class="sales__skeleton">
      <BaseSkeleton v-for="n in 4" :key="n" height="84px" />
    </div>

    <BaseEmptyState
      v-else-if="store.isEmpty"
      icon="fa-solid fa-handshake"
      title="Sin ventas registradas"
      message="Cuando cierres un acuerdo, regístralo aquí con su monto, sus fechas de cobro y quién debe cobrarlo."
    >
      <template #action>
        <BaseButton icon="fa-solid fa-plus" @click="formOpen = true">Registrar venta</BaseButton>
      </template>
    </BaseEmptyState>

    <TransitionGroup v-else name="list" tag="ul" class="rows">
      <li v-for="sale in store.items" :key="sale._id" class="row" @click="openDetail(sale)">
        <div class="row__main">
          <p class="row__name">{{ sale.businessName }}</p>
          <p class="row__meta">
            <i class="fa-solid fa-user-tie" aria-hidden="true" />
            Cobra {{ sale.ownerName }} · vendió {{ sale.soldByName }}
          </p>
          <p v-if="store.nextInstallment(sale)" class="row__next">
            <i class="fa-solid fa-calendar-day" aria-hidden="true" />
            Próximo cobro {{ formatDateShort(store.nextInstallment(sale)!.dueDate) }}
            <span v-if="(daysToNext(sale) ?? 0) < 0" class="row__late">
              · {{ Math.abs(daysToNext(sale)!) }} días de retraso
            </span>
          </p>
        </div>

        <div class="row__figures">
          <span class="row__amount">{{ formatMoney(sale.amount) }}</span>
          <span class="row__pending">{{ formatMoney(store.pendingOf(sale)) }} por cobrar</span>
        </div>

        <div class="row__tail">
          <BaseBadge :variant="toneOf(sale)" :icon="SALE_STATUS_ICON[sale.status]">
            {{ SALE_STATUS_LABELS[sale.status] }}
          </BaseBadge>
          <i class="fa-solid fa-chevron-right row__chevron" aria-hidden="true" />
        </div>
      </li>
    </TransitionGroup>

    <SaleFormModal v-model="formOpen" @created="load" />
    <SaleDetailModal v-model="detailOpen" :sale="selected" @lose="openLose" />
    <SaleLoseModal v-model="loseOpen" :sale="selected" @done="load" />
  </div>
</template>

<style scoped lang="scss">
.sales {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

.sales__header {
  @include flex-col($sp-3);

  @include md {
    @include flex-between(flex-end, $sp-4);
  }
}

.sales__title {
  h1 {
    @include flex(row, flex-start, center, $sp-3);
    font-size: $fs-xl;
    font-weight: 800;
    color: $primary-dark;

    i { color: $primary; }
  }

  p {
    font-size: $fs-xs;
    color: $text-secondary;
    margin-top: $sp-1;
  }
}

.sales__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.sales__stats {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;

  > * { flex: 1 1 220px; min-width: 0; }
}

.sales__mix {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;

  i { color: $primary; }
  strong { color: $primary-dark; font-weight: 700; }
}

.sales__mix-warn {
  @include flex(row, flex-start, center, $sp-1);
  color: $alert-warning;
  font-weight: 700;

  i { color: $alert-warning; }
}

.owners {
  @include card($sp-5);
  @include flex-col($sp-3);
}

.owners__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;

  i { color: $primary; }
}

.owners__list {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
}

.owner {
  @include flex-col($sp-1);
  flex: 1 1 200px;
  min-width: 0;
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  font-size: $fs-xs;
  color: $text-secondary;
}

.owner__name { font-weight: 800; color: $primary-dark; font-size: $fs-sm; }
.owner__pending { font-weight: 700; color: $alert-warning; }

.owner__overdue {
  @include flex(row, flex-start, center, $sp-1);
  color: $alert-error;
  font-weight: 700;
}

.sales__filters {
  @include flex(row, flex-start, flex-end, $sp-3);
  flex-wrap: wrap;

  > * { flex: 1 1 220px; min-width: 0; }
}

.sales__skeleton { @include flex-col($sp-2); }

.rows { @include flex-col($sp-2); }

.row {
  @include flex(row, flex-start, center, $sp-4);
  flex-wrap: wrap;
  padding: $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: $surface;
  cursor: pointer;
  transition: border-color $transition-fast, transform $transition-fast, box-shadow $transition-fast;

  &:hover {
    border-color: $primary;
    transform: translateY(-1px);
    box-shadow: $shadow-sm;
  }
}

.row__main {
  @include flex-col(3px);
  flex: 1 1 240px;
  min-width: 0;
}

.row__name { font-weight: 700; color: $primary-dark; @include truncate; }

.row__meta,
.row__next {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;
}

.row__late { color: $alert-error; font-weight: 700; }

.row__figures {
  @include flex-col(2px);
  flex: 0 1 auto;
  text-align: right;
}

.row__amount { font-weight: 800; color: $primary-dark; }
.row__pending { font-size: $fs-xs; color: $alert-warning; font-weight: 600; }

.row__tail {
  @include flex(row, flex-start, center, $sp-3);
  flex: none;
}

.row__chevron { color: $text-secondary; font-size: $fs-xs; }
</style>
