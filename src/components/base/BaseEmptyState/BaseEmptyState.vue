<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  icon?: string
  title?: string
  /** Texto descriptivo. `description` y `message` son alias equivalentes. */
  text?: string
  description?: string
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'error' | 'search'
}

const props = withDefaults(defineProps<Props>(), {
  icon: 'fa-solid fa-inbox',
  title: 'Nada por aquí',
  text: '',
  description: '',
  message: '',
  size: 'md',
  variant: 'default',
})

const body = computed(() => props.text || props.description || props.message)
</script>

<template>
  <div class="empty" :class="[`empty--${props.size}`, `empty--${props.variant}`]" role="status">
    <div class="empty__icon">
      <slot name="icon">
        <i :class="props.icon" aria-hidden="true" />
      </slot>
    </div>

    <h3 class="empty__title">
      <slot name="title">{{ props.title }}</slot>
    </h3>

    <p v-if="body || $slots.text" class="empty__text">
      <slot name="text">{{ body }}</slot>
    </p>

    <div v-if="$slots.action" class="empty__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style scoped lang="scss">
.empty {
  @include flex(column, center, center, $sp-3);
  text-align: center;
  padding: $sp-8 $sp-4;
  width: 100%;
  animation: empty-in $transition-slow $ease-out both;

  @include md {
    padding: $sp-12 $sp-8;
  }
}

@keyframes empty-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.empty__icon {
  @include flex-center;
  width: 64px;
  height: 64px;
  border-radius: $radius-full;
  background: rgba($primary, 0.08);
  color: $primary;
  font-size: 1.5rem;
  margin-bottom: $sp-1;
  transition: transform $transition-base, background $transition-base;

  .empty:hover & {
    transform: scale(1.06) rotate(-4deg);
  }
}

.empty__title {
  font-size: $fs-md;
  font-weight: 700;
  color: $primary-dark;
}

.empty__text {
  font-size: $fs-sm;
  color: $text-secondary;
  max-width: 42ch;
  line-height: 1.55;
}

.empty__action {
  @include flex-center($sp-3);
  flex-wrap: wrap;
  margin-top: $sp-2;
}

// ── Tamaños ──────────────────────────────────────────────────────
.empty--sm {
  padding: $sp-6 $sp-3;
  .empty__icon { width: 46px; height: 46px; font-size: 1.1rem; }
  .empty__title { font-size: $fs-base; }
}

.empty--lg {
  .empty__icon { width: 84px; height: 84px; font-size: 2rem; }
  .empty__title { font-size: $fs-lg; }
}

// ── Variantes ────────────────────────────────────────────────────
.empty--error .empty__icon {
  background: $alert-error-bg;
  color: $alert-error;
}

.empty--search .empty__icon {
  background: rgba($secondary, 0.1);
  color: $secondary;
}
</style>
