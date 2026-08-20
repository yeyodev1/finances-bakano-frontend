<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseSkeleton } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { DelinquencyReport } from '@/types'

/**
 * Mora promedio. Dos números que no se mezclan:
 *  - Hoy: los cobros vencidos ahora mismo y cuántos días llevan.
 *  - Costumbre: cuánto tardan en pagar, mirando los últimos 12 meses.
 * Debajo, los clientes que más tardan, con barra de días (un solo tono; rojo solo
 * con icono y texto cuando tienen algo vencido hoy).
 */
const props = withDefaults(
  defineProps<{ report?: DelinquencyReport | null; loading?: boolean }>(),
  { report: null, loading: false },
)

const { formatMoney } = useFormat()

const worst = computed(() => props.report?.clients.filter((c) => c.avgDays > 0).slice(0, 10) ?? [])
const maxAvg = computed(() => Math.max(1, ...worst.value.map((c) => c.avgDays)))

function days(value: number): string {
  if (value === 0) return '0 días'
  if (value === 1) return '1 día'
  return `${Number.isInteger(value) ? value : value.toFixed(1)} días`
}

function toneFor(avg: number): string {
  if (avg <= 3) return 'success'
  if (avg <= 10) return 'warning'
  return 'danger'
}
</script>

<template>
  <section class="mora" aria-labelledby="mora-title">
    <header class="mora__head">
      <h2 id="mora-title" class="mora__title">
        <i class="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Mora promedio
      </h2>
      <p class="mora__sub">Cuántos días tardan los clientes en pagar después del vencimiento</p>
    </header>

    <div v-if="loading && !report" class="mora__skeleton">
      <BaseSkeleton height="96px" />
      <BaseSkeleton height="160px" />
    </div>

    <template v-else-if="report">
      <div class="tiles">
        <div class="tile" :class="`tile--${report.current.invoices ? toneFor(report.current.avgDays) : 'neutral'}`">
          <span class="tile__label"><i class="fa-solid fa-calendar-day" aria-hidden="true" /> Vencido hoy</span>
          <span class="tile__value">{{ days(report.current.avgDays) }}</span>
          <span class="tile__hint">
            de atraso promedio · {{ report.current.invoices }} cobro(s) de {{ report.current.clients }} cliente(s)
            · {{ formatMoney(report.current.amount) }}
          </span>
          <span v-if="report.current.invoices" class="tile__hint">
            Mediana {{ days(report.current.medianDays) }} · el peor lleva {{ days(report.current.maxDays) }}
          </span>
        </div>

        <div class="tile" :class="`tile--${report.historical.invoices ? toneFor(report.historical.avgDays) : 'neutral'}`">
          <span class="tile__label"><i class="fa-solid fa-chart-line" aria-hidden="true" /> Costumbre ({{ report.months }} meses)</span>
          <span class="tile__value">{{ days(report.historical.avgDays) }}</span>
          <span class="tile__hint">
            de atraso promedio en {{ report.historical.invoices }} cobro(s) pagados
          </span>
          <span class="tile__hint">
            {{ report.historical.latePct }}% pagó tarde · cuando tardan, tardan {{ days(report.historical.avgDaysWhenLate) }}
          </span>
        </div>

        <div class="tile tile--neutral">
          <span class="tile__label"><i class="fa-solid fa-users" aria-hidden="true" /> Por cliente</span>
          <span class="tile__value">{{ days(report.perClientAvgDays) }}</span>
          <span class="tile__hint">
            promedio entre los {{ report.clientsWithDelay }} cliente(s) que alguna vez se atrasaron
            (de {{ report.clientsTotal }} con cobros)
          </span>
        </div>
      </div>

      <div v-if="worst.length" class="worst">
        <h3 class="worst__title">
          <i class="fa-solid fa-ranking-star" aria-hidden="true" /> Los que más tardan
        </h3>
        <ul class="worst__list">
          <li v-for="c in worst" :key="c.clientId" class="row">
            <div class="row__head">
              <RouterLink :to="`/clientes/${c.clientId}`" class="row__name">{{ c.clientName }}</RouterLink>
              <span class="row__days">{{ days(c.avgDays) }}</span>
            </div>
            <div class="row__track" role="progressbar" :aria-valuenow="c.avgDays" aria-valuemin="0" :aria-valuemax="maxAvg" :aria-label="`${c.clientName}: ${days(c.avgDays)} de atraso promedio`">
              <span class="row__fill" :style="{ width: `${(c.avgDays / maxAvg) * 100}%` }" />
            </div>
            <p class="row__meta">
              {{ c.latePct }}% de sus {{ c.invoices }} cobro(s) fuera de fecha · peor: {{ days(c.maxDays) }}
              <BaseBadge v-if="c.openOverdue" variant="danger" icon="fa-solid fa-triangle-exclamation" size="sm">
                {{ c.openOverdue }} vencido(s) hoy · {{ formatMoney(c.openOverdueAmount) }}
              </BaseBadge>
            </p>
          </li>
        </ul>
      </div>

      <p v-else class="mora__empty">
        <i class="fa-solid fa-circle-check" aria-hidden="true" /> Nadie se ha atrasado en el período. 
      </p>
    </template>
  </section>
</template>

<style scoped lang="scss">
.mora {
  @include card($sp-5);
  @include flex-col($sp-4);
  margin-bottom: $sp-5;
}

.mora__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;
  i { color: $primary; }
}

.mora__sub { font-size: $fs-xs; color: $text-secondary; margin-top: 2px; }

.mora__skeleton { @include flex-col($sp-2); }

.mora__empty {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $alert-success;
  font-weight: 700;
}

.tiles {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
}

.tile {
  @include flex-col(4px);
  flex: 1 1 220px;
  min-width: 0;
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  border-left-width: 4px;

  &--success { border-left-color: $alert-success; }
  &--warning { border-left-color: $alert-warning; }
  &--danger { border-left-color: $alert-error; }
  &--neutral { border-left-color: $primary; }
}

.tile__label {
  @include flex(row, flex-start, center, $sp-1);
  font-size: $fs-xs;
  font-weight: 700;
  color: $text-secondary;
  i { color: $primary; }
}

.tile__value {
  font-size: clamp(1.6rem, 4vw, 2.1rem);
  font-weight: 800;
  line-height: 1.1;
  color: $primary-dark;
}

.tile__hint { font-size: $fs-xs; color: $text-secondary; line-height: 1.45; }

.worst { @include flex-col($sp-3); }

.worst__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-sm;
  font-weight: 800;
  color: $primary-dark;
  i { color: $primary; }
}

.worst__list { @include flex-col($sp-3); }

.row { @include flex-col(4px); }

.row__head {
  @include flex(row, space-between, baseline, $sp-2);
  font-size: $fs-xs;
}

.row__name {
  font-weight: 700;
  color: $primary-dark;
  text-decoration: none;
  @include truncate;
  &:hover { color: $primary; }
}

.row__days { flex: none; font-weight: 800; color: $primary-dark; }

.row__track {
  height: 10px;
  border-radius: $radius-full;
  background: rgba($primary, 0.12);
  overflow: hidden;
}

.row__fill {
  display: block;
  height: 100%;
  border-radius: $radius-full;
  background: $primary;
  transition: width 0.5s ease;
}

.row__meta {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;
}
</style>
