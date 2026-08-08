<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ modelValue: string[]; label?: string; placeholder?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>()

const draft = ref('')
const error = ref('')

const isValid = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/)

function commit() {
  const raw = draft.value.trim().replace(/[,;]$/, '')
  if (!raw) return
  if (!isValid.value.test(raw)) {
    error.value = 'Email inválido'
    return
  }
  error.value = ''
  if (props.modelValue.includes(raw)) {
    draft.value = ''
    return
  }
  emit('update:modelValue', [...props.modelValue, raw])
  draft.value = ''
}

function removeAt(index: number) {
  emit('update:modelValue', props.modelValue.filter((_, i) => i !== index))
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ',' || event.key === ';' || event.key === ' ') {
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
  <div class="emails">
    <label v-if="label" class="emails__label">{{ label }}</label>

    <div class="emails__box" :class="{ 'emails__box--error': !!error }">
      <TransitionGroup name="scale-pop" tag="div" class="emails__chips">
        <span v-for="(email, index) in modelValue" :key="email" class="email-chip">
          <i class="fa-solid fa-envelope" aria-hidden="true" />
          {{ email }}
          <button type="button" :aria-label="`Quitar ${email}`" @click="removeAt(index)">
            <i class="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </span>
      </TransitionGroup>

      <input
        v-model="draft"
        type="email"
        class="emails__input"
        :placeholder="placeholder || 'correo@bakano.ec y pulsa Enter'"
        @keydown="onKeydown"
        @blur="commit"
        @input="error = ''"
      />
    </div>

    <Transition name="fade">
      <p v-if="error" class="emails__error"><i class="fa-solid fa-circle-exclamation" aria-hidden="true" /> {{ error }}</p>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.emails {
  @include flex-col($sp-2);
}

.emails__label {
  @include label-text;
}

.emails__box {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  min-height: 46px;
  padding: $sp-2 $sp-3;
  border: 1px solid $border-strong;
  border-radius: $radius-sm;
  background: $surface;
  transition: border-color $transition-base, box-shadow $transition-base;

  &:focus-within {
    @include focus-ring;
  }

  &--error {
    border-color: $alert-error;
  }
}

.emails__chips {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.email-chip {
  @include flex-center($sp-1);
  padding: 2px $sp-2;
  border-radius: $radius-full;
  background: rgba($primary, 0.1);
  color: $primary;
  font-size: $fs-xs;
  font-weight: 600;

  button {
    @include flex-center;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;

    &:hover {
      opacity: 1;
    }
  }
}

.emails__input {
  flex: 1;
  min-width: 160px;
  border: none;
  outline: none;
  background: transparent;
  font-size: $fs-sm;
  color: $primary-dark;
  padding: $sp-1 0;
}

.emails__error {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $alert-error;
}
</style>
