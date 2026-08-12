<script setup lang="ts">
import { computed } from 'vue'
import { BaseEmptyState, BaseSkeleton } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { BankCounterparty } from '@/types'

const props = withDefaults(
  defineProps<{
    items?: BankCounterparty[]
    loading?: boolean
  }>(),
  { items: () => [], loading: false },
)

const { formatMoney, formatDateShort, initials } = useFormat()

/** El ancho de barra es relativo al mayor movimiento del período. */
const max = computed(() =>
  Math.max(1, ...props.items.map((item) => item.outflow + item.inflow)),
)
</script>

<template>
  <div class="bcp">
    <div v-if="props.loading" class="bcp__list">
      <BaseSkeleton v-for="n in 5" :key="n" height="46px" />
    </div>

    <BaseEmptyState
      v-else-if="!props.items.length"
      icon="fa-solid fa-handshake"
      title="Sin contrapartes"
      message="No hay movimientos en la ventana analizada."
    />

    <ul v-else class="bcp__list">
      <li v-for="item in props.items" :key="item.name" class="bcp__item">
        <span class="bcp__avatar">{{ initials(item.name) }}</span>

        <div class="bcp__body">
          <div class="bcp__line">
            <strong>{{ item.name }}</strong>
            <span class="bcp__amount">{{ formatMoney(item.outflow || item.inflow) }}</span>
          </div>

          <div class="bcp__bar">
            <span
              class="bcp__fill"
              :class="item.outflow >= item.inflow ? 'bcp__fill--out' : 'bcp__fill--in'"
              :style="{ width: `${Math.round(((item.outflow + item.inflow) / max) * 100)}%` }"
            />
          </div>

          <small>
            {{ item.count }} movimientos · último {{ formatDateShort(item.lastAt) }}
          </small>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
.bcp__list {
  @include flex-col($sp-3);
  list-style: none;
}

.bcp__item {
  @include flex(row, flex-start, center, $sp-3);
}

.bcp__avatar {
  @include flex-center;
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: $radius-full;
  background: rgba($secondary, 0.12);
  color: $secondary;
  font-size: $fs-xs;
  font-weight: 700;
}

.bcp__body {
  flex: 1;
  min-width: 0;
  @include flex-col($sp-1);
}

.bcp__line {
  @include flex-between(center, $sp-3);

  strong {
    font-size: $fs-xs;
    font-weight: 600;
    color: $primary-dark;
    @include truncate;
  }
}

.bcp__amount {
  font-size: $fs-xs;
  font-weight: 700;
  color: $primary-dark;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.bcp__bar {
  height: 5px;
  border-radius: $radius-full;
  background: rgba($primary-dark, 0.06);
  overflow: hidden;
}

.bcp__fill {
  display: block;
  height: 100%;
  border-radius: $radius-full;
  transition: width 0.5s $ease-out;

  &--out {
    background: $primary;
  }

  &--in {
    background: $alert-success;
  }
}

small {
  font-size: 0.68rem;
  color: $text-secondary;
}
</style>
