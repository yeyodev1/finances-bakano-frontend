<script setup lang="ts">
import { computed } from 'vue'
import { BaseSkeleton, BaseStatCard } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { GuaranteeSummary, RefundSummary } from '@/types'

const props = withDefaults(
  defineProps<{
    guarantees?: GuaranteeSummary | null
    refunds?: RefundSummary | null
    loading?: boolean
  }>(),
  { guarantees: null, refunds: null, loading: false },
)

const { formatMoney } = useFormat()

const cards = computed(() => {
  const g = props.guarantees
  const r = props.refunds
  const open = g?.open ?? 0
  const closed = (g?.recovered ?? 0) + (g?.failed ?? 0)

  return [
    {
      key: 'open',
      label: 'Garantías en curso',
      value: String(open),
      icon: 'fa-solid fa-shield-halved',
      tone: open ? 'warning' : 'neutral',
      hint: `${g?.firstMonth ?? 0} en el primer mes · ${g?.secondMonth ?? 0} en el segundo`,
    },
    {
      key: 'waived',
      label: 'Sin cobrar este mes',
      value: formatMoney(g?.waivedMonthly ?? 0),
      icon: 'fa-solid fa-gift',
      tone: 'info',
      hint: `${formatMoney(g?.waivedTotal ?? 0)} regalados en total`,
    },
    {
      key: 'recovery',
      label: 'Clientes recuperados',
      value: closed ? `${g?.recoveryRate ?? 0}%` : '—',
      icon: 'fa-solid fa-heart-pulse',
      tone: (g?.recoveryRate ?? 0) >= 50 ? 'success' : 'danger',
      hint: closed
        ? `${g?.recovered ?? 0} recuperados y ${g?.failed ?? 0} fracasos`
        : 'Todavía no cerró ninguna garantía',
    },
    {
      key: 'refunds',
      label: 'Devuelto',
      value: formatMoney(r?.amount ?? 0),
      icon: 'fa-solid fa-rotate-left',
      tone: (r?.amount ?? 0) > 0 ? 'danger' : 'neutral',
      hint: `${r?.count ?? 0} reembolso(s) · ${formatMoney(r?.monthAmount ?? 0)} este mes`,
    },
  ]
})
</script>

<template>
  <section class="ret-kpis">
    <template v-if="loading && !guarantees">
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
.ret-kpis {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;

  @include lg {
    gap: $sp-4;
  }

  // Las tarjetas bajan de fila solas: nunca se declara una rejilla por breakpoint.
  :deep(> *) {
    flex: 1 1 210px;
    min-width: 0;
  }

  :deep(> span) {
    display: contents;
  }
}
</style>
