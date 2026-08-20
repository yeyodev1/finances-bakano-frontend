<script setup lang="ts">
import { computed } from 'vue'
import { BaseSkeleton, BaseStatCard } from '@/components/base'
import DashboardIdealKpi from './DashboardIdealKpi.vue'
import { useFormat } from '@/composables/useFormat'
import type { DashboardSummary, DelinquencyReport } from '@/types'

const props = withDefaults(
  defineProps<{
    summary?: DashboardSummary | null
    delinquency?: DelinquencyReport | null
    loading?: boolean
  }>(),
  { summary: null, delinquency: null, loading: false },
)

const { formatMoney } = useFormat()

interface Kpi {
  key: string
  label: string
  value: string
  icon: string
  tone: string
  hint?: string
}

/** El backend puede no exponer todavía los contadores de acceso: son opcionales. */
type SummaryWithAccess = DashboardSummary & {
  shouldBeClosedCount?: number
  accessOverridesCount?: number
}

const kpis = computed<Kpi[]>(() => {
  const s = props.summary as SummaryWithAccess | null
  if (!s) return []

  const rate = Math.round((s.collectionRate ?? 0) * (s.collectionRate <= 1 ? 100 : 1))

  const accessKpis: Kpi[] = []

  if (typeof s.shouldBeClosedCount === 'number') {
    accessKpis.push({
      key: 'should-be-closed',
      label: 'Deberían estar cerrados',
      value: String(s.shouldBeClosedCount),
      icon: 'fa-solid fa-triangle-exclamation',
      tone: s.shouldBeClosedCount > 0 ? 'danger' : 'neutral',
      hint: 'Mora por encima de la gracia',
    })
  }

  if (typeof s.accessOverridesCount === 'number') {
    accessKpis.push({
      key: 'access-overrides',
      label: 'Accesos por excepción',
      value: String(s.accessOverridesCount),
      icon: 'fa-solid fa-unlock-keyhole',
      tone: s.accessOverridesCount > 0 ? 'warning' : 'neutral',
      hint: 'Abiertos a propósito',
    })
  }

  return [
    {
      key: 'expected',
      label: 'Facturado',
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
      hint: `${s.invoicesPaid} pagados`,
    },
    {
      key: 'pending',
      label: 'Pendiente',
      value: formatMoney(s.pendingAmount),
      icon: 'fa-solid fa-hourglass-half',
      tone: 'warning',
      hint: `${s.invoicesPending} por cobrar`,
    },
    {
      key: 'overdue',
      label: 'Vencido',
      value: formatMoney(s.overdueAmount),
      icon: 'fa-solid fa-triangle-exclamation',
      tone: 'danger',
      hint: `${s.invoicesOverdue} en mora`,
    },
    {
      key: 'rate',
      label: '% de cobranza',
      value: `${rate}%`,
      icon: 'fa-solid fa-gauge-high',
      tone: rate >= 80 ? 'success' : rate >= 50 ? 'warning' : 'danger',
      hint: 'Del total facturado',
    },
    {
      key: 'clients',
      label: 'Clientes activos',
      value: String(s.clientsActive),
      icon: 'fa-solid fa-users',
      tone: 'info',
      hint: `${s.clientsTotal} en total`,
    },
    {
      key: 'workspaces',
      label: 'Espacios desactivados',
      value: String(s.workspacesDeactivated),
      icon: 'fa-solid fa-layer-group',
      tone: s.workspacesDeactivated > 0 ? 'danger' : 'neutral',
      hint: 'Por falta de pago',
    },
    {
      key: 'archived',
      label: 'Clientes de baja',
      value: String(s.archivedClients ?? 0),
      icon: 'fa-solid fa-user-slash',
      tone: (s.archivedClients ?? 0) > 0 ? 'warning' : 'neutral',
      hint: 'Historial conservado',
    },
    ...accessKpis,
    ...moraKpi.value,
  ]
})

/** Mora promedio de los vencidos hoy. Sin vencidos, 0 y en verde. */
const moraKpi = computed<Kpi[]>(() => {
  const d = props.delinquency
  if (!d) return []
  const avg = d.current.avgDays
  const label = avg === 1 ? '1 día' : `${Number.isInteger(avg) ? avg : avg.toFixed(1)} días`
  return [
    {
      key: 'mora',
      label: 'Mora promedio',
      value: label,
      icon: 'fa-solid fa-clock-rotate-left',
      tone: !d.current.invoices ? 'success' : avg <= 3 ? 'success' : avg <= 10 ? 'warning' : 'danger',
      hint: d.current.invoices
        ? `${d.current.invoices} vencido(s) · costumbre ${d.historical.avgDays} días`
        : `Nada vencido · costumbre ${d.historical.avgDays} días`,
    },
  ]
})
</script>

<template>
  <DashboardIdealKpi :summary="summary" :loading="loading" />

  <section class="kpis" aria-label="Indicadores del período">
    <template v-if="loading && !summary">
      <BaseSkeleton v-for="n in 8" :key="n" height="104px" radius="14px" class="kpis__item" />
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
