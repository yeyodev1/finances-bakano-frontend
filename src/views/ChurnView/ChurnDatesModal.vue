<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseDatePicker, BaseModal } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { lifetimeLabel } from '@/config/archiveReasons'
import type { Client } from '@/types'

/**
 * Corrección de las fechas del ciclo de vida. La baja suele registrarse días
 * después de que ocurrió, así que la project manager necesita poder cuadrarlas
 * a mano: de ahí salen la antigüedad y los informes de churn.
 */
const props = defineProps<{ modelValue: boolean; clientId: string; clientName: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [] }>()

const clients = useClientsStore()
const toast = useToast()
const { toISODate, formatDate } = useFormat()

const client = ref<Client | null>(null)
const loading = ref(false)
const startDate = ref('')
const archivedAt = ref('')

const original = computed(() => ({
  startDate: toISODate(client.value?.startDate) || '',
  archivedAt: toISODate(client.value?.archivedAt) || '',
}))

const changed = computed(
  () =>
    startDate.value !== original.value.startDate || archivedAt.value !== original.value.archivedAt,
)

/** Vista previa de la antigüedad con las fechas que hay ahora en el formulario. */
const previewDays = computed(() => {
  if (!startDate.value || !archivedAt.value) return null
  const from = new Date(startDate.value).getTime()
  const to = new Date(archivedAt.value).getTime()
  if (Number.isNaN(from) || Number.isNaN(to) || to < from) return null
  return Math.max(Math.floor((to - from) / 86_400_000), 0)
})

const invalidRange = computed(
  () => !!startDate.value && !!archivedAt.value && archivedAt.value < startDate.value,
)

async function load() {
  loading.value = true
  try {
    const data = await clients.fetchOne(props.clientId)
    client.value = data ?? null
    startDate.value = toISODate(data?.startDate) || ''
    archivedAt.value = toISODate(data?.archivedAt) || ''
  } catch (error) {
    toast.error('No se pudo cargar el cliente', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    client.value = null
    startDate.value = ''
    archivedAt.value = ''
    void load()
  },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (invalidRange.value) {
    toast.warning('Fechas incoherentes', 'La baja no puede ser anterior a la fecha de entrada.')
    return
  }
  if (!changed.value) {
    close()
    return
  }

  try {
    await clients.updateLifecycleDates(props.clientId, {
      startDate: startDate.value || undefined,
      archivedAt: archivedAt.value || undefined,
    })
    toast.success('Fechas actualizadas', `${props.clientName}: se recalculó la antigüedad.`)
    emit('saved')
    close()
  } catch (error) {
    toast.error('No se pudieron actualizar las fechas', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Corregir fechas"
    :subtitle="clientName"
    icon="fa-solid fa-calendar-pen"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="dates">
      <p class="dates__hint">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        La antigüedad del cliente y el reporte de bajas se calculan con estas dos fechas. Al
        guardar se recalculan solos.
      </p>

      <BaseDatePicker
        v-model="startDate"
        label="Fecha de entrada"
        :disabled="loading"
        :hint="original.startDate ? `Actual: ${formatDate(original.startDate)}` : ''"
      />

      <BaseDatePicker
        v-model="archivedAt"
        label="Fecha de baja"
        :disabled="loading"
        :min="startDate || null"
        :error="invalidRange ? 'No puede ser anterior a la fecha de entrada' : ''"
        :hint="original.archivedAt ? `Actual: ${formatDate(original.archivedAt)}` : ''"
      />

      <p v-if="previewDays !== null" class="dates__preview">
        Antigüedad resultante: <strong>{{ lifetimeLabel(previewDays) }}</strong>
      </p>
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton
        icon="fa-solid fa-floppy-disk"
        :disabled="loading || invalidRange || !changed"
        :loading="clients.saving"
        @click="submit"
      >
        Guardar fechas
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.dates {
  @include flex-col($sp-4);
}

.dates__hint {
  @include flex(row, flex-start, flex-start, $sp-2);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i {
    color: $alert-info;
    margin-top: 2px;
  }
}

.dates__preview {
  font-size: $fs-xs;
  color: $text-secondary;

  strong {
    color: $primary-dark;
    font-weight: 700;
  }
}
</style>
