<script setup lang="ts">
import { computed } from 'vue'
import BaseWorkspaceAvatar from '../BaseWorkspaceAvatar/BaseWorkspaceAvatar.vue'
import type { SelectOption } from '@/types'

interface Props {
  option: SelectOption
  selected?: boolean
  active?: boolean
  multiple?: boolean
  index: number
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
  active: false,
  multiple: false,
})

const emit = defineEmits<{
  select: [option: SelectOption]
  hover: [index: number]
}>()

// `image: null` sigue siendo avatar: BaseWorkspaceAvatar resuelve el logo faltante
// (o el 404 de métricas) a iniciales con color propio, así ninguna fila queda coja.
const hasAvatar = computed(() => props.option.image !== undefined)
</script>

<template>
  <li
    class="opt"
    :class="{
      'opt--selected': props.selected,
      'opt--active': props.active,
      'opt--disabled': props.option.disabled,
    }"
    role="option"
    :aria-selected="props.selected"
    :aria-disabled="props.option.disabled || undefined"
    @click.stop="!props.option.disabled && emit('select', props.option)"
    @mousemove="emit('hover', props.index)"
  >
    <span
      v-if="props.multiple"
      class="opt__check"
      :class="{ 'opt__check--on': props.selected }"
      aria-hidden="true"
    >
      <i class="fa-solid fa-check" />
    </span>

    <BaseWorkspaceAvatar
      v-if="hasAvatar"
      class="opt__avatar"
      :src="props.option.image"
      :name="props.option.label"
      size="xs"
      rounded="square"
    />
    <span
      v-else-if="props.option.color"
      class="opt__dot"
      :style="{ background: props.option.color }"
      aria-hidden="true"
    />
    <i v-else-if="props.option.icon" class="opt__icon" :class="props.option.icon" aria-hidden="true" />

    <span class="opt__body">
      <span class="opt__label">{{ props.option.label }}</span>
      <span v-if="props.option.description" class="opt__desc">{{ props.option.description }}</span>
    </span>

    <i
      v-if="props.selected && !props.multiple"
      class="opt__tick fa-solid fa-check"
      aria-hidden="true"
    />
  </li>
</template>

<style scoped lang="scss">
.opt {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-3;
  border-radius: $radius-xs;
  cursor: pointer;
  font-size: $fs-base;
  color: $primary-dark;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  @include md {
    padding: $sp-2 $sp-3;
    font-size: $fs-sm;
  }

  &--active {
    background: rgba($primary, 0.09);
  }

  &--selected {
    color: $primary;
    font-weight: 700;
  }

  &--selected.opt--active {
    background: rgba($primary, 0.14);
  }

  &--disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  &:active:not(.opt--disabled) {
    transform: scale(0.985);
  }
}

.opt__body {
  @include flex-col(2px);
  flex: 1 1 auto;
  min-width: 0;
}

.opt__label {
  @include truncate;
}

.opt__desc {
  font-size: $fs-xs;
  font-weight: 400;
  color: $text-secondary;
  @include truncate;
}

.opt__icon {
  flex: none;
  width: 18px;
  text-align: center;
  color: $text-secondary;
  transition: color $transition-fast;

  .opt--selected & { color: $primary; }
}

.opt__dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: $radius-full;
  box-shadow: 0 0 0 3px rgba($primary-dark, 0.05);
}

.opt__avatar {
  box-shadow: 0 0 0 1px rgba($primary-dark, 0.06);
}

.opt__tick {
  flex: none;
  color: $primary;
  font-size: $fs-xs;
  animation: opt-tick 0.25s $ease-spring both;
}

@keyframes opt-tick {
  from { opacity: 0; transform: scale(0.4); }
  to { opacity: 1; transform: scale(1); }
}

.opt__check {
  @include flex-center;
  flex: none;
  width: 18px;
  height: 18px;
  border-radius: $radius-xs;
  border: 1.5px solid $border-strong;
  color: transparent;
  font-size: 0.6rem;
  transition: background $transition-fast, border-color $transition-fast, color $transition-fast,
    transform $transition-fast;

  &--on {
    background: $primary;
    border-color: $primary;
    color: $white;
    transform: scale(1.05);
  }
}
</style>
