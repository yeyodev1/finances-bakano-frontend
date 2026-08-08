<script setup lang="ts">
import { computed } from 'vue'
import { BaseSkeleton, BaseStatCard } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { useInvoicesStore } from '@/stores/invoices'

const store = useInvoicesStore()
const { formatMoney, formatPercent } = useFormat()

const cards = computed(() => [
  {
    key: 'expected',
    label: 'Esperado',
    value: formatMoney(store.summary.expectedAmount),
    icon: 'fa-solid fa-bullseye',
    color: 'primary',
    hint: `${store.summary.total} cobros`,
  },
  {
    key: 'collected',
    label: 'Cobrado',
    value: formatMoney(store.summary.collectedAmount),
    icon: 'fa-solid fa-circle-check',
    color: 'success',
    hint: `${store.summary.paid} pagados`,
  },
  {
    key: 'pending',
    label: 'Pendiente',
    value: formatMoney(store.summary.pendingAmount),
    icon: 'fa-solid fa-hourglass-half',
    color: 'warning',
    hint: `${store.summary.pending} por cobrar`,
  },
  {
    key: 'overdue',
    label: 'Vencidos',
    value: String(store.summary.overdue),
    icon: 'fa-solid fa-triangle-exclamation',
    color: 'danger',
    hint: `Cobrado ${formatPercent(store.summary.collectionRate)}`,
  },
])
</script>

<template>
  <section class="summary">
    <template v-if="store.loading && !store.summary.total">
      <BaseSkeleton v-for="n in 4" :key="n" height="104px" />
    </template>

    <TransitionGroup v-else name="fade-slide">
      <BaseStatCard
        v-for="card in cards"
        :key="card.key"
        :label="card.label"
        :value="card.value"
        :icon="card.icon"
        :color="card.color"
        :hint="card.hint"
      />
    </TransitionGroup>
  </section>
</template>

<style scoped lang="scss">
.summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-3;

  @include lg {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: $sp-4;
  }
}
</style>
