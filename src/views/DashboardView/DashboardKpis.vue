<script setup lang="ts">
import { computed } from 'vue'
import { BaseSkeleton, BaseStatCard } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { DashboardSummary } from '@/types'

const props = withDefaults(
  defineProps<{ summary?: DashboardSummary | null; loading?: boolean }>(),
  { summary: null, loading: false },
)

const { formatMoney } = useFormat()

const kpis = computed(() => {
  const s = props.summary
  if (!s) return []
  const rate = Math.round(s.collectionRate ?? 0)
  return [
    {
      key: 'expected',
      label: 'Total del mes',
      value: formatMoney(s.expectedAmount),
      icon: 'fa-solid fa-file-invoice-dollar',
      tone: 'primary',
      hint: `${s.invoicesTotal} cobros`,
    },
    {
      key: 'collected',
      label: 'Cobrado',
      value: formatMoney(s.collectedAmount),
      icon: 'fa-solid fa-circle-check',
      tone: 'success',
      hint: `${rate}% · ${s.invoicesPaid} pagados`,
    },
    {
      key: 'pending',
      label: 'Por cobrar',
      value: formatMoney(s.pendingAmount),
      icon: 'fa-solid fa-hourglass-half',
      tone: 'warning',
      hint: `${s.invoicesPending} al día`,
    },
    {
      key: 'overdue',
      label: 'Vencido',
      value: formatMoney(s.overdueAmount),
      icon: 'fa-solid fa-triangle-exclamation',
      tone: s.overdueAmount > 0 ? 'danger' : 'neutral',
      hint: `${s.invoicesOverdue} en mora`,
    },
  ]
})
</script>

<template>
  <section class="kpis" aria-label="Indicadores del período">
    <template v-if="loading && !summary">
      <BaseSkeleton v-for="n in 4" :key="n" height="104px" radius="14px" class="kpis__item" />
    </template>

    <TransitionGroup v-else name="list" tag="div" class="kpis__grid">
      <BaseStatCard
        v-for="kpi in kpis"
        :key="kpi.key"
        class="kpis__item"
        :label="kpi.label"
        :value="kpi.value"
        :icon="kpi.icon"
        :tone="kpi.tone"
        :hint="kpi.hint"
      />
    </TransitionGroup>
  </section>
</template>

<style scoped lang="scss">
.kpis {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
  margin-bottom: $sp-5;
}

.kpis__grid {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
  width: 100%;
}

.kpis__item {
  flex: 1 1 calc(50% - #{$sp-3});
  min-width: 150px;

  @include md {
    flex: 1 1 calc(33.333% - #{$sp-3});
  }

  @include lg {
    flex: 1 1 calc(25% - #{$sp-3});
  }

  @include xl {
    flex: 1 1 0;
    min-width: 168px;
  }
}
</style>
