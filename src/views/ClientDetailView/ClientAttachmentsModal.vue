<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseFileDropzone, BaseModal } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import type { Client } from '@/types'

const props = defineProps<{ modelValue: boolean; client: Client | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [] }>()

const store = useClientsStore()
const toast = useToast()

const files = ref<File[]>([])

watch(
  () => props.modelValue,
  (open) => {
    if (open) files.value = []
  },
)

const canSubmit = computed(() => files.value.length > 0 && !store.saving)

function close() {
  emit('update:modelValue', false)
}

function onRejected(message: string) {
  toast.warning('Archivo no admitido', message)
}

async function submit() {
  const client = props.client
  if (!client || !files.value.length) return

  try {
    await store.addAttachments(client._id, files.value)
    toast.success(
      'Respaldos añadidos',
      `${files.value.length} ${files.value.length === 1 ? 'archivo guardado' : 'archivos guardados'}.`,
    )
    emit('done')
    close()
  } catch (error) {
    toast.error('No se pudieron subir los respaldos', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Añadir respaldos"
    icon="fa-solid fa-paperclip"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="attach">
      <p class="attach__hint">
        Sube capturas, correos, contratos o cualquier documento que respalde el historial de
        {{ client?.name || 'este cliente' }}.
      </p>

      <BaseFileDropzone
        v-model="files"
        label="Archivos"
        hint="JPG, PNG o PDF · hasta 10 MB por archivo"
        :max-files="8"
        @rejected="onRejected"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton
        icon="fa-solid fa-cloud-arrow-up"
        :disabled="!canSubmit"
        :loading="store.saving"
        @click="submit"
      >
        Subir respaldos
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.attach {
  @include flex-col($sp-4);
}

.attach__hint {
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.5;
}
</style>
