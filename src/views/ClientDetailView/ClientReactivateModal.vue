<script setup lang="ts">
import { ref, watch } from 'vue'
import { BaseButton, BaseModal, BaseTextarea } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { archiveReasonLabel } from '@/config/archiveReasons'
import type { Client } from '@/types'

const props = defineProps<{ modelValue: boolean; client: Client | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [] }>()

const store = useClientsStore()
const toast = useToast()
const { formatDate } = useFormat()

const notes = ref('')

watch(
  () => props.modelValue,
  (open) => {
    if (open) notes.value = ''
  },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  const client = props.client
  if (!client) return

  try {
    await store.reactivate(client._id, notes.value)
    toast.success('Cliente reactivado', `${client.name} vuelve a estar activo.`)
    emit('done')
    close()
  } catch (error) {
    toast.error('No se pudo reactivar', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Reactivar cliente"
    icon="fa-solid fa-rotate-left"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="client" class="reactivate">
      <div class="reactivate__alert">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        <p>
          {{ client.name }} volverá a la lista de clientes activos y generará cobros nuevos desde
          el próximo período. El historial de la baja se conserva.
        </p>
      </div>

      <div v-if="client.archivedAt" class="reactivate__meta">
        <span class="reactivate__label">Baja registrada</span>
        <span class="reactivate__value">
          {{ formatDate(client.archivedAt) }} · {{ archiveReasonLabel(client.archiveReason) }}
        </span>
      </div>

      <BaseTextarea
        v-model="notes"
        label="Notas de la reactivación (opcional)"
        :rows="3"
        placeholder="Nuevo acuerdo, condiciones renegociadas…"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton variant="success" icon="fa-solid fa-rotate-left" :loading="store.saving" @click="submit">
        Reactivar cliente
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.reactivate {
  @include flex-col($sp-4);
}

.reactivate__alert {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-success-bg;
  border: 1px solid rgba($alert-success, 0.25);
  font-size: $fs-xs;
  line-height: 1.5;
  color: $text-secondary;

  i {
    color: $alert-success;
    margin-top: 2px;
  }
}

.reactivate__meta {
  @include flex-col(2px);
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: $surface-alt;
}

.reactivate__label {
  @include label-text;
}

.reactivate__value {
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;
}
</style>
