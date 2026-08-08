<script setup lang="ts">
import { computed } from 'vue'
import { BaseFileDropzone } from '@/components/base'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ modelValue: File | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: File | null] }>()

const toast = useToast()

const files = computed<File[]>({
  get: () => (props.modelValue ? [props.modelValue] : []),
  set: (value) => emit('update:modelValue', value[0] ?? null),
})

function onRejected(message: string) {
  toast.warning('Archivo no admitido', message)
}
</script>

<template>
  <BaseFileDropzone
    v-model="files"
    label="Comprobante (opcional)"
    hint="JPG, PNG o PDF"
    :multiple="false"
    :max-files="1"
    @rejected="onRejected"
  />
</template>
