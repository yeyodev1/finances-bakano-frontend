<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
  title?: string
  subtitle?: string
  icon?: string
  flat?: boolean
  accent?: boolean
  clickable?: boolean
  tag?: string
}

const props = withDefaults(defineProps<Props>(), {
  hoverable: false,
  padding: 'md',
  title: '',
  subtitle: '',
  icon: '',
  flat: false,
  accent: false,
  clickable: false,
  tag: 'section',
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const interactive = computed(() => props.clickable || props.hoverable)

function onClick(event: MouseEvent) {
  if (props.clickable) emit('click', event)
}

function onKeydown(event: KeyboardEvent) {
  if (!props.clickable) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    ;(event.currentTarget as HTMLElement | null)?.click()
  }
}
</script>

<template>
  <component
    :is="props.tag"
    class="card"
    :class="[
      `card--pad-${props.padding}`,
      {
        'card--hoverable': interactive,
        'card--flat': props.flat,
        'card--accent': props.accent,
        'card--clickable': props.clickable,
      },
    ]"
    :role="props.clickable ? 'button' : undefined"
    :tabindex="props.clickable ? 0 : undefined"
    @click="onClick"
    @keydown="onKeydown"
  >
    <header v-if="$slots.header || props.title" class="card__header">
      <slot name="header">
        <div class="card__heading">
          <span v-if="props.icon" class="card__icon"><i :class="props.icon" aria-hidden="true" /></span>
          <div class="card__titles">
            <h3 class="card__title">{{ props.title }}</h3>
            <p v-if="props.subtitle" class="card__subtitle">{{ props.subtitle }}</p>
          </div>
        </div>
        <div v-if="$slots.actions" class="card__actions"><slot name="actions" /></div>
      </slot>
    </header>

    <div class="card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="card__footer">
      <slot name="footer" />
    </footer>
  </component>
</template>

<style scoped lang="scss">
.card {
  @include card($sp-4);
  @include flex-col;
  position: relative;
  overflow: hidden;
  width: 100%;

  @include md {
    padding: $sp-5;
  }

  &--flat {
    box-shadow: none;
    background: transparent;
  }

  &--hoverable {
    @include card-hover;
  }

  &--clickable {
    cursor: pointer;
    &:focus-visible { @include focus-ring; }
    &:active { transform: scale(0.995); }
  }

  &--accent::before {
    content: '';
    position: absolute;
    inset: 0 auto 0 0;
    width: 4px;
    @include gradient-primary;
  }
}

// ── Padding ──────────────────────────────────────────────────────
.card--pad-none { padding: 0; @include md { padding: 0; } }
.card--pad-sm { padding: $sp-3; @include md { padding: $sp-3; } }
.card--pad-lg { padding: $sp-5; @include md { padding: $sp-8; } }

.card__header {
  @include flex-between(flex-start, $sp-3);
  flex-wrap: wrap;
  padding-bottom: $sp-3;
  margin-bottom: $sp-4;
  border-bottom: 1px solid $border-color;
}

.card--pad-none .card__header {
  padding: $sp-4 $sp-4 $sp-3;
  margin-bottom: 0;
}

.card__heading {
  @include flex(row, flex-start, center, $sp-3);
  min-width: 0;
}

.card__icon {
  @include flex-center;
  width: 34px;
  height: 34px;
  flex: none;
  border-radius: $radius-sm;
  background: rgba($primary, 0.1);
  color: $primary;
  font-size: $fs-sm;
  transition: transform $transition-base, background $transition-base;

  .card--hoverable:hover & {
    transform: rotate(-6deg) scale(1.05);
  }
}

.card__titles {
  min-width: 0;
}

.card__title {
  font-size: $fs-base;
  font-weight: 700;
  @include truncate;
}

.card__subtitle {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: 2px;
  @include truncate;
}

.card__actions {
  @include flex-center($sp-2);
  flex-wrap: wrap;
  margin-left: auto;
}

.card__body {
  flex: 1 1 auto;
  min-width: 0;
}

.card--pad-none .card__body {
  padding: 0 $sp-4;
}

.card__footer {
  @include flex(row, flex-end, center, $sp-2);
  flex-wrap: wrap;
  padding-top: $sp-3;
  margin-top: $sp-4;
  border-top: 1px solid $border-color;
}

.card--pad-none .card__footer {
  padding: $sp-3 $sp-4 $sp-4;
  margin-top: 0;
}
</style>
