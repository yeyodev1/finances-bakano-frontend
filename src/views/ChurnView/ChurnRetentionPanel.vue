<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BaseButton, BaseSkeleton } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { GuaranteeSummary, RefundSummary } from '@/types'

/**
 * Antes de la baja está el intento de salvarla. Este panel cuelga del reporte de
 * bajas para que el costo de retener y el de devolver se lean junto al churn, no
 * en otra pantalla.
 */
const props = withDefaults(
  defineProps<{
    guarantees?: GuaranteeSummary | null
    refunds?: RefundSummary | null
    loading?: boolean
  }>(),
  { guarantees: null, refunds: null, loading: false },
)

const router = useRouter()
const { formatMoney } = useFormat()

const hasData = computed(
  () => (props.guarantees?.open ?? 0) > 0 || (props.refunds?.count ?? 0) > 0,
)

const stats = computed(() => {
  const g = props.guarantees
  const r = props.refunds
  return [
    {
      key: 'open',
      icon: 'fa-solid fa-shield-halved',
      tone: 'info',
      label: 'Garantías en curso',
      value: String(g?.open ?? 0),
      hint: `${formatMoney(g?.waivedMonthly ?? 0)} sin cobrar este mes`,
    },
    {
      key: 'recovered',
      icon: 'fa-solid fa-heart-pulse',
      tone: 'success',
      label: 'Recuperados',
      value: String(g?.recovered ?? 0),
      hint: `${g?.recoveryRate ?? 0}% de las garantías cerradas`,
    },
    {
      key: 'failed',
      icon: 'fa-solid fa-heart-crack',
      tone: 'danger',
      label: 'Fracasos',
      value: String(g?.failed ?? 0),
      hint: 'Se agotaron los dos meses sin resultados',
    },
    {
      key: 'refunds',
      icon: 'fa-solid fa-rotate-left',
      tone: 'warning',
      label: 'Devuelto',
      value: formatMoney(r?.amount ?? 0),
      hint: `${r?.archivedClients ?? 0} baja(s) con reembolso`,
    },
  ]
})

function goToRetention() {
  router.push({ name: 'Retention' })
}
</script>

<template>
  <section class="retention">
    <header class="retention__head">
      <h2><i class="fa-solid fa-shield-halved" aria-hidden="true" /> Antes de la baja</h2>
      <BaseButton
        size="sm"
        variant="ghost"
        icon-right="fa-solid fa-arrow-right"
        @click="goToRetention"
      >
        Garantías y reembolsos
      </BaseButton>
    </header>

    <div v-if="loading && !guarantees" class="retention__skeleton">
      <BaseSkeleton v-for="n in 4" :key="n" height="72px" />
    </div>

    <template v-else>
      <ul class="retention__list">
        <li v-for="stat in stats" :key="stat.key" class="stat" :class="`stat--${stat.tone}`">
          <i class="stat__icon" :class="stat.icon" aria-hidden="true" />
          <div class="stat__body">
            <span class="stat__value">{{ stat.value }}</span>
            <span class="stat__label">{{ stat.label }}</span>
            <span class="stat__hint">{{ stat.hint }}</span>
          </div>
        </li>
      </ul>

      <p v-if="!hasData" class="retention__empty">
        Todavía no hay garantías ni reembolsos registrados. Cuando un cliente no vea resultados,
        ábrele el mes de garantía en vez de perderlo.
      </p>
    </template>
  </section>
</template>

<style scoped lang="scss">
.retention {
  @include card($sp-5);
  @include flex-col($sp-4);
}

.retention__head {
  @include flex-between(center, $sp-3);
  flex-wrap: wrap;

  h2 {
    @include flex(row, flex-start, center, $sp-2);
    font-size: $fs-md;
    font-weight: 800;
    color: $primary-dark;

    i {
      color: $primary;
    }
  }
}

.retention__skeleton,
.retention__list {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
  list-style: none;
  padding: 0;
  margin: 0;

  > * {
    flex: 1 1 190px;
    min-width: 0;
  }
}

.stat {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-3;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  background: $surface;
}

.stat__icon {
  font-size: $fs-md;
  flex: none;
  width: 24px;
  text-align: center;
}

.stat__body {
  @include flex-col(1px);
  min-width: 0;
}

.stat__value {
  font-size: $fs-lg;
  font-weight: 800;
  color: $primary-dark;
  line-height: 1.1;
}

.stat__label {
  font-size: $fs-xs;
  font-weight: 700;
  color: $primary-dark;
}

.stat__hint {
  @include truncate(2);
  font-size: $fs-xs;
  color: $text-secondary;
}

@each $name, $color in (info: $alert-info, success: $alert-success, danger: $alert-error, warning: $alert-warning) {
  .stat--#{$name} {
    border-color: rgba($color, 0.25);
    background: rgba($color, 0.06);

    .stat__icon {
      color: $color;
    }
  }
}

.retention__empty {
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;
}
</style>
