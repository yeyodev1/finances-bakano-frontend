<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { BaseSkeleton } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { useInvoicesStore } from '@/stores/invoices'
import { api } from '@/services/api.service'
import type { CashflowForecast, CashflowWeek, CollectedReport, RealizedWeek } from '@/types'

/**
 * Resumen único de cobranza. Antes había dos bloques apilados —el del período y
 * el semanal— que repetían "cobrado" y "vencido" con cifras distintas (uno por
 * período, otro por semana), y eso era justo lo que no se entendía.
 *
 * Ahora manda una sola jerarquía: arriba el período seleccionado, que es el
 * contexto de la tabla de abajo; el detalle semanal se abre a demanda.
 */
const store = useInvoicesStore()
const toast = useToast()
const { formatMoney, formatPercent, formatDateShort, formatPeriod } = useFormat()

const forecast = ref<CashflowForecast | null>(null)
const collected = ref<CollectedReport | null>(null)
const loading = ref(true)
const open = ref(false)
const tab = ref<'entro' | 'entrara'>('entrara')

// Rango ajustable: 8 semanas sirve para el día a día, 12 para planificar.
const weeksAhead = ref(8)
const weeksBack = ref(6)
const AHEAD_OPTIONS = [4, 8, 12]
const BACK_OPTIONS = [4, 6, 12]

async function load() {
  loading.value = true
  try {
    const [f, c] = await Promise.all([
      api.cashflow(weeksAhead.value),
      api.collected(weeksBack.value),
    ])
    forecast.value = f
    collected.value = c
  } catch (error) {
    toast.error('No se pudo cargar el resumen de cobranza', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([weeksAhead, weeksBack], load)
defineExpose({ reload: load })

// ── Período seleccionado (contexto de la tabla) ──────────────────
const s = computed(() => store.summary)

const periodCards = computed(() => [
  {
    key: 'expected',
    label: 'Esperado',
    value: formatMoney(s.value.expectedAmount),
    hint: `${s.value.total} cobros`,
    tone: '',
  },
  {
    key: 'collected',
    label: 'Cobrado',
    value: formatMoney(s.value.collectedAmount),
    hint: `${s.value.paid} pagados`,
    tone: 'ok',
  },
  {
    key: 'pending',
    label: 'Por cobrar',
    value: formatMoney(s.value.pendingAmount),
    hint: `${s.value.pending} pendientes`,
    tone: 'warn',
  },
  {
    key: 'overdue',
    label: 'Vencidos',
    value: String(s.value.overdue),
    hint: s.value.overdue === 1 ? 'cobro vencido' : 'cobros vencidos',
    tone: 'late',
  },
])

const rate = computed(() => Math.min(Math.max(s.value.collectionRate ?? 0, 0), 1))

const thisWeekIn = computed(() => collected.value?.thisWeek ?? null)

const maxForecast = computed(() =>
  Math.max(...(forecast.value?.weeks ?? []).map((w) => w.total), 1),
)
const maxCollected = computed(() =>
  Math.max(...(collected.value?.weeks ?? []).map((w) => w.total), 1),
)

const width = (value: number, max: number) => `${Math.min((value / max) * 100, 100)}%`

function forecastLabel(week: CashflowWeek): string {
  if (week.isCurrent) return 'Esta semana'
  if (week.index === 1) return 'Próxima semana'
  return formatDateShort(week.start)
}

function collectedLabel(week: RealizedWeek, total: number): string {
  if (week.isCurrent) return 'Esta semana'
  if (week.index === total - 2) return 'Semana pasada'
  return formatDateShort(week.start)
}

const overdueBuckets = computed(() =>
  (forecast.value?.overdue.buckets ?? []).filter((b) => b.amount > 0),
)

const overdueShare = computed(() => {
  const total = forecast.value?.totals.expected ?? 0
  if (!total) return 0
  return Math.round(((forecast.value?.totals.overdue ?? 0) / total) * 100)
})
</script>

<template>
  <section class="ov">
    <!-- ── Período: el contexto de la tabla de abajo ─────────── -->
    <header class="ov__period">
      <div class="ov__period-head">
        <h2 class="ov__title">
          <i class="fa-solid fa-calendar-check" aria-hidden="true" />
          {{ formatPeriod(s.period) }}
        </h2>
        <span class="ov__rate">
          {{ formatPercent(rate) }} cobrado
          <span class="ov__bar"><span class="ov__bar-fill" :style="{ width: `${rate * 100}%` }" /></span>
        </span>
      </div>

      <div class="cards">
        <BaseSkeleton v-if="store.loading && !s.total" v-for="n in 4" :key="n" height="70px" />
        <template v-else>
          <div v-for="card in periodCards" :key="card.key" class="card" :class="`card--${card.tone}`">
            <span class="card__label">{{ card.label }}</span>
            <span class="card__value">{{ card.value }}</span>
            <span class="card__hint">{{ card.hint }}</span>
          </div>
        </template>
      </div>
    </header>

    <!-- ── Detalle semanal, a demanda ────────────────────────── -->
    <button
      class="ov__toggle"
      type="button"
      :aria-expanded="open"
      aria-controls="ov-semanas"
      @click="open = !open"
    >
      <span class="ov__toggle-label">
        <i class="fa-solid fa-chart-line" aria-hidden="true" /> Detalle por semana
      </span>

      <span v-if="!loading && forecast && collected" class="peeks">
        <span class="peek">
          <span class="peek__label">Entró esta semana</span>
          <strong class="peek__value peek__value--ok">{{ formatMoney(thisWeekIn?.total ?? 0) }}</strong>
        </span>
        <span class="peek">
          <span class="peek__label">Falta esta semana</span>
          <strong class="peek__value">{{ formatMoney(forecast.totals.thisWeek) }}</strong>
        </span>
        <span class="peek">
          <span class="peek__label">Atrasado</span>
          <strong class="peek__value peek__value--late">{{ formatMoney(forecast.totals.overdue) }}</strong>
        </span>
      </span>

      <i class="chev fa-solid fa-chevron-down" :class="{ 'chev--open': open }" aria-hidden="true" />
    </button>

    <div v-if="loading && open" class="ov__skeleton">
      <BaseSkeleton v-for="n in 3" :key="n" height="38px" />
    </div>

    <div v-else-if="open && forecast && collected" id="ov-semanas" class="ov__body">
      <div class="controls">
        <div class="tabs" role="tablist">
          <button
            class="tabs__btn"
            :class="{ 'tabs__btn--on': tab === 'entrara' }"
            type="button"
            role="tab"
            :aria-selected="tab === 'entrara'"
            @click="tab = 'entrara'"
          >
            <i class="fa-solid fa-hourglass-half" aria-hidden="true" /> Debe entrar
          </button>
          <button
            class="tabs__btn"
            :class="{ 'tabs__btn--on': tab === 'entro' }"
            type="button"
            role="tab"
            :aria-selected="tab === 'entro'"
            @click="tab = 'entro'"
          >
            <i class="fa-solid fa-circle-check" aria-hidden="true" /> Ya entró
          </button>
        </div>

        <div class="range">
          <span class="range__label">{{ tab === 'entrara' ? 'Adelante' : 'Atrás' }}</span>
          <button
            v-for="n in tab === 'entrara' ? AHEAD_OPTIONS : BACK_OPTIONS"
            :key="n"
            class="range__btn"
            :class="{ 'range__btn--on': (tab === 'entrara' ? weeksAhead : weeksBack) === n }"
            type="button"
            @click="tab === 'entrara' ? (weeksAhead = n) : (weeksBack = n)"
          >
            {{ n }} sem
          </button>
        </div>
      </div>

      <!-- Lo que debe entrar -->
      <template v-if="tab === 'entrara'">
        <div class="totals">
          <div class="total">
            <span class="total__label">Total cobrable</span>
            <span class="total__value">{{ formatMoney(forecast.totals.expected) }}</span>
            <span class="total__hint">Vencido + por vencer</span>
          </div>
          <div class="total total--late">
            <span class="total__label">Atrasado</span>
            <span class="total__value">{{ formatMoney(forecast.totals.overdue) }}</span>
            <span class="total__hint">
              {{ forecast.overdue.count }} cobro(s) · {{ overdueShare }}% de la cartera
            </span>
          </div>
        </div>

        <div v-if="overdueBuckets.length" class="aging">
          <h3 class="sub"><i class="fa-solid fa-hourglass-end" aria-hidden="true" /> Antigüedad de lo atrasado</h3>
          <ul class="aging__list">
            <li v-for="b in overdueBuckets" :key="b.label" class="aging__item">
              <span class="aging__label">{{ b.label }}</span>
              <span class="aging__amount">{{ formatMoney(b.amount) }}</span>
              <span class="aging__count">{{ b.count }} cobro(s)</span>
            </li>
          </ul>
        </div>

        <ul class="weeks">
          <li
            v-for="week in forecast.weeks"
            :key="week.index"
            class="week"
            :class="{ 'week--now': week.isCurrent, 'week--empty': week.total === 0 }"
          >
            <div class="week__head">
              <span class="week__label">
                {{ forecastLabel(week) }}
                <span class="week__range">{{ formatDateShort(week.start) }} – {{ formatDateShort(week.end) }}</span>
              </span>
              <span class="week__total">{{ formatMoney(week.total) }}</span>
            </div>
            <div class="week__bar">
              <span v-if="week.invoices.amount" class="seg seg--rec" :style="{ width: width(week.invoices.amount, maxForecast) }" />
              <span v-if="week.sales.amount" class="seg seg--new" :style="{ width: width(week.sales.amount, maxForecast) }" />
            </div>
            <p v-if="week.total > 0" class="week__detail">
              <span v-if="week.invoices.amount" class="tag tag--rec">
                <i class="fa-solid fa-file-invoice" aria-hidden="true" />
                Clientes {{ formatMoney(week.invoices.amount) }} ({{ week.invoices.count }})
              </span>
              <span v-if="week.sales.amount" class="tag tag--new">
                <i class="fa-solid fa-seedling" aria-hidden="true" />
                Ventas nuevas {{ formatMoney(week.sales.amount) }} ({{ week.sales.count }})
              </span>
            </p>
            <p v-else class="week__detail week__detail--empty">Sin cobros programados</p>
          </li>
        </ul>

        <p v-if="forecast.totals.peakWeekAmount > 0" class="peak">
          <i class="fa-solid fa-arrow-trend-up" aria-hidden="true" />
          Semana más cargada: la del <strong>{{ formatDateShort(forecast.totals.peakWeekStart!) }}</strong>
          con <strong>{{ formatMoney(forecast.totals.peakWeekAmount) }}</strong>.
        </p>
      </template>

      <!-- Lo que ya entró -->
      <template v-else>
        <div class="totals">
          <div class="total">
            <span class="total__label">Cobrado en {{ weeksBack }} semanas</span>
            <span class="total__value">{{ formatMoney(collected.totals.collected) }}</span>
          </div>
          <div class="total total--new">
            <span class="total__label">De ventas nuevas</span>
            <span class="total__value">{{ formatMoney(collected.totals.newBusiness) }}</span>
            <span class="total__hint">Clientes con menos de un mes y cuotas de ventas</span>
          </div>
          <div class="total total--rec">
            <span class="total__label">De clientes recurrentes</span>
            <span class="total__value">{{ formatMoney(collected.totals.recurring) }}</span>
            <span class="total__hint">Con más de un mes con nosotros</span>
          </div>
        </div>

        <p v-if="collected.vsPreviousWeek !== null" class="delta">
          <i
            class="fa-solid"
            :class="collected.vsPreviousWeek >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'"
            aria-hidden="true"
          />
          Esta semana va
          <strong :class="collected.vsPreviousWeek >= 0 ? 'up' : 'down'">
            {{ collected.vsPreviousWeek >= 0 ? '+' : '' }}{{ collected.vsPreviousWeek }}%
          </strong>
          respecto a la semana pasada.
        </p>

        <ul class="weeks">
          <li
            v-for="week in collected.weeks"
            :key="week.index"
            class="week"
            :class="{ 'week--now': week.isCurrent, 'week--empty': week.total === 0 }"
          >
            <div class="week__head">
              <span class="week__label">
                {{ collectedLabel(week, collected.weeks.length) }}
                <span class="week__range">{{ formatDateShort(week.start) }} – {{ formatDateShort(week.end) }}</span>
              </span>
              <span class="week__total">{{ formatMoney(week.total) }}</span>
            </div>
            <div class="week__bar">
              <span v-if="week.newBusiness.amount" class="seg seg--new" :style="{ width: width(week.newBusiness.amount, maxCollected) }" />
              <span v-if="week.recurring.amount" class="seg seg--rec" :style="{ width: width(week.recurring.amount, maxCollected) }" />
            </div>
            <p v-if="week.total > 0" class="week__detail">
              <span v-if="week.newBusiness.amount" class="tag tag--new">
                <i class="fa-solid fa-seedling" aria-hidden="true" />
                Venta nueva {{ formatMoney(week.newBusiness.amount) }} ({{ week.newBusiness.count }})
              </span>
              <span v-if="week.recurring.amount" class="tag tag--rec">
                <i class="fa-solid fa-repeat" aria-hidden="true" />
                Recurrente {{ formatMoney(week.recurring.amount) }} ({{ week.recurring.count }})
              </span>
            </p>
            <p v-else class="week__detail week__detail--empty">No entró nada</p>
          </li>
        </ul>
      </template>
    </div>
  </section>
</template>

<style scoped lang="scss">
.ov {
  @include card($sp-4);
  @include flex-col($sp-3);
}

.ov__period { @include flex-col($sp-3); }

.ov__period-head {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.ov__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;

  i { color: $primary; }
}

.ov__rate {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 700;
  color: $text-secondary;
}

.ov__bar {
  display: block;
  width: 90px;
  height: 6px;
  border-radius: $radius-full;
  background: rgba($primary-dark, 0.1);
  overflow: hidden;
}

.ov__bar-fill {
  display: block;
  height: 100%;
  background: $alert-success;
  transition: width $transition-base;
}

.cards {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
}

.card {
  @include flex-col(2px);
  flex: 1 1 150px;
  min-width: 0;
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;

  &--ok { border-color: rgba($alert-success, 0.3); }
  &--warn { border-color: rgba($alert-warning, 0.3); }
  &--late { border-color: rgba($alert-error, 0.3); .card__value { color: $alert-error; } }
}

.card__label {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: $text-secondary;
}

.card__value { font-size: $fs-lg; font-weight: 800; color: $primary-dark; }
.card__hint { font-size: $fs-xs; color: $text-secondary; }

.ov__toggle {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
  width: 100%;
  padding-top: $sp-3;
  border-top: 1px solid $border-color;
  text-align: left;
  cursor: pointer;

  &:focus-visible { @include focus-ring; }
}

.ov__toggle-label {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;

  i { color: $primary; }
}

.peeks {
  @include flex(row, flex-end, center, $sp-4);
  flex-wrap: wrap;
  flex: 1 1 auto;
}

.peek { @include flex-col(1px); }

.peek__label {
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: $text-secondary;
}

.peek__value {
  font-size: $fs-sm;
  font-weight: 800;
  color: $primary-dark;

  &--ok { color: $alert-success; }
  &--late { color: $alert-error; }
}

.chev {
  flex: none;
  color: $text-secondary;
  font-size: $fs-xs;
  transition: transform $transition-base;

  &--open { transform: rotate(180deg); color: $primary; }
}

.ov__skeleton { @include flex-col($sp-2); }
.ov__body { @include flex-col($sp-4); }

.controls {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.tabs { @include flex(row, flex-start, center, $sp-2); flex-wrap: wrap; }

.tabs__btn {
  @include flex(row, flex-start, center, $sp-2);
  padding: $sp-2 $sp-3;
  border-radius: $radius-full;
  border: 1px solid $border-color;
  font-size: $fs-xs;
  font-weight: 600;
  color: $text-secondary;
  cursor: pointer;
  transition: background $transition-fast, color $transition-fast, border-color $transition-fast;

  &--on { background: rgba($primary, 0.1); border-color: $primary; color: $primary; }
  &:focus-visible { @include focus-ring; }
}

.range { @include flex(row, flex-start, center, $sp-1); flex-wrap: wrap; }

.range__label {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: $text-secondary;
  margin-right: $sp-1;
}

.range__btn {
  padding: 4px $sp-2;
  border-radius: $radius-xs;
  border: 1px solid $border-color;
  font-size: 0.68rem;
  font-weight: 600;
  color: $text-secondary;
  cursor: pointer;

  &--on { background: rgba($primary, 0.1); border-color: $primary; color: $primary; }
  &:focus-visible { @include focus-ring; }
}

.totals { @include flex(row, flex-start, stretch, $sp-3); flex-wrap: wrap; }

.total {
  @include flex-col(2px);
  flex: 1 1 170px;
  min-width: 0;
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;

  &--new { border-color: rgba($alert-success, 0.35); background: rgba($alert-success, 0.05); }
  &--rec { border-color: rgba($primary, 0.3); background: rgba($primary, 0.04); }
  &--late {
    border-color: rgba($alert-error, 0.35);
    background: rgba($alert-error, 0.05);
    .total__value { color: $alert-error; }
  }
}

.total__label {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: $text-secondary;
}

.total__value { font-size: $fs-lg; font-weight: 800; color: $primary-dark; }
.total__hint { font-size: $fs-xs; color: $text-secondary; }

.delta {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;

  .up { color: $alert-success; font-weight: 800; }
  .down { color: $alert-error; font-weight: 800; }
}

.sub {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 800;
  color: $primary-dark;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  i { color: $primary; }
}

.aging {
  @include flex-col($sp-2);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
}

.aging__list { @include flex(row, flex-start, stretch, $sp-2); flex-wrap: wrap; }

.aging__item {
  @include flex-col(2px);
  flex: 1 1 130px;
  min-width: 0;
  padding: $sp-2 $sp-3;
  border-radius: $radius-xs;
  background: rgba($alert-error, 0.06);
}

.aging__label { font-size: 0.66rem; color: $text-secondary; }
.aging__amount { font-weight: 800; color: $alert-error; font-size: $fs-sm; }
.aging__count { font-size: 0.66rem; color: $text-secondary; }

.weeks { @include flex-col($sp-3); }

.week {
  @include flex-col($sp-2);

  &--now .week__label { color: $primary; font-weight: 800; }
  &--empty { opacity: 0.5; }
}

.week__head { @include flex(row, space-between, baseline, $sp-3); flex-wrap: wrap; }

.week__label {
  @include flex(row, flex-start, baseline, $sp-2);
  flex-wrap: wrap;
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;
}

.week__range { font-size: 0.66rem; font-weight: 400; color: $text-secondary; }
.week__total { font-weight: 800; color: $primary-dark; }

.week__bar {
  @include flex(row, flex-start, stretch);
  height: 10px;
  border-radius: $radius-full;
  background: rgba($primary-dark, 0.07);
  overflow: hidden;
}

.seg {
  height: 100%;
  transition: width $transition-base;

  // El color acompaña; cada tramo se nombra en las etiquetas de abajo.
  &--new { background: $alert-success; }
  &--rec { background: $primary; }
}

.week__detail {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;

  &--empty { font-style: italic; }
}

.tag {
  @include flex(row, flex-start, center, $sp-1);

  &--new i { color: $alert-success; }
  &--rec i { color: $primary; }
}

.peak {
  @include flex(row, flex-start, center, $sp-2);
  padding-top: $sp-3;
  border-top: 1px solid $border-color;
  font-size: $fs-xs;
  color: $text-secondary;

  i { color: $primary; }
  strong { color: $primary-dark; font-weight: 700; }
}
</style>
