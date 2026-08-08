<script setup lang="ts">
import { computed, ref } from 'vue'
import type { ButtonProps } from './types'

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'primary',
  size: 'md',
  icon: '',
  iconRight: '',
  loading: false,
  disabled: false,
  block: false,
  type: 'button',
  ripple: true,
  rounded: false,
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

interface Ripple { id: number; x: number; y: number; size: number }
const ripples = ref<Ripple[]>([])
let rippleSeq = 0

const isDisabled = computed(() => props.disabled || props.loading)

function onClick(event: MouseEvent) {
  if (isDisabled.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }
  if (props.ripple) spawnRipple(event)
  emit('click', event)
}

function spawnRipple(event: MouseEvent) {
  const el = event.currentTarget as HTMLElement | null
  if (!el) return
  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height) * 2
  const id = ++rippleSeq
  ripples.value.push({
    id,
    x: event.clientX - rect.left - size / 2,
    y: event.clientY - rect.top - size / 2,
    size,
  })
  setTimeout(() => {
    ripples.value = ripples.value.filter((r) => r.id !== id)
  }, 600)
}
</script>

<template>
  <button
    class="btn"
    :class="[
      `btn--${props.variant}`,
      `btn--${props.size}`,
      { 'btn--block': props.block, 'btn--loading': props.loading, 'btn--rounded': props.rounded },
    ]"
    :type="props.type"
    :disabled="isDisabled"
    :aria-busy="props.loading || undefined"
    @click="onClick"
  >
    <span v-if="props.ripple" class="btn__ripples" aria-hidden="true">
      <span
        v-for="r in ripples"
        :key="r.id"
        class="btn__ripple"
        :style="{ left: `${r.x}px`, top: `${r.y}px`, width: `${r.size}px`, height: `${r.size}px` }"
      />
    </span>

    <Transition name="fade">
      <span v-if="props.loading" class="btn__spinner" aria-hidden="true" />
    </Transition>

    <i v-if="props.icon && !props.loading" class="btn__icon" :class="props.icon" aria-hidden="true" />

    <span class="btn__label"><slot /></span>

    <i v-if="props.iconRight" class="btn__icon btn__icon--right" :class="props.iconRight" aria-hidden="true" />
  </button>
</template>

<style scoped lang="scss">
.btn {
  position: relative;
  overflow: hidden;
  @include flex-center($sp-2);
  @include pressable;
  border-radius: $radius-sm;
  font-weight: 600;
  font-size: $fs-sm;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid transparent;
  cursor: pointer;
  user-select: none;
  isolation: isolate;
  transition:
    background $transition-base,
    color $transition-base,
    border-color $transition-base,
    box-shadow $transition-base,
    transform $transition-fast,
    opacity $transition-base;

  &:focus-visible {
    @include focus-ring;
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
    transform: none !important;
  }

  &--block {
    width: 100%;
  }

  &--rounded {
    border-radius: $radius-full;
  }
}

// ── Tamaños (mobile-first) ───────────────────────────────────────
.btn--sm {
  padding: $sp-2 $sp-3;
  font-size: $fs-xs;
  min-height: 34px;
}
.btn--md {
  padding: $sp-3 $sp-4;
  font-size: $fs-sm;
  min-height: 42px;
}
.btn--lg {
  padding: $sp-4 $sp-6;
  font-size: $fs-base;
  min-height: 50px;
}

@include md {
  .btn--md { padding: $sp-3 $sp-5; }
  .btn--lg { padding: $sp-4 $sp-8; }
}

// ── Variantes ────────────────────────────────────────────────────
.btn--primary {
  background: $primary;
  color: $white;
  box-shadow: $shadow-xs;
  &:hover:not(:disabled) {
    background: darken($primary, 6);
    box-shadow: $shadow-primary;
    transform: translateY(-1px);
  }
}

.btn--secondary {
  background: $secondary;
  color: $white;
  &:hover:not(:disabled) {
    background: darken($secondary, 6);
    box-shadow: 0 8px 24px rgba($secondary, 0.28);
    transform: translateY(-1px);
  }
}

.btn--ghost {
  background: transparent;
  color: $primary-dark;
  &:hover:not(:disabled) {
    background: rgba($primary-dark, 0.06);
  }
}

.btn--outline {
  background: transparent;
  color: $primary;
  border-color: rgba($primary, 0.4);
  &:hover:not(:disabled) {
    background: rgba($primary, 0.08);
    border-color: $primary;
  }
}

.btn--danger {
  background: $alert-error;
  color: $white;
  &:hover:not(:disabled) {
    background: darken($alert-error, 6);
    box-shadow: 0 8px 24px rgba($alert-error, 0.3);
    transform: translateY(-1px);
  }
}

.btn--success {
  background: $BAKANO-GREEN;
  color: $white;
  &:hover:not(:disabled) {
    background: darken($BAKANO-GREEN, 6);
    box-shadow: 0 8px 24px rgba($BAKANO-GREEN, 0.3);
    transform: translateY(-1px);
  }
}

// ── Piezas internas ──────────────────────────────────────────────
.btn__label {
  @include truncate;
  &:empty { display: none; }
}

.btn__icon {
  font-size: 0.95em;
  transition: transform $transition-base;
}
.btn:hover:not(:disabled) .btn__icon--right {
  transform: translateX(3px);
}

.btn__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: $radius-full;
  animation: spin 0.7s linear infinite;
  flex: none;
}

.btn__ripples {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: inherit;
  pointer-events: none;
  z-index: -1;
}

.btn__ripple {
  position: absolute;
  border-radius: $radius-full;
  background: currentColor;
  opacity: 0.22;
  transform: scale(0);
  animation: btn-ripple 0.6s $ease-out forwards;
}

@keyframes btn-ripple {
  to {
    transform: scale(1);
    opacity: 0;
  }
}
</style>
