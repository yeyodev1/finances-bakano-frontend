<script setup lang="ts">
import { computed } from 'vue'
import { BaseSkeleton, BaseStatCard } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { lifetimeLabel } from '@/config/archiveReasons'
import type { ChurnReport } from '@/types'

const props = withDefaults(
  defineProps<{ totals?: ChurnReport['totals'] | null; loading?: boolean }>(),
  { totals: null, loading: false },
)

const { formatMoney } = useFormat()

const cards = computed(() => {
  const t = props.totals
  const avgDays = Math.round(Number(t?.avgLifetimeDays ?? 0))

  return [
    {
      key: 'clients',
      label: 'Clientes dados de baja',
      value: String(t?.archivedClients ?? 0),
      icon: 'fa-solid fa-user-slash',
      tone: 'danger',
      hint: 'Historial conservado',
    },
    {
      key: 'lost',
      label: 'Monto mensual perdido',
      value: formatMoney(t?.lostMonthlyAmount ?? 0),
      icon: 'fa-solid fa-arrow-trend-down',
      tone: 'warning',
      hint: 'Deja de entrar cada mes',
    },
    {
      key: 'lifetime',
      label: 'Duración promedio',
      value: avgDays ? lifetimeLabel(avgDays).split(' (')[0] ?? `${avgDays} días` : '—',
      icon: 'fa-solid fa-hourglass-half',
      tone: 'info',
      hint: `${avgDays} días en promedio`,
    },
    {
      key: 'revenue',
      label: 'Ingresos históricos',
      value: formatMoney(t?.totalLifetimeRevenue ?? 0),
      icon: 'fa-solid fa-sack-dollar',
      tone: 'success',
      hint: 'Cobrado a clientes archivados',
    },
  ]
})
</script>

<template>
  <section class="churn-kpis">
    <template v-if="loading && !totals">
      <BaseSkeleton v-for="n in 4" :key="n" height="104px" radius="14px" />
    </template>

    <TransitionGroup v-else name="fade-slide">
      <BaseStatCard
        v-for="card in cards"
        :key="card.key"
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
        :tone="card.tone"
        :hint="card.hint"
      />
    </TransitionGroup>
  </section>
</template>

<style scoped lang="scss">
.churn-kpis {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-3;

  @include lg {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: $sp-4;
  }

  :deep(> span) {
    display: contents;
  }
}
</style>
