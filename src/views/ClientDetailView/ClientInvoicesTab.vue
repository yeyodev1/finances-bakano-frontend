<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseBadge, BaseButton, BaseEmptyState, BaseSkeleton } from '@/components/base'
import InvoiceReasonModal from '../CollectionsView/InvoiceReasonModal.vue'
import InvoiceDeferModal from '../CollectionsView/InvoiceDeferModal.vue'
import PaymentModal from '../CollectionsView/PaymentModal.vue'
import InvoicePickerModal from '../PaymentsView/InvoicePickerModal.vue'
import { useFormat } from '@/composables/useFormat'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/stores/clients'
import {
  INVOICE_STATUS_ICONS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONE,
  isDeferred,
  lastDeferral,
  useInvoicesStore,
} from '@/stores/invoices'
import type { Invoice } from '@/types'

const props = withDefaults(
  defineProps<{ clientId: string; clientName?: string }>(),
  { clientName: '' },
)

/** El pago cambia la mora del cliente, y esa cifra la pinta la cabecera. */
const emit = defineEmits<{ paid: [] }>()

const store = useInvoicesStore()
const toast = useToast()
const { confirm } = useConfirm()
const { formatMoney, formatPeriod, formatDateShort, daysDiff } = useFormat()

const reasonOpen = ref(false)
const reasonAction = ref<'waive' | 'cancel'>('waive')
const reasonTarget = ref<Invoice | null>(null)
const reasonLoading = ref(false)
const deferOpen = ref(false)
const deferTarget = ref<Invoice | null>(null)
const payOpen = ref(false)
const payTarget = ref<Invoice | null>(null)
const pickerOpen = ref(false)

async function load() {
  try {
    await store.fetchByClient(props.clientId)
  } catch (error) {
    toast.error('No se pudieron cargar los cobros', apiErrorMessage(error))
  }
}

onMounted(load)

const now = new Date()
const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

/**
 * Genera el cobro del mes en curso solo para este cliente. Usa el mismo motor
 * que el cron (respeta startDate, billingStartPeriod y cobros divididos), así
 * que el resultado es idéntico al que habría salido en la corrida mensual.
 */
async function generateThisMonth() {
  try {
    const result = await store.generate(currentPeriod, false, [props.clientId])
    if (result.created > 0) {
      toast.success('Cobro generado', `Ya puedes registrarle el pago a este cliente.`)
    } else {
      toast.warning(
        'No se generó ningún cobro',
        'Revisa que el cliente esté activo, con monto mayor a cero y que su fecha de inicio caiga dentro del período.',
      )
    }
    await load()
  } catch (error) {
    toast.error('No se pudo generar el cobro', apiErrorMessage(error))
  }
}

const openInvoices = computed(() => store.items.filter(isOpen))

const openBalance = computed(() =>
  openInvoices.value.reduce((acc, inv) => acc + balanceOf(inv), 0),
)

function balanceOf(invoice: Invoice): number {
  return Math.max(Number(invoice.amount) - Number(invoice.paidAmount || 0), 0)
}

/**
 * Con el cobro ya elegido se va directo a PaymentModal. El picker solo aparece
 * cuando no hay un cobro concreto: para saldar varios de una o para crear el que
 * falta cuando el cliente todavía no tiene ninguno.
 */
function openPay(invoice: Invoice) {
  payTarget.value = invoice
  payOpen.value = true
}

/** Con un solo cobro abierto no hay nada que elegir: se va derecho al pago. */
function payOnlyOpen() {
  const invoice = openInvoices.value[0]
  if (invoice) openPay(invoice)
}

function onPicked(invoice: Invoice) {
  payTarget.value = invoice
  payOpen.value = true
}

async function onPaid() {
  await load()
  emit('paid')
}

function overdueDays(invoice: Invoice): number {
  const diff = daysDiff(invoice.dueDate)
  return diff !== null && diff < 0 ? Math.abs(diff) : 0
}

function isOpen(invoice: Invoice): boolean {
  return ['pending', 'partial', 'overdue'].includes(invoice.status)
}

/**
 * Un cobro saldado no "vence": mostrar igual la fecha de vencimiento hacía leer
 * como deuda algo ya cobrado. Cerrado se informa cuándo se pagó.
 */
function isSettled(invoice: Invoice): boolean {
  return invoice.status === 'paid'
}

function previousDueLabel(invoice: Invoice): string {
  const original = invoice.originalDueDate || lastDeferral(invoice)?.previousDueDate
  return original ? `antes: ${formatDateShort(original)}` : ''
}

function openDefer(invoice: Invoice) {
  deferTarget.value = invoice
  deferOpen.value = true
}

async function undoDefer(invoice: Invoice) {
  const ok = await confirm({
    title: 'Deshacer la última prórroga',
    message: 'El vencimiento volverá a su fecha anterior. El acuerdo queda en el historial.',
    confirmLabel: 'Deshacer prórroga',
    variant: 'warning',
    icon: 'fa-solid fa-clock-rotate-left',
  })
  if (!ok) return

  try {
    await store.undoDefer(invoice._id)
    toast.success('Prórroga deshecha', formatPeriod(invoice.period))
  } catch (error) {
    toast.error('No se pudo deshacer la prórroga', apiErrorMessage(error))
  }
}

function openReason(invoice: Invoice, kind: 'waive' | 'cancel') {
  reasonTarget.value = invoice
  reasonAction.value = kind
  reasonOpen.value = true
}

async function applyReason(reason: string) {
  const invoice = reasonTarget.value
  if (!invoice) return
  const isWaive = reasonAction.value === 'waive'
  reasonLoading.value = true
  try {
    if (isWaive) await store.waive(invoice._id, reason)
    else await store.cancel(invoice._id, reason)
    toast.success(isWaive ? 'Cobro condonado' : 'Cobro anulado', formatPeriod(invoice.period))
    reasonOpen.value = false
  } catch (error) {
    toast.error('No se pudo completar la acción', apiErrorMessage(error))
  } finally {
    reasonLoading.value = false
  }
}
</script>

<template>
  <div class="tab">
    <!--
      El pago es la acción principal de esta pestaña: antes había que salir a
      /pagos y volver a buscar al cliente para poder registrarlo.
    -->
    <section v-if="!store.loading && store.items.length" class="bar">
      <div class="bar__balance">
        <span class="bar__label">
          {{ openInvoices.length ? 'Saldo pendiente' : 'Sin saldo pendiente' }}
        </span>
        <span class="bar__value" :class="{ 'bar__value--clear': !openBalance }">
          {{ formatMoney(openBalance) }}
          <span v-if="openInvoices.length" class="bar__count">
            en {{ openInvoices.length }} cobro{{ openInvoices.length === 1 ? '' : 's' }}
          </span>
        </span>
      </div>

      <div class="bar__actions">
        <BaseButton
          v-if="openInvoices.length === 1"
          variant="success"
          icon="fa-solid fa-hand-holding-dollar"
          @click="payOnlyOpen"
        >
          Registrar pago
        </BaseButton>
        <BaseButton
          v-else
          variant="success"
          icon="fa-solid fa-hand-holding-dollar"
          @click="pickerOpen = true"
        >
          {{ openInvoices.length > 1 ? 'Registrar pago' : 'Registrar pago de otro período' }}
        </BaseButton>
      </div>
    </section>

    <div v-if="store.loading" class="tab__skeleton">
      <BaseSkeleton v-for="n in 5" :key="n" height="72px" />
    </div>

    <BaseEmptyState
      v-else-if="!store.items.length"
      icon="fa-solid fa-file-invoice-dollar"
      title="Sin cobros"
      :message="`Este cliente se dio de alta después de que se generaran los cobros de ${formatPeriod(currentPeriod)}, así que todavía no tiene ninguno. Genéralo para poder registrarle pagos y que quede su histórico.`"
    >
      <template #action>
        <BaseButton
          icon="fa-solid fa-wand-magic-sparkles"
          :loading="store.working"
          @click="generateThisMonth"
        >
          Generar cobro de {{ formatPeriod(currentPeriod) }}
        </BaseButton>
        <BaseButton
          variant="outline"
          icon="fa-solid fa-hand-holding-dollar"
          @click="pickerOpen = true"
        >
          Ya me pagó
        </BaseButton>
      </template>
    </BaseEmptyState>

    <TransitionGroup v-else name="list" tag="div" class="rows">
      <article v-for="invoice in store.items" :key="invoice._id" class="row">
        <div class="row__main">
          <p class="row__period">
            {{ formatPeriod(invoice.period) }}
            <span v-if="invoice.splitLabel" class="row__split">· {{ invoice.splitLabel }}</span>
          </p>
          <p v-if="isSettled(invoice)" class="row__due row__due--paid">
            <i class="fa-solid fa-circle-check" aria-hidden="true" />
            Pagado {{ invoice.paidAt ? formatDateShort(invoice.paidAt) : '' }}
            <span class="row__prev">· vencía {{ formatDateShort(invoice.dueDate) }}</span>
          </p>
          <p v-else class="row__due">
            <i class="fa-solid fa-calendar-check" aria-hidden="true" />
            Vence {{ formatDateShort(invoice.dueDate) }}
            <span v-if="overdueDays(invoice)" class="row__late">
              · {{ overdueDays(invoice) }} días de mora
            </span>
            <span v-if="previousDueLabel(invoice)" class="row__prev">· {{ previousDueLabel(invoice) }}</span>
          </p>
          <div v-if="isDeferred(invoice) || invoice.isAdvance" class="row__tags">
            <BaseBadge v-if="isDeferred(invoice)" variant="info" icon="fa-solid fa-calendar-plus" size="sm">
              Prorrogado
            </BaseBadge>
            <BaseBadge v-if="invoice.isAdvance" variant="secondary" icon="fa-solid fa-forward" size="sm">
              Anticipado
            </BaseBadge>
          </div>
        </div>

        <div class="row__amounts">
          <span class="row__amount">{{ formatMoney(invoice.amount) }}</span>
          <span v-if="invoice.paidAmount > 0" class="row__paid">
            Pagado {{ formatMoney(invoice.paidAmount) }}
          </span>
        </div>

        <BaseBadge :variant="INVOICE_STATUS_TONE[invoice.status]" :icon="INVOICE_STATUS_ICONS[invoice.status]">
          {{ INVOICE_STATUS_LABELS[invoice.status] }}
        </BaseBadge>

        <div v-if="isOpen(invoice)" class="row__actions">
          <BaseButton
            size="sm"
            variant="success"
            icon="fa-solid fa-hand-holding-dollar"
            @click="openPay(invoice)"
          >
            Registrar pago
          </BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-calendar-plus" @click="openDefer(invoice)">
            Aplazar cobro
          </BaseButton>
          <BaseButton
            v-if="isDeferred(invoice)"
            size="sm"
            variant="ghost"
            icon="fa-solid fa-clock-rotate-left"
            @click="undoDefer(invoice)"
          >
            Deshacer
          </BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-hand-holding-heart" @click="openReason(invoice, 'waive')">
            Condonar
          </BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-ban" @click="openReason(invoice, 'cancel')">
            Anular
          </BaseButton>
        </div>
      </article>
    </TransitionGroup>

    <InvoiceReasonModal
      v-model="reasonOpen"
      :action="reasonAction"
      :invoice="reasonTarget"
      :loading="reasonLoading"
      @confirm="applyReason"
    />

    <InvoiceDeferModal v-model="deferOpen" :invoice="deferTarget" @deferred="load" />

    <InvoicePickerModal
      v-model="pickerOpen"
      :client-id="props.clientId"
      :client-name="props.clientName"
      @picked="onPicked"
      @settled="onPaid"
    />

    <PaymentModal v-model="payOpen" :invoice="payTarget" @registered="onPaid" />
  </div>
</template>

<style scoped lang="scss">
.tab,
.tab__skeleton,
.rows {
  @include flex-col($sp-3);
}

.bar {
  @include card($sp-4);
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;

  > * {
    flex: 1 1 200px;
    min-width: 0;
  }
}

.bar__balance {
  @include flex-col(2px);
}

.bar__label {
  @include label-text;
}

.bar__value {
  @include flex(row, flex-start, baseline, $sp-2);
  flex-wrap: wrap;
  font-size: $fs-lg;
  font-weight: 800;
  color: $alert-error;

  // Sin deuda el número deja de ser una alarma.
  &--clear {
    color: $alert-success;
  }
}

.bar__count {
  font-size: $fs-xs;
  font-weight: 600;
  color: $text-secondary;
}

.bar__actions {
  @include flex(row, flex-end, center, $sp-2);
  flex-wrap: wrap;
}

.row {
  @include card($sp-4);
  @include flex-col($sp-3);

  @include lg {
    display: grid;
    grid-template-columns: 1.6fr 1fr auto auto;
    align-items: center;
    gap: $sp-4;
  }
}

.row__period {
  font-weight: 700;
  color: $primary-dark;
}

.row__split {
  font-weight: 500;
  color: $text-secondary;
  font-size: $fs-xs;
}

.row__due {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: $sp-1;

  // El color no es la única señal: el icono cambia a check-circle.
  &--paid i { color: $alert-success; }
}

.row__late {
  color: $alert-error;
  font-weight: 700;
}

.row__prev {
  color: $alert-info;
  font-weight: 600;
}

.row__tags {
  @include flex(row, flex-start, center, $sp-1);
  flex-wrap: wrap;
  margin-top: $sp-2;
}

.row__amounts {
  @include flex-col(2px);
}

.row__amount {
  font-weight: 800;
  color: $primary-dark;
}

.row__paid {
  font-size: $fs-xs;
  color: $alert-success;
}

.row__actions {
  @include flex(row, flex-start, center, $sp-1);
  flex-wrap: wrap;
}
</style>
