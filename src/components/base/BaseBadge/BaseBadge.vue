<script setup lang="ts">
import { computed } from 'vue'
import { BADGE_LABELS, type BadgeProps } from './types'

const props = withDefaults(defineProps<BadgeProps>(), {
  variant: 'neutral',
  label: '',
  icon: '',
  dot: false,
  size: 'md',
  pulse: false,
})

const text = computed(() => props.label || BADGE_LABELS[props.variant])
</script>

<template>
  <span
    class="badge"
    :class="[`badge--${props.variant}`, `badge--${props.size}`, { 'badge--pulse': props.pulse }]"
  >
    <span v-if="props.dot" class="badge__dot" aria-hidden="true" />
    <i v-else-if="props.icon" class="badge__icon" :class="props.icon" aria-hidden="true" />
    <span class="badge__text">{{ text }}</span>
  </span>
</template>

<style scoped lang="scss">
@mixin badge-tone($color) {
  color: darken($color, 12);
  background: rgba($color, 0.13);
  border-color: rgba($color, 0.28);
  .badge__dot { background: $color; }
  &.badge--pulse .badge__dot::after { background: $color; }
}

.badge {
  @include flex-center($sp-2);
  display: inline-flex;
  border: 1px solid transparent;
  border-radius: $radius-full;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  max-width: 100%;
  transition: background $transition-base, color $transition-base, border-color $transition-base,
    transform $transition-fast;

  &:hover {
    transform: translateY(-1px);
  }
}

.badge__text {
  @include truncate;
}

.badge__icon {
  font-size: 0.9em;
  flex: none;
}

.badge__dot {
  position: relative;
  width: 7px;
  height: 7px;
  border-radius: $radius-full;
  flex: none;
}

.badge--pulse .badge__dot::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: $radius-full;
  animation: badge-ping 1.6s $ease-out infinite;
}

@keyframes badge-ping {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(2.6); opacity: 0; }
}

// ── Tamaños ──────────────────────────────────────────────────────
.badge--sm { padding: 3px $sp-2; font-size: 0.66rem; }
.badge--md { padding: 5px $sp-3; font-size: $fs-xs; }
.badge--lg { padding: 7px $sp-4; font-size: $fs-sm; }

// ── Variantes ────────────────────────────────────────────────────
.badge--paid      { @include badge-tone($status-paid); }
.badge--pending   { @include badge-tone($status-pending); }
.badge--overdue   { @include badge-tone($status-overdue); }
.badge--partial   { @include badge-tone($status-partial); }
.badge--waived    { @include badge-tone($status-waived); }
.badge--active    { @include badge-tone($BAKANO-GREEN); }
.badge--inactive  { @include badge-tone($text-secondary); }
.badge--success   { @include badge-tone($alert-success); }
.badge--warning   { @include badge-tone($alert-warning); }
.badge--danger    { @include badge-tone($alert-error); }
.badge--info      { @include badge-tone($alert-info); }
.badge--primary   { @include badge-tone($primary); }
.badge--secondary { @include badge-tone($secondary); }

.badge--cancelled {
  color: rgba($primary-dark, 0.6);
  background: rgba($primary-dark, 0.07);
  border-color: rgba($primary-dark, 0.14);
  text-decoration: line-through;
  .badge__dot { background: rgba($primary-dark, 0.45); }
}

.badge--neutral {
  color: $text-secondary;
  background: rgba($primary-dark, 0.05);
  border-color: $border-color;
  .badge__dot { background: $text-secondary; }
}
</style>
