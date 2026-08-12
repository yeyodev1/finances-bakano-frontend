<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { BaseButton, BaseDatePicker, BaseMonthPicker, BaseSelect } from '@/components/base'
import { PAYMENT_METHOD_OPTIONS, useClientsStore } from '@/stores/clients'
import { usePaymentsStore } from '@/stores/payments'
import type { PaymentMethod, SelectOption } from '@/types'

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

const methodOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'Todos los métodos', icon: 'fa-solid fa-wallet' },
  ...PAYMENT_METHOD_OPTIONS,
])

const client = computed<string | number | null>({
  get: () => store.filters.clientId ?? 'all',
  set: (value) => {
    store.filters.clientId = value === 'all' || value === null ? null : String(value)
    emit('change')
  },
})

const method = computed<string | number | null>({
  get: () => store.filters.method ?? 'all',
  set: (value) => {
    store.filters.method = value === 'all' || value === null ? null : (value as PaymentMethod)
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

const from = computed<string | null>({
  get: () => store.filters.from,
  set: (value) => {
    store.filters.from = value
    emit('change')
  },
})

const to = computed<string | null>({
  get: () => store.filters.to,
  set: (value) => {
    store.filters.to = value
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
      <BaseSelect v-model="method" :options="methodOptions" label="Método" />
      <BaseMonthPicker v-model="period" label="Período" />
      <BaseDatePicker v-model="from" label="Desde" placeholder="Sin límite" />
      <BaseDatePicker v-model="to" label="Hasta" placeholder="Sin límite" />
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
