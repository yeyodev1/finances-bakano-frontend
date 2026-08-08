<script setup lang="ts">
import { computed } from 'vue'
import { BaseSearchInput, BaseSelect, BaseSwitch } from '@/components/base'
import type { WorkspaceFilters } from '@/stores/workspaces'
import type { SelectOption } from '@/types'

const filters = defineModel<WorkspaceFilters>({ required: true })

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Todos los estados', icon: 'fa-solid fa-list' },
  { value: 'active', label: 'Activos', icon: 'fa-solid fa-circle-check' },
  { value: 'inactive', label: 'Inactivos', icon: 'fa-solid fa-circle-xmark' },
]

const status = computed<string | number | null>({
  get: () => (filters.value.isActive === null ? 'all' : filters.value.isActive ? 'active' : 'inactive'),
  set: (value) => {
    filters.value.isActive = value === 'active' ? true : value === 'inactive' ? false : null
  },
})

const q = computed<string>({
  get: () => filters.value.q,
  set: (value) => {
    filters.value.q = value
  },
})

const unlinkedOnly = computed<boolean>({
  get: () => filters.value.unlinkedOnly,
  set: (value) => {
    filters.value.unlinkedOnly = value
  },
})

const shouldBeClosedOnly = computed<boolean>({
  get: () => filters.value.shouldBeClosedOnly,
  set: (value) => {
    filters.value.shouldBeClosedOnly = value
  },
})

const overrideOnly = computed<boolean>({
  get: () => filters.value.overrideOnly,
  set: (value) => {
    filters.value.overrideOnly = value
  },
})
</script>

<template>
  <section class="wsf">
    <div class="wsf__row">
      <BaseSearchInput v-model="q" placeholder="Buscar espacio, admin, página o cliente" />
      <BaseSelect v-model="status" :options="STATUS_OPTIONS" placeholder="Estado" />
    </div>

    <div class="wsf__switches">
      <BaseSwitch v-model="unlinkedOnly" label="Sin cliente vinculado" />
      <BaseSwitch v-model="shouldBeClosedOnly" label="Deberían estar cerrados" />
      <BaseSwitch v-model="overrideOnly" label="Con acceso por excepción" />
    </div>
  </section>
</template>

<style scoped lang="scss">
.wsf {
  @include flex-col($sp-3);
  @include card($sp-4);
}

.wsf__row {
  @include flex-col($sp-3);

  @include lg {
    @include flex(row, flex-start, center, $sp-4);

    > * {
      flex: 1 1 0;
    }
  }
}

.wsf__switches {
  @include flex(row, flex-start, center, $sp-4);
  flex-wrap: wrap;
}
</style>
