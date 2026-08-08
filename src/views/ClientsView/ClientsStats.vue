<script setup lang="ts">
import { computed } from 'vue'
import { BaseSkeleton, BaseStatCard } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { useClientsStore } from '@/stores/clients'

const store = useClientsStore()
const { formatMoney } = useFormat()

const ideal = computed(() => store.stats.idealMonthlyAmount || store.stats.expectedMonthlyAmount)

const cards = computed(() => [
  {
    key: 'ideal',
    label: 'Ideal mensual',
    value: formatMoney(ideal.value),
    icon: 'fa-solid fa-bullseye',
    color: 'primary',
    hint: 'Si todos los clientes activos pagan',
  },
  {
    key: 'total',
    label: 'Clientes',
    value: String(store.stats.totalClients),
    icon: 'fa-solid fa-users',
    color: 'secondary',
    hint: `${store.stats.inactiveClients} inactivos`,
  },
  {
    key: 'active',
    label: 'Activos',
    value: String(store.stats.activeClients),
    icon: 'fa-solid fa-circle-check',
    color: 'success',
    hint: 'Cobrando este mes',
  },
  {
    key: 'archived',
    label: 'Dados de baja',
    value: String(store.stats.archivedClients),
    icon: 'fa-solid fa-box-archive',
    color: store.stats.archivedClients > 0 ? 'danger' : 'neutral',
    hint: 'Historial conservado',
  },
  {
    key: 'workspaces',
    label: 'Con espacio vinculado',
    value: String(store.stats.linkedWorkspaces),
    icon: 'fa-solid fa-layer-group',
    color: 'info',
    hint: `${Math.max(store.stats.totalClients - store.stats.linkedWorkspaces, 0)} sin vincular`,
  },
])
</script>

<template>
  <section class="stats">
    <template v-if="store.loading && !store.stats.totalClients">
      <BaseSkeleton v-for="n in 5" :key="n" height="104px" />
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
.stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-3;

  @include lg {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: $sp-4;
  }

  :deep(> span) {
    display: contents;
  }
}
</style>
