<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton, BaseMonthPicker, BaseSearchInput, BaseSelect } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/stores/clients'
import { INVOICE_STATUS_OPTIONS, useInvoicesStore } from '@/stores/invoices'
import { useFormat } from '@/composables/useFormat'
import type { InvoiceStatus, SelectOption } from '@/types'

const emit = defineEmits<{ refresh: []; advance: [] }>()

const store = useInvoicesStore()
const toast = useToast()
const { confirm } = useConfirm()
const { formatPeriod } = useFormat()

const statusOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'Todos los estados', icon: 'fa-solid fa-list' },
  ...INVOICE_STATUS_OPTIONS,
])

const period = computed<string>({
  get: () => store.filters.period,
  set: (value) => {
    store.filters.period = value
    emit('refresh')
  },
})

const status = computed<string | number | null>({
  get: () => store.filters.status ?? 'all',
  set: (value) => {
    store.filters.status = value === 'all' || value === null ? null : (value as InvoiceStatus)
    emit('refresh')
  },
})

function onSearch(value: string) {
  store.filters.q = value
  emit('refresh')
}

const SPECIAL_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Todos los cobros', icon: 'fa-solid fa-list' },
  { value: 'deferred', label: 'Solo prorrogados', icon: 'fa-solid fa-calendar-plus', color: 'info' },
  { value: 'advance', label: 'Solo anticipados', icon: 'fa-solid fa-forward', color: 'secondary' },
]

const special = computed<string | number | null>({
  get: () => {
    if (store.filters.deferredOnly) return 'deferred'
    if (store.filters.advanceOnly) return 'advance'
    return 'all'
  },
  set: (value) => {
    store.filters.deferredOnly = value === 'deferred'
    store.filters.advanceOnly = value === 'advance'
    emit('refresh')
  },
})

async function generate() {
  const ok = await confirm({
    title: 'Generar cobros del mes',
    message: `Se crearán los cobros de ${formatPeriod(store.filters.period)} para todos los clientes activos. Los cobros ya existentes no se duplican.`,
    confirmLabel: 'Generar',
    variant: 'primary',
  })
  if (!ok) return

  try {
    const result = await store.generate(store.filters.period)
    toast.success(
      'Cobros generados',
      `${result.created} creados y ${result.skipped} omitidos en ${formatPeriod(result.period)}.`,
    )
    emit('refresh')
  } catch (error) {
    toast.error('No se pudieron generar los cobros', apiErrorMessage(error))
  }
}

async function recalc() {
  const ok = await confirm({
    title: 'Recalcular vencidos',
    message: 'Se revisarán todos los cobros abiertos y se marcarán como vencidos los que superen su fecha límite.',
    confirmLabel: 'Recalcular',
    variant: 'warning',
  })
  if (!ok) return

  try {
    const result = await store.recalc()
    toast.success('Recálculo completado', `${result.updated} cobros actualizados.`)
    emit('refresh')
  } catch (error) {
    toast.error('No se pudo recalcular', apiErrorMessage(error))
  }
}
</script>

<template>
  <header class="head">
    <div class="head__top">
      <div class="head__title">
        <h1><i class="fa-solid fa-file-invoice-dollar" aria-hidden="true" /> Cobros del mes</h1>
        <p>{{ formatPeriod(store.filters.period) }} · {{ store.total }} cobros</p>
      </div>

      <div class="head__actions">
        <BaseButton icon="fa-solid fa-wand-magic-sparkles" :loading="store.working" @click="generate">
          Generar cobros del mes
        </BaseButton>
        <BaseButton variant="success" icon="fa-solid fa-forward" @click="emit('advance')">
          Cobro anticipado
        </BaseButton>
        <BaseButton variant="outline" icon="fa-solid fa-rotate" :loading="store.working" @click="recalc">
          Recalcular vencidos
        </BaseButton>
      </div>
    </div>

    <div class="head__filters">
      <BaseMonthPicker v-model="period" label="Período" />
      <BaseSelect v-model="status" :options="statusOptions" label="Estado" />
      <BaseSelect v-model="special" :options="SPECIAL_OPTIONS" label="Tipo de cobro" />
      <BaseSearchInput
        :model-value="store.filters.q"
        class="head__search"
        placeholder="Buscar cliente"
        @update:model-value="onSearch"
      />
    </div>
  </header>
</template>

<style scoped lang="scss">
.head {
  @include flex-col($sp-4);
}

.head__top {
  @include flex-col($sp-3);

  @include md {
    @include flex-between(flex-end, $sp-4);
  }
}

.head__title {
  h1 {
    @include flex(row, flex-start, center, $sp-3);
    font-size: $fs-xl;
    font-weight: 800;
    color: $primary-dark;

    i {
      color: $primary;
    }
  }

  p {
    font-size: $fs-xs;
    color: $text-secondary;
    margin-top: $sp-1;
  }
}

.head__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.head__filters {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include md {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include lg {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.head__search {
  width: 100%;
}
</style>
