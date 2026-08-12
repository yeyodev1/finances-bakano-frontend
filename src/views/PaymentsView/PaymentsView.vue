<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseButton, BaseStatCard } from '@/components/base'
import PaymentsFilters from './PaymentsFilters.vue'
import PaymentsTable from './PaymentsTable.vue'
import InvoicePickerModal from './InvoicePickerModal.vue'
import PaymentModal from '@/views/CollectionsView/PaymentModal.vue'
import ReceiptPreviewModal from '@/components/payments/ReceiptPreviewModal.vue'
import type { Invoice } from '@/types'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useFormat } from '@/composables/useFormat'
import { PAYMENT_METHOD_LABELS, apiErrorMessage } from '@/stores/clients'
import { usePaymentsStore } from '@/stores/payments'
import type { Payment } from '@/types'

const store = usePaymentsStore()
const toast = useToast()
const { confirm } = useConfirm()
const { formatMoney, formatDateShort, formatPeriod } = useFormat()

const total = computed(() => store.filteredAmount)

async function load() {
  try {
    await store.fetch(1)
  } catch (error) {
    toast.error('Error al cargar pagos', apiErrorMessage(error))
  }
}

onMounted(load)

// Registrar pago desde /pagos: primero se elige el cobro, después se reutiliza
// el mismo PaymentModal que usa /cobros.
const pickerOpen = ref(false)
const payOpen = ref(false)
const target = ref<Invoice | null>(null)

function onPicked(invoice: Invoice) {
  target.value = invoice
  payOpen.value = true
}

async function onRegistered() {
  // El toast de éxito ya lo emite PaymentModal.
  target.value = null
  await load()
}

// Previsualización del comprobante sin salir del listado.
const previewOpen = ref(false)
const previewed = ref<Payment | null>(null)

function preview(payment: Payment) {
  previewed.value = payment
  previewOpen.value = true
}

async function remove(payment: Payment) {
  const ok = await confirm({
    title: 'Eliminar pago',
    message: `Se eliminará el pago de ${formatMoney(payment.amount)} de ${payment.clientName}. El cobro asociado volverá a quedar pendiente o vencido.`,
    confirmLabel: 'Eliminar pago',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await store.remove(payment._id)
    toast.success('Pago eliminado', 'El estado del cobro se revirtió.')
  } catch (error) {
    toast.error('No se pudo eliminar el pago', apiErrorMessage(error))
  }
}

function csvCell(value: string | number): string {
  const text = String(value ?? '')
  return /[",;\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function exportCsv() {
  if (!store.items.length) {
    toast.warning('Nada que exportar', 'No hay pagos en el filtro actual.')
    return
  }

  const header = ['Cliente', 'Monto', 'Fecha de pago', 'Período', 'Método', 'Referencia', 'Notas', 'Registró', 'Comprobante']
  const lines = store.items.map((p) =>
    [
      csvCell(p.clientName),
      csvCell(Number(p.amount).toFixed(2)),
      csvCell(formatDateShort(p.paidAt)),
      csvCell(formatPeriod(p.period)),
      csvCell(PAYMENT_METHOD_LABELS[p.method] || p.method),
      csvCell(p.reference || ''),
      csvCell(p.notes || ''),
      csvCell(p.registeredByName || ''),
      csvCell(p.receiptUrl || ''),
    ].join(';'),
  )

  const blob = new Blob([`﻿${[header.join(';'), ...lines].join('\n')}`], {
    type: 'text/csv;charset=utf-8;',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `pagos-bakano-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  toast.success('CSV generado', `${store.items.length} pagos exportados.`)
}
</script>

<template>
  <div class="payments">
    <header class="payments__header">
      <div class="payments__title">
        <h1><i class="fa-solid fa-receipt" aria-hidden="true" /> Pagos</h1>
        <p>Historial completo de pagos registrados</p>
      </div>

      <BaseButton
        variant="success"
        icon="fa-solid fa-hand-holding-dollar"
        @click="pickerOpen = true"
      >
        Registrar pago
      </BaseButton>
    </header>

    <div class="payments__stats">
      <BaseStatCard
        label="Total del filtro"
        :value="formatMoney(total)"
        icon="fa-solid fa-coins"
        color="success"
        :hint="`${store.items.length} pagos listados`"
      />
      <BaseStatCard
        label="Pagos registrados"
        :value="String(store.total)"
        icon="fa-solid fa-list-check"
        color="primary"
        hint="Coincidencias en el servidor"
      />
    </div>

    <PaymentsFilters @change="load" @export="exportCsv" />

    <PaymentsTable
      :items="store.items"
      :loading="store.loading"
      @remove="remove"
      @preview="preview"
    />

    <InvoicePickerModal v-model="pickerOpen" @picked="onPicked" @settled="load" />
    <PaymentModal v-model="payOpen" :invoice="target" @registered="onRegistered" />
    <ReceiptPreviewModal v-model="previewOpen" :payment="previewed" />
  </div>
</template>

<style scoped lang="scss">
.payments {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

.payments__header {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.payments__title {
  flex: 1 1 260px;
  min-width: 0;

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

.payments__stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include md {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
