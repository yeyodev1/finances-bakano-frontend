<script setup lang="ts">
import { computed, ref } from 'vue'
import { BaseSkeleton, BaseStatCard } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { useClientsStore } from '@/stores/clients'
import { currentPeriod } from '@/stores/invoices'
import { usePeriodSummary } from '@/composables/usePeriodSummary'

const store = useClientsStore()
const { formatMoney, formatPeriod } = useFormat()

// Del ideal, cuánto ya entró este mes y cuánto falta por cobrar.
const period = ref(currentPeriod())
const { summary } = usePeriodSummary(period)

const ideal = computed(() => store.stats.idealMonthlyAmount || store.stats.expectedMonthlyAmount)

const cards = computed(() => [
  {
    key: 'ideal',
    label: 'Ideal mensual',
    value: formatMoney(ideal.value),
    icon: 'fa-solid fa-bullseye',
    color: 'primary',
    hint: 'Si todos los clientes activos pagan',
    wide: true,
  },
  {
    key: 'collected',
    label: 'Cobrado este mes',
    value: formatMoney(summary.value?.collectedAmount ?? 0),
    icon: 'fa-solid fa-circle-check',
    color: 'success',
    hint: summary.value
      ? `${summary.value.paid} de ${summary.value.total} cobros · ${formatPeriod(period.value)}`
      : formatPeriod(period.value),
    wide: true,
  },
  {
    key: 'pending',
    label: 'Por cobrar este mes',
    value: formatMoney(summary.value?.pendingAmount ?? 0),
    icon: 'fa-solid fa-hourglass-half',
    color: 'warning',
    hint: summary.value?.overdue
      ? `${summary.value.pending + summary.value.overdue} abiertos · ${summary.value.overdue} vencidos`
      : `${summary.value ? summary.value.pending : 0} cobros abiertos`,
    wide: true,
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
      <BaseSkeleton
        v-for="n in 7"
        :key="n"
        height="104px"
        :class="n <= 3 ? 'stats__wide' : 'stats__narrow'"
      />
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
        :class="card.wide ? 'stats__wide' : 'stats__narrow'"
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
    // Fila 1: montos (ideal, cobrado, por cobrar). Fila 2: conteos.
    grid-template-columns: repeat(12, minmax(0, 1fr));
    gap: $sp-4;

    .stats__wide {
      grid-column: span 4;
    }

    .stats__narrow {
      grid-column: span 3;
    }
  }

  :deep(> span) {
    display: contents;
  }
}
</style>
