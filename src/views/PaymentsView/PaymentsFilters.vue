<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { BaseButton, BaseMonthPicker, BaseSelect } from '@/components/base'
import { useClientsStore } from '@/stores/clients'
import { usePaymentsStore } from '@/stores/payments'
import type { SelectOption } from '@/types'

const emit = defineEmits<{ change: []; export: [] }>()

const store = usePaymentsStore()
const clientsStore = useClientsStore()

onMounted(() => {
  clientsStore.fetchPicker().catch(() => undefined)
})

const clientOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'Todos los clientes', icon: 'fa-solid fa-users' },
  ...clientsStore.pickerOptions,
])

const client = computed<string | number | null>({
  get: () => store.filters.clientId ?? 'all',
  set: (value) => {
    store.filters.clientId = value === 'all' || value === null ? null : String(value)
    emit('change')
  },
})

const period = computed<string>({
  get: () => store.filters.period ?? '',
  set: (value) => {
    store.filters.period = value || null
    emit('change')
  },
})

function clear() {
  store.resetFilters()
  emit('change')
}
</script>

<template>
  <section class="filters">
    <div class="filters__grid">
      <BaseSelect v-model="client" :options="clientOptions" label="Cliente" searchable />
      <BaseMonthPicker v-model="period" label="Mes" />
    </div>

    <div class="filters__actions">
      <BaseButton
        v-if="store.activeFilterCount"
        variant="ghost"
        size="sm"
        icon="fa-solid fa-broom"
        @click="clear"
      >
        Limpiar filtros
      </BaseButton>
      <BaseButton variant="outline" size="sm" icon="fa-solid fa-file-csv" @click="emit('export')">
        Exportar CSV
      </BaseButton>
    </div>
  </section>
</template>

<style scoped lang="scss">
.filters {
  @include flex-col($sp-3);
  @include card($sp-4);
}

.filters__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include md {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include lg {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.filters__actions {
  @include flex(row, flex-end, center, $sp-2);
  flex-wrap: wrap;
}
</style>
