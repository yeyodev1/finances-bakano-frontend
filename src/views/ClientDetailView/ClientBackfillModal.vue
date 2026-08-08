<script setup lang="ts">
import { ref, watch } from 'vue'
import { BaseButton, BaseDatePicker, BaseModal } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import type { Client } from '@/types'

const props = defineProps<{ modelValue: boolean; client: Client | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [] }>()

const store = useClientsStore()
const toast = useToast()
const { toISODate } = useFormat()

const fromDate = ref<string | null>(null)
const markPaidUntil = ref<string | null>(null)
const loading = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    fromDate.value = props.client ? toISODate(props.client.startDate) : null
    markPaidUntil.value = null
  },
)

async function run() {
  if (!props.client || !fromDate.value) {
    toast.warning('Falta la fecha de inicio', 'Selecciona desde qué fecha generar los cobros.')
    return
  }

  loading.value = true
  try {
    const result = await store.backfill(props.client._id, fromDate.value, markPaidUntil.value)
    toast.success(
      'Cobros retroactivos generados',
      `Se crearon ${result.created} cobros y se marcaron ${result.markedPaid} como pagados.`,
    )
    emit('done')
    emit('update:modelValue', false)
  } catch (error) {
    toast.error('No se pudo generar el backfill', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Generar cobros retroactivos"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="bf">
      <p class="bf__alert">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        Se creará un cobro por cada mes entre la fecha indicada y el mes actual. Los meses anteriores a
        "marcar como pagado hasta" quedarán registrados como pagados.
      </p>

      <BaseDatePicker v-model="fromDate" label="Generar desde" />
      <BaseDatePicker v-model="markPaidUntil" label="Marcar como pagado hasta" placeholder="Opcional" />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="emit('update:modelValue', false)">
        Cancelar
      </BaseButton>
      <BaseButton icon="fa-solid fa-clock-rotate-left" :loading="loading" @click="run">Generar</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.bf {
  @include flex-col($sp-4);
}

.bf__alert {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: rgba($alert-info, 0.1);
  color: darken($alert-info, 16);
  font-size: $fs-xs;
  line-height: 1.5;

  i {
    color: $alert-info;
    margin-top: 2px;
  }
}
</style>
