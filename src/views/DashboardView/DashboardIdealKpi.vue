<script setup lang="ts">
import { computed } from 'vue'
import { BaseSkeleton } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { DashboardSummary } from '@/types'

const props = withDefaults(
  defineProps<{ summary?: DashboardSummary | null; loading?: boolean }>(),
  { summary: null, loading: false },
)

const { formatMoney } = useFormat()

const ideal = computed(() => Number(props.summary?.idealMonthlyAmount ?? 0))
const collected = computed(() => Number(props.summary?.collectedAmount ?? 0))

const missing = computed(() => Math.max(ideal.value - collected.value, 0))

const percent = computed(() => {
  if (ideal.value <= 0) return 0
  return Math.min(Math.round((collected.value / ideal.value) * 100), 100)
})

const goal = computed(() => props.summary?.salesGoal ?? null)
const goalPct = computed(() => Math.min(goal.value?.amountPct ?? 0, 100))

const tone = computed(() => {
  if (percent.value >= 85) return 'ok'
  if (percent.value >= 50) return 'warn'
  return 'low'
})
</script>

<template>
  <section class="ideal" aria-label="Cifra ideal mensual">
    <BaseSkeleton v-if="loading && !summary" height="188px" radius="18px" />

    <Transition v-else name="scale-pop" appear>
      <article class="ideal__card">
        <header class="ideal__head">
          <span class="ideal__icon"><i class="fa-solid fa-bullseye" aria-hidden="true" /></span>
          <div>
            <h2 class="ideal__label">Ideal mensual</h2>
            <p class="ideal__sub">Si todos los clientes activos pagan</p>
          </div>
        </header>

        <p class="ideal__value">{{ formatMoney(ideal) }}</p>

        <div class="ideal__bar" role="presentation">
          <span class="ideal__bar-fill" :class="`ideal__bar-fill--${tone}`" :style="{ width: `${percent}%` }" />
        </div>

        <div v-if="goal?.hasGoal" class="goal-strip" aria-label="Objetivo de ventas del mes">
          <div class="goal-strip__head">
            <span class="goal-strip__label">
              <i class="fa-solid fa-flag-checkered" aria-hidden="true" /> Objetivo de ventas del mes
            </span>
            <span class="goal-strip__nums">
              <strong>{{ formatMoney(goal.soldAmount) }}</strong> de {{ formatMoney(goal.targetAmount) }}
              · {{ goal.soldCount }}/{{ goal.targetCount }} clientes · <strong>{{ goal.amountPct }}%</strong>
            </span>
          </div>
          <div class="ideal__bar" role="presentation">
            <span class="ideal__bar-fill ideal__bar-fill--goal" :style="{ width: `${goalPct}%` }" />
          </div>
          <p class="goal-strip__if">
            <i class="fa-solid fa-arrow-trend-up" aria-hidden="true" />
            Si se cumple, el ideal mensual sube a <strong>{{ formatMoney(goal.idealIfMet) }}</strong>
          </p>
        </div>

        <footer class="ideal__foot">
          <div class="stat">
            <span class="stat__label">Cobrado este mes</span>
            <span class="stat__value stat__value--ok">{{ formatMoney(collected) }}</span>
          </div>
          <div class="stat">
            <span class="stat__label">Falta por cobrar</span>
            <span class="stat__value stat__value--miss">{{ formatMoney(missing) }}</span>
          </div>
          <div class="stat stat--pct">
            <span class="stat__label">Avance</span>
            <span class="stat__value" :class="`stat__value--${tone}`">{{ percent }}%</span>
          </div>
        </footer>
      </article>
    </Transition>
  </section>
</template>

<style scoped lang="scss">
.goal-strip {
  @include flex-col($sp-2);
  padding-top: $sp-3;
  border-top: 1px solid rgba(255, 255, 255, 0.25);
}

.goal-strip__head {
  @include flex(row, space-between, baseline, $sp-2);
  flex-wrap: wrap;
  font-size: $fs-xs;
  opacity: 0.95;
}

.goal-strip__label {
  @include flex(row, flex-start, center, $sp-1);
  font-weight: 700;
}

.goal-strip__nums strong { font-weight: 800; }

.goal-strip__if {
  @include flex(row, flex-start, center, $sp-1);
  font-size: $fs-xs;
  opacity: 0.9;
  strong { font-weight: 800; }
}

.ideal__bar-fill--goal { background: rgba(255, 255, 255, 0.9); }

.ideal {
  width: 100%;
  margin-bottom: $sp-4;
}

.ideal__card {
  @include flex-col($sp-4);
  @include gradient-primary;
  padding: $sp-5;
  border-radius: $radius-lg;
  color: $white;
  box-shadow: $shadow-primary;
}

.ideal__head {
  @include flex(row, flex-start, center, $sp-3);
}

.ideal__icon {
  @include flex-center;
  width: 46px;
  height: 46px;
  border-radius: $radius-md;
  background: rgba($white, 0.18);
  font-size: $fs-lg;
  flex: none;
}

.ideal__label {
  font-size: $fs-md;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.ideal__sub {
  font-size: $fs-xs;
  opacity: 0.85;
  margin-top: 2px;
}

.ideal__value {
  font-size: $fs-3xl;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.02em;

  @include md {
    font-size: 3rem;
  }
}

.ideal__bar {
  position: relative;
  height: 10px;
  border-radius: $radius-full;
  background: rgba($white, 0.22);
  overflow: hidden;
}

.ideal__bar-fill {
  display: block;
  height: 100%;
  border-radius: $radius-full;
  transition: width $transition-slow $ease-out;

  &--ok {
    background: $alert-success;
  }

  &--warn {
    background: $alert-warning;
  }

  &--low {
    background: rgba($white, 0.75);
  }
}

.ideal__foot {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
  border-top: 1px solid rgba($white, 0.22);
  padding-top: $sp-3;
}

.stat {
  @include flex-col(2px);
  flex: 1 1 140px;
  min-width: 0;

  &--pct {
    align-items: flex-end;
    text-align: right;
  }
}

.stat__label {
  font-size: $fs-xs;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  opacity: 0.8;
}

.stat__value {
  font-size: $fs-lg;
  font-weight: 800;

  &--ok {
    color: #9ff5cd;
  }

  &--miss {
    color: #ffd9a0;
  }

  &--warn {
    color: #ffd9a0;
  }

  &--low {
    color: $white;
  }
}
</style>
