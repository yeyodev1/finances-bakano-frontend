<script setup lang="ts">
import { computed } from 'vue'
import { useFormat } from '@/composables/useFormat'
import type { SaleGoalProgress } from '@/types'

/**
 * Gráfico del objetivo del mes. Dos lecturas, de arriba abajo:
 *  1. Medidor: qué porcentaje de la meta en dinero va vendido, con el número grande.
 *  2. Barras por tipo de cliente: la pista gris es la meta, el relleno lo vendido.
 *     La línea punteada marca por dónde va el mes (día de hoy / días del mes):
 *     si el relleno está a la izquierda de la línea, vamos atrasados.
 * Un solo tono; verde únicamente al cumplir, siempre con icono y texto.
 */
const props = defineProps<{ goal: SaleGoalProgress }>()
const { formatMoney, formatPeriod } = useFormat()

const totals = computed(() => props.goal.totals)

/** Avance del calendario: cuánto del mes ya pasó. Para meses futuros 0, pasados 100. */
const monthPace = computed(() => {
  const [y = 0, m = 1] = props.goal.period.split('-').map(Number)
  const now = new Date()
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  if (now < start) return 0
  if (now > end) return 100
  return Math.round((now.getDate() / end.getDate()) * 100)
})

const pct = computed(() => Math.min(totals.value.amountPct, 100))
const done = computed(() => totals.value.amountPct >= 100 && totals.value.countPct >= 100)
/** Atrasados si lo vendido va por debajo del ritmo del calendario (con 10 puntos de margen). */
const behind = computed(() => !done.value && totals.value.amountPct + 10 < monthPace.value)

// Medidor semicircular: arco de 180° de radio 80 centrado en (100, 100).
const R = 80
const ARC = Math.PI * R
const dash = computed(() => `${(pct.value / 100) * ARC} ${ARC}`)

const statusLabel = computed(() => {
  if (done.value) return { icon: 'fa-solid fa-trophy', text: 'Objetivo cumplido', tone: 'ok' }
  if (behind.value) return { icon: 'fa-solid fa-person-running', text: 'Vamos por detrás del mes', tone: 'warn' }
  return { icon: 'fa-solid fa-arrow-trend-up', text: 'En ritmo', tone: 'neutral' }
})

const bars = computed(() =>
  props.goal.lines.map((l) => ({
    ...l,
    fill: Math.min(l.amountPct, 100),
    complete: l.amountPct >= 100 && l.countPct >= 100,
  })),
)
</script>

<template>
  <figure class="chart" :aria-label="`Objetivo de ${formatPeriod(goal.period)}: ${totals.amountPct}% en dinero y ${totals.countPct}% en clientes`">
    <div class="chart__hero">
      <svg class="gauge" viewBox="0 0 200 112" role="img" aria-hidden="true">
        <path class="gauge__track" d="M 20 100 A 80 80 0 0 1 180 100" />
        <path
          class="gauge__fill"
          :class="{ 'gauge__fill--ok': done }"
          d="M 20 100 A 80 80 0 0 1 180 100"
          :stroke-dasharray="dash"
        />
        <!-- Marca del ritmo del mes -->
        <g v-if="monthPace > 0 && monthPace < 100 && !done" class="gauge__pace"
           :transform="`rotate(${monthPace * 1.8 - 180} 100 100)`">
          <line x1="180" y1="100" x2="194" y2="100" />
        </g>
      </svg>
      <div class="hero">
        <span class="hero__pct">{{ totals.amountPct }}<small>%</small></span>
        <span class="hero__money">
          <strong>{{ formatMoney(totals.inGoalAmount) }}</strong> de {{ formatMoney(totals.targetAmount) }}
        </span>
        <span class="hero__count">
          <i class="fa-solid fa-users" aria-hidden="true" />
          {{ totals.inGoalCount }} de {{ totals.targetCount }} clientes
        </span>
        <span class="hero__status" :class="`hero__status--${statusLabel.tone}`">
          <i :class="statusLabel.icon" aria-hidden="true" /> {{ statusLabel.text }}
          <span v-if="!done" class="hero__pace">· va el {{ monthPace }}% del mes</span>
        </span>
      </div>
    </div>

    <ul v-if="bars.length" class="bars" aria-label="Avance por tipo de cliente">
      <li v-for="bar in bars" :key="bar.categoryId" class="bar">
        <div class="bar__label">
          <span class="bar__name">
            <i :class="bar.complete ? 'fa-solid fa-circle-check' : (bar.icon || 'fa-solid fa-tag')" aria-hidden="true" />
            {{ bar.categoryName }}
          </span>
          <span class="bar__nums">
            <strong>{{ bar.soldCount }}</strong>/{{ bar.targetCount }} ·
            <strong>{{ formatMoney(bar.soldAmount) }}</strong> de {{ formatMoney(bar.targetAmount) }}
          </span>
        </div>
        <div class="bar__track" role="progressbar" :aria-valuenow="bar.amountPct" aria-valuemin="0" aria-valuemax="100" :aria-label="bar.categoryName">
          <span class="bar__fill" :class="{ 'bar__fill--ok': bar.complete }" :style="{ width: `${bar.fill}%` }" />
          <span v-if="monthPace > 0 && monthPace < 100" class="bar__pace" :style="{ left: `${monthPace}%` }" />
        </div>
        <span class="bar__remaining">
          <template v-if="bar.complete">Meta alcanzada</template>
          <template v-else>
            Faltan
            <template v-if="bar.remainingCount > 0">{{ bar.remainingCount }} cliente(s)</template>
            <template v-if="bar.remainingCount > 0 && bar.remainingAmount > 0"> y </template>
            <template v-if="bar.remainingAmount > 0">{{ formatMoney(bar.remainingAmount) }}</template>
          </template>
        </span>
      </li>
    </ul>

    <figcaption class="chart__legend">
      <span><i class="legend legend--track" aria-hidden="true" /> Meta</span>
      <span><i class="legend legend--fill" aria-hidden="true" /> Vendido</span>
      <span><i class="legend legend--pace" aria-hidden="true" /> Día de hoy en el mes</span>
    </figcaption>
  </figure>
</template>

<style scoped lang="scss">
.chart {
  @include flex-col($sp-4);
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  background: $surface;
}

.chart__hero {
  @include flex(row, center, center, $sp-4);
  flex-wrap: wrap;
}

.gauge {
  flex: 0 1 220px;
  width: 100%;
  max-width: 220px;
  height: auto;
}

.gauge__track,
.gauge__fill {
  fill: none;
  stroke-width: 16;
  stroke-linecap: round;
}

.gauge__track { stroke: rgba($primary, 0.12); }

.gauge__fill {
  stroke: $primary;
  transition: stroke-dasharray 0.6s ease;

  &--ok { stroke: $alert-success; }
}

.gauge__pace line {
  stroke: $text-secondary;
  stroke-width: 2;
  stroke-dasharray: 3 2;
}

.hero {
  @include flex-col(2px);
  flex: 1 1 200px;
  min-width: 0;
  align-items: flex-start;
}

.hero__pct {
  font-size: clamp(2.2rem, 6vw, 3rem);
  font-weight: 800;
  line-height: 1;
  color: $primary-dark;

  small { font-size: 0.45em; font-weight: 700; color: $text-secondary; margin-left: 2px; }
}

.hero__money {
  font-size: $fs-sm;
  color: $text-secondary;
  strong { color: $primary-dark; font-weight: 800; }
}

.hero__count {
  @include flex(row, flex-start, center, $sp-1);
  font-size: $fs-xs;
  color: $text-secondary;
  i { color: $primary; }
}

.hero__status {
  @include flex(row, flex-start, center, $sp-1);
  flex-wrap: wrap;
  margin-top: $sp-1;
  font-size: $fs-xs;
  font-weight: 700;
  color: $primary-dark;

  &--ok, &--ok i { color: $alert-success; }
  &--warn, &--warn i { color: $alert-warning; }
}

.hero__pace { font-weight: 500; color: $text-secondary; }

// ── Barras por tipo ──
.bars { @include flex-col($sp-3); }

.bar { @include flex-col(4px); }

.bar__label {
  @include flex(row, space-between, baseline, $sp-2);
  flex-wrap: wrap;
  font-size: $fs-xs;
}

.bar__name {
  @include flex(row, flex-start, center, $sp-1);
  font-weight: 700;
  color: $primary-dark;
  i { color: $primary; }
}

.bar__nums {
  color: $text-secondary;
  strong { color: $primary-dark; font-weight: 800; }
}

.bar__track {
  position: relative;
  height: 14px;
  border-radius: $radius-full;
  background: rgba($primary, 0.12);
  overflow: visible;
}

.bar__fill {
  display: block;
  height: 100%;
  border-radius: $radius-full;
  background: $primary;
  transition: width 0.5s ease;

  &--ok { background: $alert-success; }
}

.bar__pace {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 0;
  border-left: 2px dashed $text-secondary;
  transform: translateX(-1px);
}

.bar__remaining {
  font-size: $fs-xs;
  color: $text-secondary;
}

.chart__legend {
  @include flex(row, flex-start, center, $sp-4);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;

  span { @include flex(row, flex-start, center, $sp-1); }
}

.legend {
  display: inline-block;
  width: 18px;
  height: 8px;
  border-radius: $radius-full;

  &--track { background: rgba($primary, 0.12); }
  &--fill { background: $primary; }
  &--pace { width: 0; height: 12px; border-left: 2px dashed $text-secondary; border-radius: 0; }
}
</style>
