<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

interface Props {
  modelValue: File[]
  label?: string
  hint?: string
  accept?: string
  multiple?: boolean
  maxFiles?: number
  maxSizeMb?: number
  disabled?: boolean
  error?: string
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Adjuntos',
  hint: 'JPG, PNG o PDF',
  accept: 'image/*,application/pdf',
  multiple: true,
  maxFiles: 8,
  maxSizeMb: 10,
  disabled: false,
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: File[]]
  rejected: [message: string]
}>()

const dragging = ref(false)
const input = ref<HTMLInputElement | null>(null)
const previews = ref<Map<File, string>>(new Map())

function revokeAll() {
  previews.value.forEach((url) => URL.revokeObjectURL(url))
  previews.value = new Map()
}

watch(
  () => props.modelValue,
  (files) => {
    const next = new Map<File, string>()
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return
      const existing = previews.value.get(file)
      next.set(file, existing ?? URL.createObjectURL(file))
    })
    previews.value.forEach((url, file) => {
      if (!next.has(file)) URL.revokeObjectURL(url)
    })
    previews.value = next
  },
  { immediate: true, deep: false },
)

onBeforeUnmount(revokeAll)

const isFull = computed(() => props.modelValue.length >= props.maxFiles)

function previewOf(file: File): string | null {
  return previews.value.get(file) ?? null
}

function add(list: FileList | null) {
  if (props.disabled || !list?.length) return
  const incoming = Array.from(list)
  const accepted: File[] = []

  for (const file of incoming) {
    if (file.size > props.maxSizeMb * 1024 * 1024) {
      emit('rejected', `"${file.name}" supera los ${props.maxSizeMb} MB`)
      continue
    }
    const duplicated = props.modelValue.some((f) => f.name === file.name && f.size === file.size)
    if (duplicated) continue
    accepted.push(file)
  }

  if (!accepted.length) return

  const merged = props.multiple ? [...props.modelValue, ...accepted] : accepted.slice(0, 1)
  if (merged.length > props.maxFiles) {
    emit('rejected', `Máximo ${props.maxFiles} archivos`)
  }
  emit('update:modelValue', merged.slice(0, props.maxFiles))
  if (input.value) input.value.value = ''
}

function onDrop(event: DragEvent) {
  dragging.value = false
  add(event.dataTransfer?.files ?? null)
}

function removeAt(index: number) {
  const next = [...props.modelValue]
  next.splice(index, 1)
  emit('update:modelValue', next)
  if (input.value) input.value.value = ''
}

function open() {
  if (props.disabled || isFull.value) return
  input.value?.click()
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="drop" :class="{ 'drop--disabled': disabled }">
    <div v-if="label" class="drop__head">
      <span class="drop__label">{{ label }}</span>
      <span v-if="multiple" class="drop__count">{{ modelValue.length }} / {{ maxFiles }}</span>
    </div>

    <div
      class="drop__zone"
      :class="{ 'drop__zone--active': dragging, 'drop__zone--full': isFull }"
      role="button"
      tabindex="0"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
      @click="open"
      @keydown.enter.prevent="open"
      @keydown.space.prevent="open"
    >
      <input
        ref="input"
        type="file"
        class="drop__input"
        :accept="accept"
        :multiple="multiple"
        :disabled="disabled"
        @change="add(($event.target as HTMLInputElement).files)"
      />

      <div class="drop__empty">
        <i class="fa-solid fa-cloud-arrow-up" aria-hidden="true" />
        <p v-if="isFull">Alcanzaste el máximo de archivos</p>
        <p v-else>Arrastra los archivos aquí o haz clic para buscarlos</p>
        <span>{{ hint }}</span>
      </div>
    </div>

    <TransitionGroup v-if="modelValue.length" name="list" tag="ul" class="drop__list">
      <li v-for="(file, index) in modelValue" :key="`${file.name}-${file.size}-${index}`" class="item">
        <img v-if="previewOf(file)" :src="previewOf(file) as string" :alt="file.name" class="item__thumb" />
        <i v-else class="fa-solid fa-file-pdf item__icon" aria-hidden="true" />

        <div class="item__info">
          <span class="item__name">{{ file.name }}</span>
          <span class="item__size">{{ humanSize(file.size) }}</span>
        </div>

        <button type="button" class="item__remove" title="Quitar archivo" @click.stop="removeAt(index)">
          <i class="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </li>
    </TransitionGroup>

    <p v-if="error" class="drop__error">{{ error }}</p>
  </div>
</template>

<style scoped lang="scss">
.drop {
  @include flex-col($sp-2);

  &--disabled {
    opacity: 0.6;
    pointer-events: none;
  }
}

.drop__head {
  @include flex-between(center, $sp-2);
}

.drop__label {
  @include label-text;
}

.drop__count {
  font-size: $fs-xs;
  color: $text-secondary;
  font-weight: 600;
}

.drop__zone {
  position: relative;
  @include flex-center;
  min-height: 120px;
  padding: $sp-4;
  border: 2px dashed $border-strong;
  border-radius: $radius-md;
  background: $surface-alt;
  cursor: pointer;
  transition: border-color $transition-base, background $transition-base, transform $transition-base;

  &:hover {
    border-color: rgba($primary, 0.5);
  }

  &:focus-visible {
    @include focus-ring;
  }

  &--active {
    border-color: $primary;
    background: rgba($primary, 0.08);
    transform: scale(1.01);
  }

  &--full {
    cursor: not-allowed;
    opacity: 0.7;
  }
}

.drop__input {
  display: none;
}

.drop__empty {
  @include flex-col($sp-2);
  align-items: center;
  text-align: center;
  color: $text-secondary;

  i {
    font-size: $fs-xl;
    color: $secondary;
  }

  p {
    font-size: $fs-sm;
    font-weight: 600;
    color: $primary-dark;
  }

  span {
    font-size: $fs-xs;
  }
}

.drop__list {
  @include flex-col($sp-2);
  list-style: none;
}

.item {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-2 $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: $surface;
}

.item__thumb {
  width: 44px;
  height: 44px;
  object-fit: cover;
  border-radius: $radius-xs;
  border: 1px solid $border-color;
  flex: none;
}

.item__icon {
  @include flex-center;
  width: 44px;
  height: 44px;
  font-size: $fs-lg;
  color: $alert-error;
  flex: none;
}

.item__info {
  @include flex-col(2px);
  min-width: 0;
  flex: 1;
}

.item__name {
  @include truncate;
  font-weight: 600;
  color: $primary-dark;
  font-size: $fs-sm;
}

.item__size {
  font-size: $fs-xs;
  color: $text-secondary;
}

.item__remove {
  @include flex-center;
  @include pressable;
  width: 32px;
  height: 32px;
  border-radius: $radius-xs;
  border: 1px solid $border-color;
  background: $surface;
  color: $text-secondary;
  cursor: pointer;
  flex: none;

  &:hover {
    color: $alert-error;
    border-color: rgba($alert-error, 0.4);
  }
}

.drop__error {
  font-size: $fs-xs;
  color: $alert-error;
  font-weight: 600;
}
</style>
