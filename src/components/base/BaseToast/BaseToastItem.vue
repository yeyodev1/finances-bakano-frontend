<script setup lang="ts">
import { computed } from 'vue'
import type { ToastItem } from '@/types'

interface Props {
  toast: ToastItem
}

const props = defineProps<Props>()
const emit = defineEmits<{ dismiss: [id: string] }>()

const ICONS: Record<ToastItem['type'], string> = {
  success: 'fa-solid fa-circle-check',
  error: 'fa-solid fa-circle-xmark',
  warning: 'fa-solid fa-triangle-exclamation',
  info: 'fa-solid fa-circle-info',
}

const icon = computed(() => ICONS[props.toast.type])
</script>

<template>
  <li
    class="toast"
    :class="`toast--${props.toast.type}`"
    role="status"
    aria-live="polite"
    @click="emit('dismiss', props.toast.id)"
  >
    <span class="toast__icon"><i :class="icon" aria-hidden="true" /></span>

    <div class="toast__body">
      <p class="toast__title">{{ props.toast.title }}</p>
      <p v-if="props.toast.message" class="toast__message">{{ props.toast.message }}</p>
    </div>

    <button
      class="toast__close"
      type="button"
      aria-label="Cerrar notificación"
      @click.stop="emit('dismiss', props.toast.id)"
    >
      <i class="fa-solid fa-xmark" aria-hidden="true" />
    </button>

    <span
      v-if="props.toast.duration > 0"
      class="toast__progress"
      :style="{ animationDuration: `${props.toast.duration}ms` }"
      aria-hidden="true"
    />
  </li>
</template>

<style scoped lang="scss">
.toast {
  position: relative;
  @include flex(row, flex-start, flex-start, $sp-3);
  width: 100%;
  padding: $sp-3 $sp-4;
  background: $surface;
  border: 1px solid $border-color;
  border-left: 4px solid $text-secondary;
  border-radius: $radius-sm;
  box-shadow: $shadow-md;
  cursor: pointer;
  overflow: hidden;
  pointer-events: auto;
  transition: transform $transition-base, box-shadow $transition-base;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-lg;
  }

  @include md {
    width: 360px;
  }
}

.toast__icon {
  @include flex-center;
  flex: none;
  width: 26px;
  height: 26px;
  border-radius: $radius-full;
  font-size: $fs-base;
  animation: toast-icon 0.4s $ease-spring both;
}

@keyframes toast-icon {
  from { transform: scale(0.3) rotate(-25deg); opacity: 0; }
  to { transform: scale(1) rotate(0); opacity: 1; }
}

.toast__body {
  @include flex-col(2px);
  flex: 1 1 auto;
  min-width: 0;
}

.toast__title {
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;
  line-height: 1.35;
}

.toast__message {
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.45;
  word-break: break-word;
}

.toast__close {
  @include flex-center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: $radius-full;
  color: $text-secondary;
  font-size: $fs-xs;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  &:hover { background: rgba($primary-dark, 0.07); color: $primary-dark; transform: rotate(90deg); }
}

.toast__progress {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  width: 100%;
  transform-origin: left center;
  animation-name: toast-progress;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}

@keyframes toast-progress {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}

// ── Tipos ────────────────────────────────────────────────────────
@mixin toast-tone($color) {
  border-left-color: $color;
  .toast__icon { background: rgba($color, 0.13); color: $color; }
  .toast__progress { background: rgba($color, 0.55); }
}

.toast--success { @include toast-tone($alert-success); }
.toast--error   { @include toast-tone($alert-error); }
.toast--warning { @include toast-tone($alert-warning); }
.toast--info    { @include toast-tone($alert-info); }
</style>
