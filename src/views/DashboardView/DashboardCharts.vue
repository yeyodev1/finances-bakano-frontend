<script setup lang="ts">
import { BaseCard, BaseSkeleton } from '@/components/base'
import {
  AgingChart,
  MethodBarChart,
  RevenueLineChart,
  StatusDonutChart,
  TopClientsBarChart,
} from '@/components/charts'
import type { AgingBucket, BreakdownItem, RevenuePoint } from '@/types'

withDefaults(
  defineProps<{
    revenue?: RevenuePoint[]
    statusBreakdown?: BreakdownItem[]
    methodBreakdown?: BreakdownItem[]
    topClients?: BreakdownItem[]
    aging?: AgingBucket[]
    loading?: boolean
  }>(),
  {
    revenue: () => [],
    statusBreakdown: () => [],
    methodBreakdown: () => [],
    topClients: () => [],
    aging: () => [],
    loading: false,
  },
)
</script>

<template>
  <section class="charts" aria-label="Gráficos">
    <template v-if="loading">
      <BaseSkeleton v-for="n in 4" :key="n" height="320px" radius="14px" class="charts__cell" />
    </template>

    <template v-else>
      <BaseCard class="charts__cell charts__cell--wide">
        <template #header>
          <div class="charts__head">
            <h2>Facturado vs cobrado</h2>
            <span>Últimos 12 meses</span>
          </div>
        </template>
        <RevenueLineChart :points="revenue" :height="300" />
      </BaseCard>

      <BaseCard class="charts__cell">
        <template #header>
          <div class="charts__head">
            <h2>Estado de los cobros</h2>
            <span>Período seleccionado</span>
          </div>
        </template>
        <StatusDonutChart :items="statusBreakdown" :height="220" />
      </BaseCard>

      <BaseCard class="charts__cell">
        <template #header>
          <div class="charts__head">
            <h2>Mora por antigüedad</h2>
            <span>Facturas vencidas</span>
          </div>
        </template>
        <AgingChart :buckets="aging" :height="230" />
      </BaseCard>

      <BaseCard class="charts__cell">
        <template #header>
          <div class="charts__head">
            <h2>Métodos de pago</h2>
            <span>Cómo te pagan</span>
          </div>
        </template>
        <MethodBarChart :items="methodBreakdown" :height="260" />
      </BaseCard>

      <BaseCard class="charts__cell">
        <template #header>
          <div class="charts__head">
            <h2>Top 10 clientes</h2>
            <span>Por monto facturado</span>
          </div>
        </template>
        <TopClientsBarChart :items="topClients" :height="280" />
      </BaseCard>
    </template>
  </section>
</template>

<style scoped lang="scss">
.charts {
  @include flex(row, flex-start, stretch, $sp-4);
  flex-wrap: wrap;
  margin-bottom: $sp-5;
}

.charts__cell {
  flex: 1 1 100%;
  min-width: 0;

  @include lg {
    flex: 1 1 calc(50% - #{$sp-4});
  }

  &--wide {
    @include lg {
      flex: 1 1 100%;
    }
  }
}

.charts__head {
  @include flex-between(baseline, $sp-3);
  width: 100%;

  h2 {
    font-size: $fs-md;
    font-weight: 800;
    margin: 0;
  }

  span {
    @include label-text;
    font-size: 0.64rem;
    white-space: nowrap;
  }
}
</style>
