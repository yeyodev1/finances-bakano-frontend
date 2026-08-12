<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BaseBadge,
  BaseButton,
  BaseCurrencyInput,
  BaseDatePicker,
  BaseModal,
  BaseSelect,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { useSalesStore } from '@/stores/sales'
import { useUsersStore } from '@/stores/users'
import {
  INSTALLMENT_ICON,
  INSTALLMENT_LABEL,
  INSTALLMENT_TONE,
  SALE_STATUS_ICON,
  SALE_STATUS_TONE,
  lostReasonLabel,
} from '@/config/saleOptions'
import SaleBillingFields from './SaleBillingFields.vue'
import { SALE_FREQUENCY_LABELS, SALE_ITEM_KIND_LABELS, SALE_STATUS_LABELS } from '@/types'
import type { BadgeVariant } from '@/components/base'
import type { Sale, SaleBilling, SaleInstallment, SelectOption } from '@/types'

const props = defineProps<{ modelValue: boolean; sale: Sale | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; lose: [sale: Sale] }>()

const sales = useSalesStore()
const users = useUsersStore()
const toast = useToast()
const { formatMoney, formatDateShort, formatDate, toISODate } = useFormat()

/** La venta viva sale del store: tras cada cobro se reemplaza ahí. */
const current = computed<Sale | null>(
  () => sales.items.find((s) => s._id === props.sale?._id) ?? props.sale,
)

const payingIndex = ref<number | null>(null)
const payAmount = ref(0)
const payDate = ref('')

const movingIndex = ref<number | null>(null)
const moveDate = ref('')

const userOptions = computed<SelectOption[]>(() =>
  users.items
    .filter((u) => u.isActive)
    .map((u) => ({ value: u._id, label: u.name, description: u.email, image: u.photoUrl || null })),
)

const ownerModel = computed<string | number | null>({
  get: () => current.value?.ownerId ?? null,
  set: (value) => {
    if (value && current.value) void changeOwner(String(value))
  },
})

const collected = computed(() => (current.value ? sales.collectedOf(current.value) : 0))
const pending = computed(() => (current.value ? sales.pendingOf(current.value) : 0))

// Factura editable desde el detalle: quien cobra suele completarla después.
const editingBilling = ref(false)
const billingDraft = ref<SaleBilling>({ needsInvoice: false })

/** Falta el número de factura habiéndose pedido: hay que avisarlo, no esconderlo. */
const invoiceMissing = computed(
  () => !!current.value?.billing?.needsInvoice && !current.value?.billing?.invoiceNumber,
)

function startBilling() {
  billingDraft.value = { ...(current.value?.billing ?? { needsInvoice: false }) }
  editingBilling.value = true
}

async function saveBilling() {
  const sale = current.value
  if (!sale) return
  try {
    await sales.updateBilling(sale._id, billingDraft.value)
    toast.success('Datos de factura guardados', 'Quien cobre ya los tiene a mano.')
    editingBilling.value = false
  } catch (error) {
    toast.error('No se pudieron guardar', apiErrorMessage(error))
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    payingIndex.value = null
    movingIndex.value = null
    editingBilling.value = false
    if (!users.items.length) users.fetch().catch(() => undefined)
  },
)

function startPay(item: SaleInstallment) {
  payingIndex.value = item.index
  movingIndex.value = null
  payAmount.value = Number(item.amount)
  payDate.value = toISODate(new Date()) || ''
}

function startMove(item: SaleInstallment) {
  movingIndex.value = item.index
  payingIndex.value = null
  moveDate.value = toISODate(item.dueDate) || ''
}

async function confirmPay() {
  const sale = current.value
  if (!sale || payingIndex.value === null) return
  try {
    await sales.payInstallment(sale._id, payingIndex.value, {
      amount: Number(payAmount.value),
      paidAt: payDate.value || undefined,
    })
    toast.success('Cobro registrado', `${formatMoney(Number(payAmount.value))} de ${sale.businessName}`)
    payingIndex.value = null
  } catch (error) {
    toast.error('No se pudo registrar el cobro', apiErrorMessage(error))
  }
}

async function confirmMove() {
  const sale = current.value
  if (!sale || movingIndex.value === null || !moveDate.value) return
  try {
    await sales.reschedule(sale._id, movingIndex.value, { newDueDate: moveDate.value })
    toast.success('Fecha movida', 'Queda registrada la fecha anterior en el historial.')
    movingIndex.value = null
  } catch (error) {
    toast.error('No se pudo mover la fecha', apiErrorMessage(error))
  }
}

async function changeOwner(ownerId: string) {
  const sale = current.value
  if (!sale || sale.ownerId === ownerId) return
  try {
    const updated = await sales.changeOwner(sale._id, ownerId)
    toast.success('Responsable actualizado', `Ahora cobra ${updated.ownerName}`)
  } catch (error) {
    toast.error('No se pudo reasignar', apiErrorMessage(error))
  }
}

async function reopen() {
  const sale = current.value
  if (!sale) return
  try {
    await sales.reopen(sale._id)
    toast.success('Venta reabierta', 'Vuelve al circuito de cobro.')
  } catch (error) {
    toast.error('No se pudo reabrir', apiErrorMessage(error))
  }
}

function toneOf(item: SaleInstallment): BadgeVariant {
  return INSTALLMENT_TONE[item.status] as BadgeVariant
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="current?.businessName ?? 'Venta'"
    :subtitle="current ? `${SALE_FREQUENCY_LABELS[current.frequency]} · cerró ${current.soldByName}` : ''"
    icon="fa-solid fa-handshake"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="current" class="detail">
      <header class="detail__head">
        <BaseBadge
          :variant="(SALE_STATUS_TONE[current.status] as BadgeVariant)"
          :icon="SALE_STATUS_ICON[current.status]"
        >
          {{ SALE_STATUS_LABELS[current.status] }}
        </BaseBadge>
        <div class="detail__figures">
          <span>Acordado <strong>{{ formatMoney(current.amount) }}</strong></span>
          <span>Cobrado <strong class="ok">{{ formatMoney(collected) }}</strong></span>
          <span>Por cobrar <strong class="pend">{{ formatMoney(pending) }}</strong></span>
        </div>
      </header>

      <section v-if="current.status === 'perdida'" class="detail__lost">
        <i class="fa-solid fa-circle-xmark" aria-hidden="true" />
        <div>
          <p class="detail__lost-title">
            Perdida · {{ lostReasonLabel(current.lostReason) }}
            <span v-if="current.lostAt">· {{ formatDateShort(current.lostAt) }}</span>
          </p>
          <p v-if="current.lostNotes">{{ current.lostNotes }}</p>
        </div>
        <BaseButton size="sm" variant="ghost" icon="fa-solid fa-rotate-left" @click="reopen">
          Reabrir
        </BaseButton>
      </section>

      <section v-if="current.items?.length" class="detail__block">
        <h3 class="detail__title">
          <i class="fa-solid fa-list-check" aria-hidden="true" /> Qué se vendió
        </h3>
        <ul class="conceptos">
          <li v-for="(item, i) in current.items" :key="i" class="concepto">
            <div class="concepto__main">
              <span class="concepto__name">{{ item.concept }}</span>
              <span class="concepto__kind">{{ SALE_ITEM_KIND_LABELS[item.kind] }}</span>
            </div>
            <p v-if="item.description" class="concepto__desc">{{ item.description }}</p>
            <span class="concepto__amount">{{ formatMoney(item.amount) }}</span>
          </li>
        </ul>
      </section>

      <BaseSelect
        v-model="ownerModel"
        :options="userOptions"
        label="Responsable de cobrarla"
        icon="fa-solid fa-hand-holding-dollar"
        searchable
      />

      <section class="detail__block">
        <div class="detail__title-row">
          <h3 class="detail__title">
            <i class="fa-solid fa-file-invoice" aria-hidden="true" /> Datos de factura
          </h3>
          <BaseButton
            v-if="!editingBilling"
            size="sm"
            variant="ghost"
            icon="fa-solid fa-pen"
            @click="startBilling"
          >
            Editar
          </BaseButton>
        </div>

        <template v-if="!editingBilling">
          <p v-if="invoiceMissing" class="detail__warn">
            <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            Pide factura y todavía no tiene número cargado.
          </p>

          <dl v-if="current.billing?.needsInvoice" class="factura">
            <div><dt>Razón social</dt><dd>{{ current.billing.legalName || '—' }}</dd></div>
            <div><dt>RUC / Cédula</dt><dd>{{ current.billing.taxId || '—' }}</dd></div>
            <div><dt>Correo</dt><dd>{{ current.billing.email || '—' }}</dd></div>
            <div><dt>Teléfono</dt><dd>{{ current.billing.phone || '—' }}</dd></div>
            <div><dt>Dirección</dt><dd>{{ current.billing.address || '—' }}</dd></div>
            <div>
              <dt>N.º de factura</dt>
              <dd>
                {{ current.billing.invoiceNumber || 'Sin emitir' }}
                <span v-if="current.billing.issuedAt">
                  · {{ formatDateShort(current.billing.issuedAt) }}
                </span>
              </dd>
            </div>
            <div v-if="current.billing.notes" class="factura__wide">
              <dt>Notas</dt><dd>{{ current.billing.notes }}</dd>
            </div>
          </dl>

          <p v-else class="detail__muted">Este acuerdo no requiere factura.</p>
        </template>

        <template v-else>
          <SaleBillingFields v-model="billingDraft" />
          <div class="detail__actions">
            <BaseButton size="sm" variant="ghost" @click="editingBilling = false">Cancelar</BaseButton>
            <BaseButton size="sm" icon="fa-solid fa-floppy-disk" :loading="sales.saving" @click="saveBilling">
              Guardar
            </BaseButton>
          </div>
        </template>
      </section>

      <section class="detail__block">
        <h3 class="detail__title">
          <i class="fa-solid fa-calendar-days" aria-hidden="true" /> Cobros programados
        </h3>

        <ul class="cuotas">
          <li v-for="item in current.installments" :key="item.index" class="cuota">
            <div class="cuota__main">
              <span class="cuota__n">{{ item.index + 1 }}</span>
              <div class="cuota__info">
                <span class="cuota__date">
                  {{ item.status === 'cobrada' && item.paidAt
                    ? `Cobrada el ${formatDateShort(item.paidAt)}`
                    : `Vence ${formatDateShort(item.dueDate)}` }}
                </span>
                <span v-if="item.originalDueDate" class="cuota__moved">
                  movida · antes {{ formatDateShort(item.originalDueDate) }}
                </span>
              </div>
              <span class="cuota__amount">{{ formatMoney(item.amount) }}</span>
              <BaseBadge :variant="toneOf(item)" :icon="INSTALLMENT_ICON[item.status]" size="sm">
                {{ INSTALLMENT_LABEL[item.status] }}
              </BaseBadge>
            </div>

            <div v-if="item.status !== 'cobrada' && current.status !== 'perdida'" class="cuota__actions">
              <BaseButton size="sm" variant="ghost" icon="fa-solid fa-hand-holding-dollar" @click="startPay(item)">
                Registrar cobro
              </BaseButton>
              <BaseButton size="sm" variant="ghost" icon="fa-solid fa-calendar-pen" @click="startMove(item)">
                Mover fecha
              </BaseButton>
            </div>

            <div v-if="payingIndex === item.index" class="cuota__form">
              <BaseCurrencyInput v-model="payAmount" label="Monto cobrado" />
              <BaseDatePicker v-model="payDate" label="Fecha del cobro" />
              <BaseButton icon="fa-solid fa-check" :loading="sales.saving" @click="confirmPay">
                Confirmar
              </BaseButton>
            </div>

            <div v-if="movingIndex === item.index" class="cuota__form">
              <BaseDatePicker v-model="moveDate" label="Nueva fecha" />
              <BaseButton icon="fa-solid fa-check" :loading="sales.saving" @click="confirmMove">
                Mover
              </BaseButton>
            </div>
          </li>
        </ul>
      </section>

      <section class="detail__block">
        <h3 class="detail__title">
          <i class="fa-solid fa-clock-rotate-left" aria-hidden="true" /> Historial
        </h3>
        <ul class="history">
          <li v-for="(entry, i) in [...current.history].reverse()" :key="i" class="history__row">
            <span class="history__at">{{ formatDate(entry.at) }}</span>
            <span class="history__detail">{{ entry.detail || entry.action }}</span>
            <span v-if="entry.byName" class="history__by">{{ entry.byName }}</span>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cerrar</BaseButton>
      <BaseButton
        v-if="current && current.status !== 'perdida' && collected === 0"
        variant="danger"
        icon="fa-solid fa-circle-xmark"
        @click="emit('lose', current)"
      >
        Dar por perdida
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.detail {
  @include flex-col($sp-4);
}

.detail__head {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.detail__figures {
  @include flex(row, flex-start, center, $sp-4);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;

  strong { color: $primary-dark; font-weight: 800; }
  .ok { color: $alert-success; }
  .pend { color: $alert-warning; }
}

.detail__lost {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: rgba($alert-error, 0.07);
  border: 1px solid rgba($alert-error, 0.2);
  font-size: $fs-xs;
  color: $text-secondary;

  > i { color: $alert-error; margin-top: 2px; }
  > div { flex: 1 1 auto; min-width: 0; }
}

.detail__lost-title { font-weight: 700; color: $alert-error; }

.detail__block { @include flex-col($sp-3); }

.detail__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 800;
  color: $primary-dark;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  i { color: $primary; }
}

.detail__title-row {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.detail__warn {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 600;
  color: $alert-warning;
}

.detail__muted { font-size: $fs-xs; color: $text-secondary; }

.detail__actions {
  @include flex(row, flex-end, center, $sp-2);
  flex-wrap: wrap;
}

.conceptos { @include flex-col($sp-2); }

.concepto {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
}

.concepto__main {
  @include flex-col(2px);
  flex: 1 1 180px;
  min-width: 0;
}

.concepto__name { font-weight: 700; color: $primary-dark; }
.concepto__kind { font-size: 0.66rem; color: $text-secondary; text-transform: uppercase; letter-spacing: 0.04em; }

.concepto__desc {
  flex: 1 1 100%;
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.5;
}

.concepto__amount { flex: none; font-weight: 800; color: $primary-dark; }

.factura {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;

  > div { flex: 1 1 180px; min-width: 0; }
  .factura__wide { flex: 1 1 100%; }

  dt {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: $text-secondary;
  }

  dd {
    font-size: $fs-xs;
    color: $primary-dark;
    font-weight: 600;
    margin-top: 2px;
    word-break: break-word;
  }
}

.cuotas { @include flex-col($sp-2); }

.cuota {
  @include flex-col($sp-2);
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
}

.cuota__main {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
}

.cuota__n {
  @include flex-center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: $radius-full;
  background: rgba($primary, 0.12);
  color: $primary;
  font-weight: 700;
  font-size: 0.68rem;
}

.cuota__info {
  @include flex-col(2px);
  flex: 1 1 160px;
  min-width: 0;
}

.cuota__date { font-size: $fs-xs; color: $text-secondary; }
.cuota__moved { font-size: 0.66rem; color: $alert-warning; }
.cuota__amount { flex: none; font-weight: 700; font-size: $fs-sm; color: $primary-dark; }

.cuota__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.cuota__form {
  @include flex(row, flex-start, flex-end, $sp-3);
  flex-wrap: wrap;
  padding-top: $sp-2;
  border-top: 1px dashed $border-color;

  > * { flex: 1 1 150px; min-width: 0; }
}

.history { @include flex-col($sp-2); }

.history__row {
  @include flex(row, flex-start, baseline, $sp-3);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;
  padding-bottom: $sp-2;
  border-bottom: 1px solid rgba($border-color, 0.6);

  &:last-child { border-bottom: none; }
}

.history__at { flex: none; font-variant-numeric: tabular-nums; }
.history__detail { flex: 1 1 200px; color: $primary-dark; }
.history__by { flex: none; font-weight: 600; }
</style>
