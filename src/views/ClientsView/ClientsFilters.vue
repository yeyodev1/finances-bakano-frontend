<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { BaseSearchInput, BaseSelect, BaseButton } from '@/components/base'
import {
  ARCHIVED_FILTER_OPTIONS,
  BILLING_TYPE_LABELS,
  BILLING_TYPE_OPTIONS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_OPTIONS,
  useClientsStore,
} from '@/stores/clients'
import type { BillingType, PaymentMethod, SelectOption } from '@/types'

const emit = defineEmits<{ change: [] }>()

const store = useClientsStore()

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Todos los estados', icon: 'fa-solid fa-list' },
  { value: 'active', label: 'Activos', icon: 'fa-solid fa-circle-check', color: 'success' },
  { value: 'inactive', label: 'Inactivos', icon: 'fa-solid fa-circle-xmark', color: 'danger' },
]

const WORKSPACE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Espacio: todos', icon: 'fa-solid fa-layer-group' },
  { value: 'linked', label: 'Con espacio vinculado', icon: 'fa-solid fa-link' },
  { value: 'unlinked', label: 'Sin espacio vinculado', icon: 'fa-solid fa-link-slash' },
]

function onSearch(value: string) {
  store.filters.q = value
  emit('change')
}

/** Rubro del cliente. Las categorías se crean desde la app, no están fijas. */
onMounted(() => {
  if (!store.categories.length) store.fetchCategories().catch(() => undefined)
})

const categoryOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'Todas las categorías', icon: 'fa-solid fa-tags' },
  ...store.categories.map((c) => ({
    value: c._id,
    label: c.name,
    icon: c.icon || 'fa-solid fa-tag',
    description: c.clientCount ? `${c.clientCount} cliente(s)` : undefined,
  })),
])

const category = computed<string | number | null>({
  get: () => store.filters.categoryId ?? 'all',
  set: (value) => {
    store.filters.categoryId = value === 'all' || value === null ? null : String(value)
    emit('change')
  },
})

const method = computed<string | number | null>({
  get: () => store.filters.paymentMethod ?? 'all',
  set: (value) => {
    store.filters.paymentMethod = value === 'all' || value === null ? null : (value as PaymentMethod)
    emit('change')
  },
})

const billing = computed<string | number | null>({
  get: () => store.filters.billingType ?? 'all',
  set: (value) => {
    store.filters.billingType = value === 'all' || value === null ? null : (value as BillingType)
    emit('change')
  },
})

const status = computed<string | number | null>({
  get: () => (store.filters.isActive === null ? 'all' : store.filters.isActive ? 'active' : 'inactive'),
  set: (value) => {
    store.filters.isActive = value === 'active' ? true : value === 'inactive' ? false : null
    emit('change')
  },
})

const workspace = computed<string | number | null>({
  get: () =>
    store.filters.hasWorkspace === null ? 'all' : store.filters.hasWorkspace ? 'linked' : 'unlinked',
  set: (value) => {
    store.filters.hasWorkspace = value === 'linked' ? true : value === 'unlinked' ? false : null
    emit('change')
  },
})

const archived = computed<string | number | null>({
  get: () => {
    const value = store.filters.archived
    if (value === 'all') return 'all'
    return value ? 'archived' : 'active'
  },
  set: (value) => {
    store.filters.archived = value === 'archived' ? true : value === 'all' ? 'all' : false
    emit('change')
  },
})

const methodOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'Todos los métodos', icon: 'fa-solid fa-wallet' },
  ...PAYMENT_METHOD_OPTIONS,
])

const billingOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'Toda facturación', icon: 'fa-solid fa-file-invoice' },
  ...BILLING_TYPE_OPTIONS,
])

interface Chip {
  key: string
  label: string
  icon: string
}

const chips = computed<Chip[]>(() => {
  const list: Chip[] = []
  const f = store.filters
  if (f.q.trim()) list.push({ key: 'q', label: `"${f.q.trim()}"`, icon: 'fa-solid fa-magnifying-glass' })
  if (f.paymentMethod)
    list.push({
      key: 'paymentMethod',
      label: PAYMENT_METHOD_LABELS[f.paymentMethod],
      icon: 'fa-solid fa-wallet',
    })
  if (f.billingType)
    list.push({
      key: 'billingType',
      label: BILLING_TYPE_LABELS[f.billingType],
      icon: 'fa-solid fa-file-invoice',
    })
  if (f.isActive !== null)
    list.push({
      key: 'isActive',
      label: f.isActive ? 'Activos' : 'Inactivos',
      icon: 'fa-solid fa-toggle-on',
    })
  if (f.hasWorkspace !== null)
    list.push({
      key: 'hasWorkspace',
      label: f.hasWorkspace ? 'Con espacio' : 'Sin espacio',
      icon: 'fa-solid fa-layer-group',
    })
  if (f.archived !== false)
    list.push({
      key: 'archived',
      label: f.archived === 'all' ? 'Activos y archivados' : 'Solo archivados',
      icon: 'fa-solid fa-box-archive',
    })
  return list
})

function removeChip(key: string) {
  if (key === 'q') store.filters.q = ''
  if (key === 'paymentMethod') store.filters.paymentMethod = null
  if (key === 'billingType') store.filters.billingType = null
  if (key === 'isActive') store.filters.isActive = null
  if (key === 'hasWorkspace') store.filters.hasWorkspace = null
  if (key === 'archived') store.filters.archived = false
  emit('change')
}

function clearAll() {
  store.resetFilters()
  emit('change')
}
</script>

<template>
  <section class="filters">
    <div class="filters__row">
      <BaseSearchInput
        :model-value="store.filters.q"
        class="filters__search"
        placeholder="Buscar por nombre, contacto o email"
        @update:model-value="onSearch"
      />

      <div class="filters__selects">
        <BaseSelect v-model="method" :options="methodOptions" placeholder="Método de pago" />
        <BaseSelect v-model="billing" :options="billingOptions" placeholder="Facturación" />
        <BaseSelect v-model="category" :options="categoryOptions" placeholder="Categoría" searchable />
        <BaseSelect v-model="status" :options="STATUS_OPTIONS" placeholder="Estado" />
        <BaseSelect v-model="workspace" :options="WORKSPACE_OPTIONS" placeholder="Espacio" />
        <BaseSelect
          v-model="archived"
          :options="ARCHIVED_FILTER_OPTIONS"
          icon="fa-solid fa-box-archive"
          placeholder="Bajas"
        />
      </div>
    </div>

    <TransitionGroup name="list" tag="div" class="filters__chips">
      <button v-for="chip in chips" :key="chip.key" type="button" class="chip" @click="removeChip(chip.key)">
        <i :class="chip.icon" aria-hidden="true" />
        <span>{{ chip.label }}</span>
        <i class="fa-solid fa-xmark chip__x" aria-hidden="true" />
      </button>

      <BaseButton
        v-if="chips.length > 1"
        key="clear-all"
        variant="ghost"
        size="sm"
        icon="fa-solid fa-broom"
        @click="clearAll"
      >
        Limpiar
      </BaseButton>
    </TransitionGroup>
  </section>
</template>

<style scoped lang="scss">
.filters {
  @include flex-col($sp-3);
}

.filters__row {
  @include flex-col($sp-3);

  @include lg {
    @include flex(row, flex-start, center, $sp-3);
  }
}

.filters__search {
  width: 100%;

  @include lg {
    max-width: 340px;
  }
}

.filters__selects {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-2;
  flex: 1;

  @include lg {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: $sp-3;
  }
}

.filters__chips {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  min-height: 0;
}

.chip {
  @include flex-center($sp-2);
  @include pressable;
  padding: $sp-1 $sp-3;
  border-radius: $radius-full;
  border: 1px solid rgba($primary, 0.28);
  background: rgba($primary, 0.08);
  color: $primary;
  font-size: $fs-xs;
  font-weight: 600;
  cursor: pointer;
  transition: background $transition-base, border-color $transition-base;

  &:hover {
    background: rgba($primary, 0.16);
    border-color: $primary;
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.chip__x {
  font-size: 0.7em;
  opacity: 0.7;
}
</style>
