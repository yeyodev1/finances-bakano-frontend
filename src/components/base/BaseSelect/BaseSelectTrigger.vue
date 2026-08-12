<script setup lang="ts">
import { ref } from 'vue'
import BaseWorkspaceAvatar from '../BaseWorkspaceAvatar/BaseWorkspaceAvatar.vue'

interface Props {
  id: string
  text: string
  placeholder?: boolean
  icon?: string
  /** `null` sí pinta avatar (iniciales); `undefined` no pinta ninguno. */
  image?: string | null
  /** Etiqueta que alimenta las iniciales del avatar. */
  avatarName?: string
  dotColor?: string
  count?: number
  showClear?: boolean
  open?: boolean
  disabled?: boolean
  error?: boolean
  size?: 'sm' | 'md' | 'lg'
  describedBy?: string
  listId: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: false,
  icon: '',
  image: undefined,
  avatarName: '',
  dotColor: '',
  count: 0,
  showClear: false,
  open: false,
  disabled: false,
  error: false,
  size: 'md',
  describedBy: undefined,
})

const emit = defineEmits<{
  toggle: []
  clear: []
  keydown: [event: KeyboardEvent]
}>()

const el = ref<HTMLButtonElement | null>(null)
defineExpose({ el, focus: () => el.value?.focus() })
</script>

<template>
  <button
    :id="props.id"
    ref="el"
    class="sel__trigger"
    :class="[
      `sel__trigger--${props.size}`,
      { 'sel__trigger--open': props.open, 'sel__trigger--error': props.error },
    ]"
    type="button"
    role="combobox"
    :aria-expanded="props.open"
    :aria-controls="props.listId"
    aria-haspopup="listbox"
    :aria-describedby="props.describedBy"
    :disabled="props.disabled"
    @click="emit('toggle')"
    @keydown="emit('keydown', $event)"
  >
    <BaseWorkspaceAvatar
      v-if="props.image !== undefined"
      class="sel__avatar"
      :src="props.image"
      :name="props.avatarName || props.text"
      size="xs"
      rounded="square"
    />
    <i v-else-if="props.icon" class="sel__icon" :class="props.icon" aria-hidden="true" />

    <span v-if="props.dotColor" class="sel__dot" :style="{ background: props.dotColor }" aria-hidden="true" />

    <span class="sel__value" :class="{ 'sel__value--placeholder': props.placeholder }">{{ props.text }}</span>

    <span v-if="props.count > 1" class="sel__count" aria-hidden="true">{{ props.count }}</span>

    <span
      v-if="props.showClear"
      class="sel__clear"
      role="button"
      tabindex="-1"
      aria-label="Limpiar selección"
      @click.stop="emit('clear')"
    >
      <i class="fa-solid fa-xmark" aria-hidden="true" />
    </span>

    <i class="sel__caret fa-solid fa-chevron-down" aria-hidden="true" />
  </button>
</template>

<style scoped lang="scss">
.sel__trigger {
  @include flex(row, flex-start, center, $sp-2);
  width: 100%;
  min-width: 0;
  height: 42px;
  padding: 0 $sp-3;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  text-align: left;
  transition: border-color $transition-base, box-shadow $transition-base, background $transition-base;

  &:hover:not(:disabled) { border-color: $border-strong; }
  &:focus-visible { @include focus-ring; }
  &:disabled { cursor: not-allowed; opacity: 0.65; background: rgba($primary-dark, 0.04); }

  &--open { @include focus-ring; }
  &--error { border-color: $alert-error; }
  &--open .sel__caret { transform: rotate(180deg); color: $primary; }

  &--sm { height: 34px; padding: 0 $sp-2; .sel__value { font-size: $fs-sm; } }
  &--lg { height: 52px; padding: 0 $sp-4; .sel__value { font-size: $fs-md; } }
}

.sel__icon { flex: none; color: $text-secondary; font-size: $fs-sm; }

.sel__avatar {
  box-shadow: 0 0 0 1px rgba($primary-dark, 0.06);
}

.sel__dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: $radius-full;
}

.sel__value {
  flex: 1 1 auto;
  min-width: 0;
  font-size: $fs-base;
  color: $primary-dark;
  @include truncate;

  &--placeholder { color: rgba($primary-dark, 0.35); }
}

.sel__count {
  flex: none;
  @include flex-center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: $radius-full;
  background: rgba($primary, 0.12);
  color: $primary;
  font-size: 0.66rem;
  font-weight: 700;
}

.sel__clear {
  @include flex-center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: $radius-full;
  color: $text-secondary;
  font-size: $fs-xs;
  cursor: pointer;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  &:hover { background: rgba($primary-dark, 0.08); color: $primary; transform: rotate(90deg); }
}

.sel__caret {
  flex: none;
  color: $text-secondary;
  font-size: $fs-xs;
  transition: transform $transition-base, color $transition-base;
}
</style>
