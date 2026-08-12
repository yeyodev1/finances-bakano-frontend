<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton, BaseSearchInput, BaseSelect } from '@/components/base'
import type { BankSubscriptionFilters } from '@/stores/bank'
import type { BankCadence, BankSubscriptionStatus, SelectOption } from '@/types'

const props = defineProps<{
  modelValue: BankSubscriptionFilters
  /** Cuántas suscripciones hay por estado, para mostrarlo en el selector. */
  counts?: Record<string, number>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: BankSubscriptionFilters]
  reset: []
}>()

const statusOptions = computed<SelectOption[]>(() => [
  { value: null, label: 'Todos los estados' },
  {
    value: 'failing',
    label: 'Con cobro rechazado',
    icon: 'fa-solid fa-triangle-exclamation',
    description: props.counts?.failing ? `${props.counts.failing} servicios` : undefined,
  },
  { value: 'active', label: 'Al día', icon: 'fa-solid fa-circle-check' },
  { value: 'due', label: 'Cobro atrasado', icon: 'fa-solid fa-clock' },
  { value: 'stale', label: 'Sin cobros', icon: 'fa-solid fa-power-off' },
])

const CADENCE_OPTIONS: SelectOption[] = [
  { value: null, label: 'Toda frecuencia' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'irregular', label: 'Irregular' },
]

function patch(partial: Partial<BankSubscriptionFilters>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

const isDirty = computed(
  () => !!props.modelValue.q || !!props.modelValue.status || !!props.modelValue.cadence,
)
</script>

<template>
  <div class="bsf">
    <BaseSearchInput
      :model-value="props.modelValue.q"
      placeholder="Buscar servicio: Skool, CapCut, Google…"
      :debounce="150"
      @update:model-value="patch({ q: $event })"
    />

    <BaseSelect
      :model-value="props.modelValue.status"
      :options="statusOptions"
      clearable
      placeholder="Estado"
      icon="fa-solid fa-filter"
      @update:model-value="patch({ status: ($event as BankSubscriptionStatus) || null })"
    />

    <BaseSelect
      :model-value="props.modelValue.cadence"
      :options="CADENCE_OPTIONS"
      clearable
      placeholder="Frecuencia"
      icon="fa-solid fa-arrows-rotate"
      @update:model-value="patch({ cadence: ($event as BankCadence) || null })"
    />

    <BaseButton v-if="isDirty" variant="ghost" icon="fa-solid fa-eraser" @click="emit('reset')">
      Limpiar
    </BaseButton>
  </div>
</template>

<style scoped lang="scss">
.bsf {
  @include flex(row, flex-start, flex-end, $sp-3);
  flex-wrap: wrap;

  > * {
    flex: 1 1 100%;
    min-width: 0;

    @include md {
      flex: 1 1 200px;
    }
  }

  > :first-child {
    @include md {
      flex: 2 1 260px;
    }
  }

  > :deep(.btn) {
    flex: none;
  }
}
</style>
