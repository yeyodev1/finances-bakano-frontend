<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton, BaseDatePicker, BaseSearchInput, BaseSelect } from '@/components/base'
import type { BankFilters } from '@/stores/bank'
import type { SelectOption } from '@/types'

const props = defineProps<{ modelValue: BankFilters }>()

const emit = defineEmits<{
  'update:modelValue': [value: BankFilters]
  apply: []
  reset: []
}>()

const STATUS_OPTIONS: SelectOption[] = [
  { value: null, label: 'Todos los estados' },
  { value: 'sent', label: 'Enviado', icon: 'fa-solid fa-circle-check' },
  { value: 'pending', label: 'Pendiente', icon: 'fa-solid fa-clock' },
  { value: 'failed', label: 'Fallido', icon: 'fa-solid fa-circle-xmark' },
  { value: 'cancelled', label: 'Cancelado', icon: 'fa-solid fa-ban' },
  { value: 'reversed', label: 'Reversado', icon: 'fa-solid fa-rotate-left' },
  { value: 'blocked', label: 'Bloqueado', icon: 'fa-solid fa-hand' },
]

function patch(partial: Partial<BankFilters>) {
  emit('update:modelValue', { ...props.modelValue, ...partial })
}

/** Los filtros que no se escriben a mano recargan la lista al instante. */
function patchAndApply(partial: Partial<BankFilters>) {
  patch(partial)
  emit('apply')
}

const isDirty = computed(
  () =>
    !!props.modelValue.q ||
    !!props.modelValue.status ||
    !!props.modelValue.start ||
    !!props.modelValue.end ||
    props.modelValue.onlySubscriptions,
)
</script>

<template>
  <div class="bfilters">
    <BaseSearchInput
      :model-value="props.modelValue.q"
      placeholder="Buscar por contraparte, memo o descripción…"
      @update:model-value="patch({ q: $event })"
      @search="emit('apply')"
    />

    <BaseSelect
      :model-value="props.modelValue.status"
      :options="STATUS_OPTIONS"
      clearable
      placeholder="Estado"
      icon="fa-solid fa-filter"
      @update:model-value="patchAndApply({ status: ($event as string) || null })"
    />

    <BaseDatePicker
      :model-value="props.modelValue.start || null"
      placeholder="Desde"
      @update:model-value="patchAndApply({ start: $event || '' })"
    />

    <BaseDatePicker
      :model-value="props.modelValue.end || null"
      placeholder="Hasta"
      @update:model-value="patchAndApply({ end: $event || '' })"
    />

    <BaseButton
      :variant="props.modelValue.onlySubscriptions ? 'primary' : 'outline'"
      icon="fa-solid fa-arrows-rotate"
      @click="patchAndApply({ onlySubscriptions: !props.modelValue.onlySubscriptions })"
    >
      Solo suscripciones
    </BaseButton>

    <BaseButton
      v-if="isDirty"
      variant="ghost"
      icon="fa-solid fa-eraser"
      @click="emit('reset')"
    >
      Limpiar
    </BaseButton>
  </div>
</template>

<style scoped lang="scss">
.bfilters {
  // Cada control pide su ancho mínimo y el flex-wrap arma las filas solo: en móvil una por
  // línea, en tablet dos, y en pantalla ancha todo en una fila.
  @include flex(row, flex-start, flex-end, $sp-3);
  flex-wrap: wrap;

  > * {
    flex: 1 1 100%;
    min-width: 0;

    @include md {
      flex: 1 1 220px;
    }
  }

  // Búsqueda: siempre el control más ancho de la fila.
  > :first-child {
    @include md {
      flex: 2 1 260px;
    }
  }

  // Botones: solo lo que ocupa su texto.
  > :deep(.btn) {
    flex: none;
  }
}
</style>
