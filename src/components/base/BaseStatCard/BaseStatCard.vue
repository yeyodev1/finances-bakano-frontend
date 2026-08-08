<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

interface Props {
  label: string
  value: string | number
  icon?: string
  /** Tono cromático: primary | secondary | success | warning | danger | info | neutral */
  variant?: string
  /** Alias de `variant`. */
  tone?: string
  /** Alias de `variant`. */
  color?: string
  hint?: string
  trend?: number | null
  trendLabel?: string
  loading?: boolean
  /** Anima el conteo del número al montar (solo si `value` es numérico). */
  animate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  icon: '',
  variant: '',
  tone: '',
  color: '',
  hint: '',
  trend: null,
  trendLabel: '',
  loading: false,
  animate: true,
})

const TONES = ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'neutral']

const tone = computed(() => {
  const raw = props.variant || props.tone || props.color || 'primary'
  return TONES.includes(raw) ? raw : 'primary'
})

// ── Animación de conteo ──────────────────────────────────────────
/** Extrae el número de un valor formateado ("$ 1.234,50" → 1234.5) conservando prefijo/sufijo. */
const parsed = computed(() => {
  if (typeof props.value === 'number') return { prefix: '', num: props.value, suffix: '', decimals: 0 }
  const text = String(props.value)
  const match = /-?[\d.,]+/.exec(text)
  if (!match) return null
  const raw = match[0]
  const normalized = raw.replace(/\./g, '').replace(',', '.')
  const num = Number(normalized)
  if (!Number.isFinite(num)) return null
  const decimals = normalized.includes('.') ? normalized.split('.')[1]?.length ?? 0 : 0
  return {
    prefix: text.slice(0, match.index),
    num,
    suffix: text.slice(match.index + raw.length),
    decimals,
  }
})

const counted = ref<number | null>(null)
let frame = 0

function runCount() {
  const target = parsed.value
  if (!props.animate || !target || props.loading || typeof window === 'undefined') {
    counted.value = null
    return
  }
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    counted.value = null
    return
  }
  const duration = 750
  const start = performance.now()
  const from = 0
  const to = target.num

  const step = (now: number) => {
    const t = Math.min(1, (now - start) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    counted.value = from + (to - from) * eased
    if (t < 1) frame = requestAnimationFrame(step)
    else counted.value = null
  }
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(step)
}

onMounted(runCount)
watch(() => props.value, runCount)

const displayValue = computed(() => {
  const target = parsed.value
  if (counted.value === null || !target) return String(props.value)
  const formatted = new Intl.NumberFormat('es-EC', {
    minimumFractionDigits: target.decimals,
    maximumFractionDigits: target.decimals,
  }).format(counted.value)
  return `${target.prefix}${formatted}${target.suffix}`
})

const trendUp = computed(() => (props.trend ?? 0) > 0)
const hasTrend = computed(() => props.trend !== null && props.trend !== undefined)
</script>

<template>
  <article class="stat" :class="[`stat--${tone}`, { 'stat--loading': props.loading }]">
    <div class="stat__top">
      <span class="stat__label">{{ props.label }}</span>
      <span v-if="props.icon" class="stat__icon"><i :class="props.icon" aria-hidden="true" /></span>
    </div>

    <div v-if="props.loading" class="stat__skeleton" aria-hidden="true">
      <span class="stat__bar stat__bar--lg" />
      <span class="stat__bar stat__bar--sm" />
    </div>

    <template v-else>
      <p class="stat__value">{{ displayValue }}</p>

      <div v-if="props.hint || hasTrend || $slots.default" class="stat__foot">
        <span
          v-if="hasTrend"
          class="stat__trend"
          :class="trendUp ? 'stat__trend--up' : 'stat__trend--down'"
        >
          <i :class="trendUp ? 'fa-solid fa-arrow-trend-up' : 'fa-solid fa-arrow-trend-down'" aria-hidden="true" />
          {{ Math.abs(props.trend ?? 0).toFixed(1).replace('.', ',') }}%
          <span v-if="props.trendLabel" class="stat__trend-label">{{ props.trendLabel }}</span>
        </span>
        <span v-if="props.hint" class="stat__hint">{{ props.hint }}</span>
        <slot />
      </div>
    </template>
  </article>
</template>

<style scoped lang="scss">
.stat {
  @include card($sp-4);
  @include card-hover;
  @include flex-col($sp-2);
  position: relative;
  overflow: hidden;
  min-width: 0;

  &::after {
    content: '';
    position: absolute;
    inset: 0 0 auto 0;
    height: 3px;
    opacity: 0.9;
    transition: height $transition-base;
  }

  &:hover::after { height: 5px; }
}

.stat__top {
  @include flex-between(flex-start, $sp-2);
}

.stat__label {
  @include label-text;
  @include truncate;
}

.stat__icon {
  @include flex-center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: $radius-sm;
  font-size: $fs-sm;
  transition: transform $transition-base;

  .stat:hover & { transform: scale(1.08) rotate(-6deg); }
}

.stat__value {
  font-size: $fs-xl;
  font-weight: 700;
  line-height: 1.1;
  color: $primary-dark;
  font-variant-numeric: tabular-nums;
  @include truncate;

  @include md { font-size: $fs-2xl; }
}

.stat__foot {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.stat__hint {
  font-size: $fs-xs;
  color: $text-secondary;
  @include truncate;
}

.stat__trend {
  @include flex-center(4px);
  font-size: $fs-xs;
  font-weight: 700;
  padding: 3px $sp-2;
  border-radius: $radius-full;

  &--up { color: $alert-success; background: rgba($alert-success, 0.12); }
  &--down { color: $alert-error; background: rgba($alert-error, 0.12); }
}

.stat__trend-label {
  font-weight: 500;
  opacity: 0.8;
}

.stat__skeleton {
  @include flex-col($sp-2);
  padding-top: $sp-1;
}

.stat__bar {
  display: block;
  height: 22px;
  border-radius: $radius-xs;
  background: linear-gradient(
    90deg,
    rgba($primary-dark, 0.06) 0%,
    rgba($primary-dark, 0.12) 40%,
    rgba($primary-dark, 0.06) 80%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s linear infinite;

  &--lg { width: 70%; }
  &--sm { width: 40%; height: 12px; }
}

// ── Tonos ────────────────────────────────────────────────────────
@mixin stat-tone($color) {
  &::after { background: $color; }
  .stat__icon { background: rgba($color, 0.12); color: $color; }
}

.stat--primary   { @include stat-tone($primary); }
.stat--secondary { @include stat-tone($secondary); }
.stat--success   { @include stat-tone($BAKANO-GREEN); }
.stat--warning   { @include stat-tone($alert-warning); }
.stat--danger    { @include stat-tone($alert-error); }
.stat--info      { @include stat-tone($alert-info); }
.stat--neutral   { @include stat-tone($text-secondary); }
</style>
