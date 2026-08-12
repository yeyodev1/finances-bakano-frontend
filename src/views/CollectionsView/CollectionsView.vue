<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { BasePagination } from '@/components/base'
import CollectionsHeader from './CollectionsHeader.vue'
import CollectionsTable from './CollectionsTable.vue'
import CollectionsOverview from './CollectionsOverview.vue'
import PaymentModal from './PaymentModal.vue'
import InvoiceReasonModal from './InvoiceReasonModal.vue'
import InvoiceDeferModal from './InvoiceDeferModal.vue'
import AdvanceInvoiceModal from './AdvanceInvoiceModal.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { lastDeferral, useInvoicesStore } from '@/stores/invoices'
import type { Invoice } from '@/types'

const store = useInvoicesStore()
const toast = useToast()
const { confirm } = useConfirm()
const { formatPeriod, formatDateShort } = useFormat()

const payOpen = ref(false)
const reasonOpen = ref(false)
const deferOpen = ref(false)
const advanceOpen = ref(false)
const reasonLoading = ref(false)
const reasonAction = ref<'waive' | 'cancel'>('waive')
const selected = ref<Invoice | null>(null)
const deferTarget = ref<Invoice | null>(null)

// El resumen se recarga junto al resto: al registrar un pago cambian el período,
// las semanas y lo atrasado, y dejarlo desfasado sería peor que no mostrarlo.
const overviewRef = ref<{ reload: () => Promise<void> } | null>(null)

async function refresh() {
  try {
    await Promise.all([store.fetch(1), store.fetchSummary(), overviewRef.value?.reload()])
  } catch (error) {
    toast.error('No se pudieron cargar los cobros', apiErrorMessage(error))
  }
}

onMounted(refresh)

/** Cambiar de página no recarga el resumen ni el pronóstico: no dependen de ella. */
async function goToPage(page: number) {
  try {
    await store.fetch(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    toast.error('No se pudo cargar la página', apiErrorMessage(error))
  }
}

function openPay(invoice: Invoice) {
  selected.value = invoice
  payOpen.value = true
}

function openReason(invoice: Invoice, action: 'waive' | 'cancel') {
  selected.value = invoice
  reasonAction.value = action
  reasonOpen.value = true
}

async function applyReason(reason: string) {
  const invoice = selected.value
  if (!invoice) return
  const isWaive = reasonAction.value === 'waive'
  reasonLoading.value = true
  try {
    if (isWaive) await store.waive(invoice._id, reason)
    else await store.cancel(invoice._id, reason)
    toast.success(isWaive ? 'Cobro condonado' : 'Cobro anulado', `${invoice.clientName} · ${formatPeriod(invoice.period)}`)
    reasonOpen.value = false
    await store.fetchSummary()
  } catch (error) {
    toast.error('No se pudo completar la acción', apiErrorMessage(error))
  } finally {
    reasonLoading.value = false
  }
}

async function onRegistered() {
  await refresh()
}

function openDefer(invoice: Invoice) {
  deferTarget.value = invoice
  deferOpen.value = true
}

async function undoDefer(invoice: Invoice) {
  const previous = lastDeferral(invoice)?.previousDueDate || invoice.originalDueDate
  const ok = await confirm({
    title: 'Deshacer la última prórroga',
    message: previous
      ? `El vencimiento volverá al ${formatDateShort(previous)}. El acuerdo queda registrado en el historial.`
      : 'El vencimiento volverá a su fecha anterior. El acuerdo queda registrado en el historial.',
    confirmLabel: 'Deshacer prórroga',
    variant: 'warning',
    icon: 'fa-solid fa-clock-rotate-left',
  })
  if (!ok) return

  try {
    await store.undoDefer(invoice._id)
    toast.success('Prórroga deshecha', `${invoice.clientName} · ${formatPeriod(invoice.period)}`)
    await refresh()
  } catch (error) {
    toast.error('No se pudo deshacer la prórroga', apiErrorMessage(error))
  }
}

/**
 * Acción sobre varios cobros. Se recorren uno a uno con los endpoints que ya
 * existen en vez de inventar uno en lote: son pocos registros y así cada cambio
 * conserva su motivo y su entrada de auditoría individual.
 */
const tableRef = ref<{ clearSelection: () => void } | null>(null)

async function onBulk(action: 'waive' | 'cancel' | 'defer', invoices: Invoice[]) {
  if (!invoices.length) return

  if (action === 'defer') {
    toast.warning(
      'Aplaza uno por uno',
      'Cada prórroga necesita su nueva fecha y su motivo, así que no se puede aplicar en lote.',
    )
    return
  }

  const isWaive = action === 'waive'
  const ok = await confirm({
    title: isWaive ? `Condonar ${invoices.length} cobros` : `Anular ${invoices.length} cobros`,
    message: `Se aplicará el mismo motivo a los ${invoices.length} cobros seleccionados. Queda registrado en el historial de cada uno.`,
    confirmLabel: isWaive ? 'Condonar todos' : 'Anular todos',
    variant: 'danger',
  })
  if (!ok) return

  const reason = isWaive ? 'Condonado en lote' : 'Anulado en lote'
  let done = 0
  const failed: string[] = []

  for (const invoice of invoices) {
    try {
      if (isWaive) await store.waive(invoice._id, reason)
      else await store.cancel(invoice._id, reason)
      done += 1
    } catch {
      failed.push(invoice.clientName)
    }
  }

  tableRef.value?.clearSelection()
  await refresh()

  if (failed.length) {
    toast.warning(
      `${done} de ${invoices.length} aplicados`,
      `No se pudo con: ${failed.join(', ')}`,
    )
  } else {
    toast.success(isWaive ? 'Cobros condonados' : 'Cobros anulados', `${done} cobros actualizados.`)
  }
}

async function onDeferred() {
  await refresh()
}

function payAdvance(invoice: Invoice) {
  selected.value = invoice
  payOpen.value = true
}

async function onAdvanceCreated() {
  await refresh()
}
</script>

<template>
  <div class="collections">
    <CollectionsHeader @refresh="refresh" @advance="advanceOpen = true" />

    <CollectionsOverview ref="overviewRef" />

    <CollectionsTable
      ref="tableRef"
      :items="store.items"
      :loading="store.loading"
      @pay="openPay"
      @waive="(invoice: Invoice) => openReason(invoice, 'waive')"
      @cancel="(invoice: Invoice) => openReason(invoice, 'cancel')"
      @defer="openDefer"
      @undo-defer="undoDefer"
      @bulk="onBulk"
    />

    <BasePagination
      :page="store.page"
      :pages="store.pages"
      :total="store.total"
      :limit="store.limit"
      :disabled="store.loading"
      item-label="cobros"
      @update:page="goToPage"
    />

    <PaymentModal v-model="payOpen" :invoice="selected" @registered="onRegistered" />

    <InvoiceDeferModal v-model="deferOpen" :invoice="deferTarget" @deferred="onDeferred" />

    <AdvanceInvoiceModal v-model="advanceOpen" @created="onAdvanceCreated" @pay="payAdvance" />

    <InvoiceReasonModal
      v-model="reasonOpen"
      :action="reasonAction"
      :invoice="selected"
      :loading="reasonLoading"
      @confirm="applyReason"
    />
  </div>
</template>

<style scoped lang="scss">
.collections {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}
</style>
