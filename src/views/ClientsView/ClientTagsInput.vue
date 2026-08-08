<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string[]
  label?: string
  placeholder?: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const draft = ref('')

function commit() {
  const value = draft.value.trim().replace(/,$/, '')
  if (!value) return
  if (props.modelValue.includes(value)) {
    draft.value = ''
    return
  }
  emit('update:modelValue', [...props.modelValue, value])
  draft.value = ''
}

function removeAt(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',') {
    event.preventDefault()
    commit()
    return
  }
  if (event.key === 'Backspace' && !draft.value && props.modelValue.length) {
    removeAt(props.modelValue.length - 1)
  }
}
</script>

<template>
  <div class="tags">
    <label v-if="label" class="tags__label">{{ label }}</label>

    <div class="tags__box">
      <TransitionGroup name="scale-pop" tag="div" class="tags__chips">
        <span v-for="(tag, index) in modelValue" :key="tag" class="tag">
          <i class="fa-solid fa-tag" aria-hidden="true" />
          {{ tag }}
          <button type="button" :aria-label="`Quitar ${tag}`" @click="removeAt(index)">
            <i class="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </span>
      </TransitionGroup>

      <input
        v-model="draft"
        class="tags__input"
        type="text"
        :placeholder="placeholder || 'Escribe y pulsa Enter'"
        @keydown="onKeydown"
        @blur="commit"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
.tags {
  @include flex-col($sp-2);
}

.tags__label {
  @include label-text;
}

.tags__box {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  min-height: 44px;
  padding: $sp-2 $sp-3;
  border: 1px solid $border-strong;
  border-radius: $radius-sm;
  background: $surface;
  transition: border-color $transition-base, box-shadow $transition-base;

  &:focus-within {
    @include focus-ring;
  }
}

.tag {
  @include flex-center($sp-1);
  padding: 2px $sp-2;
  border-radius: $radius-full;
  background: rgba($secondary, 0.12);
  color: $secondary-dark;
  font-size: $fs-xs;
  font-weight: 600;

  button {
    @include flex-center;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.65;
    transition: opacity $transition-fast;

    &:hover {
      opacity: 1;
    }
  }
}

.tags__input {
  flex: 1;
  min-width: 120px;
  border: none;
  outline: none;
  background: transparent;
  font-size: $fs-sm;
  color: $primary-dark;
  padding: $sp-1 0;
}
</style>
