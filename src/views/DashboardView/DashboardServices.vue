<script setup lang="ts">
import { BaseSkeleton } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { SERVICE_ICONS, serviceLabel } from '@/stores/clients'
import type { DashboardSummary } from '@/types'

defineProps<{ summary: DashboardSummary | null; loading: boolean }>()

const { formatMoney } = useFormat()

function pct(collected: number, expected: number): number {
  return expected > 0 ? Math.min(Math.round((collected / expected) * 100), 100) : 0
}
</script>

<template>
  <section class="services" aria-label="Cobros del mes por servicio">
    <h2 class="services__title">Por servicio</h2>

    <BaseSkeleton v-if="loading && !summary" height="160px" radius="14px" />

    <p v-else-if="!summary?.byService?.length" class="services__empty">Sin cobros este mes.</p>

    <ul v-else class="services__list">
      <li
        v-for="row in summary.byService"
        :key="row.service ?? 'none'"
        class="services__row"
        :class="{ 'services__row--missing': !row.service }"
      >
        <i :class="row.service ? SERVICE_ICONS[row.service] : 'fa-solid fa-circle-question'" aria-hidden="true" />
        <div class="services__name">
          <strong>{{ serviceLabel(row.service) }}</strong>
          <span>{{ row.clients }} cliente{{ row.clients === 1 ? '' : 's' }}</span>
        </div>
        <div class="services__bar" role="progressbar" :aria-valuenow="pct(row.collected, row.expected)" aria-valuemin="0" aria-valuemax="100">
          <span :style="{ width: `${pct(row.collected, row.expected)}%` }" />
        </div>
        <div class="services__amount">
          <strong>{{ formatMoney(row.collected) }}</strong>
          <span>de {{ formatMoney(row.expected) }}</span>
        </div>
      </li>
    </ul>

    <RouterLink
      v-if="summary?.byService?.some((r) => !r.service)"
      :to="{ name: 'Clients', query: { service: 'none' } }"
      class="services__fix"
    >
      Ponerle servicio a los que faltan <i class="fa-solid fa-arrow-right" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<style scoped lang="scss">
.services {
  @include flex-col($sp-3);
  margin-bottom: $sp-5;
}

.services__title {
  font-size: $fs-md;
  font-weight: 700;
  margin: 0;
}

.services__empty {
  color: $text-secondary;
  font-size: $fs-sm;
}

.services__list {
  @include flex-col(0);
  list-style: none;
  margin: 0;
  padding: 0;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  overflow: hidden;
}

.services__row {
  display: grid;
  grid-template-columns: 20px minmax(0, 1fr) auto;
  align-items: center;
  gap: $sp-2 $sp-3;
  padding: $sp-3 $sp-4;

  & + & {
    border-top: 1px solid $border-color;
  }

  @include md {
    grid-template-columns: 20px minmax(0, 1fr) 160px auto;
  }

  > i {
    color: $text-secondary;
  }

  &--missing > i,
  &--missing strong {
    color: $alert-warning;
  }
}

.services__name,
.services__amount {
  @include flex-col(2px);
  min-width: 0;

  span {
    font-size: $fs-xs;
    color: $text-secondary;
  }
}

.services__amount {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.services__bar {
  display: none;
  height: 6px;
  border-radius: 999px;
  background: $border-color;
  overflow: hidden;

  @include md {
    display: block;
  }

  span {
    display: block;
    height: 100%;
    background: $alert-success;
  }
}

.services__fix {
  align-self: flex-start;
  font-size: $fs-sm;
  font-weight: 600;
  color: $alert-warning;
}
</style>
