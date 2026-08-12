<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BaseButton,
  BaseCurrencyInput,
  BaseDatePicker,
  BaseModal,
  BaseInput,
  BaseMonthPicker,
  BaseSelect,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { PAYMENT_METHOD_OPTIONS, apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useInvoicesStore } from '@/stores/invoices'
import { api } from '@/services/api.service'
import type { Invoice, PaymentMethod, SelectOption } from '@/types'

/**
 * Paso previo a PaymentModal desde /pagos: allí no se parte de un cobro, así que
 * primero hay que elegir cliente y cobro pendiente. Desde /cobros el cobro ya
 * viene dado y este modal no interviene.
 */
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  picked: [invoice: Invoice]
  settled: []
}>()

const clients = useClientsStore()
const invoicesStore = useInvoicesStore()
const toast = useToast()
const { formatMoney, formatPeriod, formatDateShort, toISODate } = useFormat()

const clientId = ref('')
const invoiceId = ref('')
const invoices = ref<Invoice[]>([])
const loadingInvoices = ref(false)

const PAYABLE = ['pending', 'partial', 'overdue']

/**
 * Pago único que salda varios cobros. Pasa siempre con los cobros divididos:
 * el cliente debe 210 el 8 y 210 el 23 pero transfiere los 420 de una, y antes
 * había que registrar dos pagos repartiendo el monto a mano.
 */
const settleAll = ref(false)
const settleAmount = ref(0)
const settleDate = ref('')
const settleMethod = ref<PaymentMethod>('transferencia')
const settleReference = ref('')
const saving = ref(false)

const openTotal = computed(() =>
  invoices.value.reduce((acc, inv) => acc + balanceOf(inv), 0),
)

const canSettle = computed(() => invoices.value.length > 1)

const methodModel = computed<string | number | null>({
  get: () => settleMethod.value,
  set: (value) => {
    settleMethod.value = (value as PaymentMethod) || 'transferencia'
  },
})

function toggleSettle() {
  settleAll.value = !settleAll.value
  if (settleAll.value) {
    settleAmount.value = Number(openTotal.value.toFixed(2))
    settleDate.value = toISODate(new Date()) || ''
    creating.value = false
  }
}

async function submitSettle() {
  if (!clientId.value) return
  if (Number(settleAmount.value) <= 0) {
    toast.warning('Falta el monto', 'Indica cuánto pagó.')
    return
  }

  saving.value = true
  try {
    const result = await api.settlePayment({
      clientId: clientId.value,
      amount: Number(settleAmount.value),
      paidAt: settleDate.value || undefined,
      method: settleMethod.value,
      reference: settleReference.value.trim() || undefined,
    })
    toast.success(
      'Pago registrado',
      `${formatMoney(result.totalApplied)} repartidos en ${result.invoicesSettled} cobro(s) de ${result.clientName}.`,
    )
    emit('settled')
    close()
  } catch (error) {
    toast.error('No se pudo registrar el pago', apiErrorMessage(error))
  } finally {
    saving.value = false
  }
}


function currentPeriod(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// Alta en línea del cobro: un cliente creado después de generar el período no
// tiene factura, así que sin esto su primer pago no se puede registrar.
const creating = ref(false)
const newPeriod = ref(currentPeriod())
const newAmount = ref(0)
const newDueDate = ref('')

const selectedClient = computed(
  () => clients.picker.find((c) => c._id === clientId.value) ?? null,
)

const clientModel = computed<string | number | null>({
  get: () => clientId.value || null,
  set: (value) => {
    clientId.value = value ? String(value) : ''
    invoiceId.value = ''
    invoices.value = []
    creating.value = false
    newPeriod.value = currentPeriod()
    newAmount.value = Number(selectedClient.value?.amount || 0)
    if (clientId.value) void loadInvoices()
  },
})

const invoiceModel = computed<string | number | null>({
  get: () => invoiceId.value || null,
  set: (value) => { invoiceId.value = value ? String(value) : '' },
})

const balanceOf = (inv: Invoice) =>
  Math.max(Number(inv.amount) - Number(inv.paidAmount || 0), 0)

const invoiceOptions = computed<SelectOption[]>(() =>
  invoices.value.map((inv) => ({
    value: inv._id,
    label: `${formatPeriod(inv.period)}${inv.splitLabel ? ` · ${inv.splitLabel}` : ''}`,
    description: `Saldo ${formatMoney(balanceOf(inv))} · vence ${formatDateShort(inv.dueDate)}`,
    icon: inv.status === 'overdue' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-file-invoice',
  })),
)

const selected = computed(() => invoices.value.find((i) => i._id === invoiceId.value) ?? null)

async function loadInvoices() {
  loadingInvoices.value = true
  try {
    const result = await api.listInvoices({ clientId: clientId.value, limit: 200 })
    invoices.value = result.items
      .filter((inv) => PAYABLE.includes(inv.status) && balanceOf(inv) > 0)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    if (invoices.value.length === 1) invoiceId.value = invoices.value[0]?._id ?? ''
    // Sin cobros abiertos el flujo moriría acá: se abre el alta directamente.
    if (!invoices.value.length) openCreate()
  } catch (error) {
    toast.error('No se pudieron cargar los cobros del cliente', apiErrorMessage(error))
  } finally {
    loadingInvoices.value = false
  }
}

/**
 * Vencimiento derivado del día de cobro del cliente para el período elegido.
 * Se muestra y se deja editar: antes se calculaba en silencio y un cobro recién
 * pagado aparecía "venciendo el 25", que se leía como deuda.
 */
function dueDateFor(period: string): string {
  const day = selectedClient.value?.collectionDay
  if (!day || !/^\d{4}-\d{2}$/.test(period)) return ''
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return ''
  const lastDay = new Date(year, month, 0).getDate()
  return `${period}-${String(Math.min(day, lastDay)).padStart(2, '0')}`
}

function openCreate() {
  newPeriod.value = currentPeriod()
  newAmount.value = Number(selectedClient.value?.amount || 0)
  newDueDate.value = dueDateFor(newPeriod.value)
  creating.value = true
}

// Al cambiar de período se recalcula el vencimiento, salvo que ya lo hayan tocado.
watch(newPeriod, (period, previous) => {
  if (!creating.value) return
  if (newDueDate.value && newDueDate.value !== dueDateFor(previous)) return
  newDueDate.value = dueDateFor(period)
})

/**
 * Crea el cobro faltante y lo deja seleccionado. El endpoint es idempotente: si
 * ya existía uno para ese período devuelve el mismo, no duplica.
 */
async function createInvoice() {
  if (!clientId.value) return
  if (Number(newAmount.value) <= 0) {
    toast.warning('Falta el monto', 'El cobro debe ser mayor a cero.')
    return
  }

  try {
    const created = await invoicesStore.createAdvance({
      clientId: clientId.value,
      period: newPeriod.value,
      amount: Number(newAmount.value),
      dueDate: newDueDate.value || undefined,
    })
    await loadInvoices()
    invoiceId.value = created._id
    creating.value = false
    toast.success('Cobro creado', `${formatPeriod(created.period)} · ${formatMoney(created.amount)}`)
  } catch (error) {
    toast.error('No se pudo crear el cobro', apiErrorMessage(error))
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    clientId.value = ''
    invoiceId.value = ''
    invoices.value = []
    creating.value = false
    settleAll.value = false
    settleReference.value = ''
    newPeriod.value = currentPeriod()
    newAmount.value = 0
    clients.fetchPicker().catch((error) => {
      toast.error('No se pudieron cargar los clientes', apiErrorMessage(error))
    })
  },
)

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!selected.value) {
    toast.warning('Falta el cobro', 'Elige el cliente y el cobro que vas a saldar.')
    return
  }
  emit('picked', selected.value)
  close()
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Registrar pago"
    subtitle="Elige el cobro que se está saldando"
    icon="fa-solid fa-hand-holding-dollar"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="picker">
      <BaseSelect
        v-model="clientModel"
        :options="clients.pickerOptions"
        label="Cliente"
        placeholder="Busca y selecciona el cliente"
        icon="fa-solid fa-user"
        :empty-text="clients.pickerLoading ? 'Cargando clientes…' : 'Sin clientes'"
        searchable
        required
      />

      <!-- Cobro dividido pagado de una sola vez -->
      <button v-if="canSettle && !settleAll" class="picker__toggle" type="button" @click="toggleSettle">
        <i class="fa-solid fa-layer-group" aria-hidden="true" />
        Pagó los {{ invoices.length }} cobros de una — {{ formatMoney(openTotal) }}
      </button>

      <section v-if="settleAll" class="picker__settle">
        <div class="picker__settle-head">
          <p class="picker__settle-title">
            <i class="fa-solid fa-layer-group" aria-hidden="true" />
            Un solo pago para {{ invoices.length }} cobros
          </p>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-xmark" @click="toggleSettle">
            Pagar uno solo
          </BaseButton>
        </div>

        <ul class="picker__settle-list">
          <li v-for="inv in invoices" :key="inv._id">
            <span>{{ inv.splitLabel || formatPeriod(inv.period) }}</span>
            <span>vence {{ formatDateShort(inv.dueDate) }}</span>
            <strong>{{ formatMoney(balanceOf(inv)) }}</strong>
          </li>
        </ul>

        <p class="picker__settle-note">
          El monto se reparte del cobro más viejo al más nuevo, así se salda primero la mora.
        </p>

        <div class="picker__settle-fields">
          <BaseCurrencyInput v-model="settleAmount" label="Monto recibido" />
          <BaseDatePicker
            v-model="settleDate"
            label="Fecha del pago"
            hint="El día real en que entró el dinero."
          />
          <BaseSelect v-model="methodModel" :options="PAYMENT_METHOD_OPTIONS" label="Método" />
          <BaseInput v-model="settleReference" label="Referencia" placeholder="N.º de transferencia" />
        </div>
      </section>

      <BaseSelect
        v-if="invoiceOptions.length && !settleAll"
        v-model="invoiceModel"
        :options="invoiceOptions"
        label="Cobro a pagar"
        placeholder="Selecciona el cobro pendiente"
        icon="fa-solid fa-file-invoice-dollar"
        :disabled="loadingInvoices"
        searchable
        required
      />

      <div v-if="selected && !settleAll" class="picker__summary">
        <span class="picker__summary-label">Saldo pendiente</span>
        <strong class="picker__summary-value">{{ formatMoney(balanceOf(selected)) }}</strong>
      </div>

      <!-- Alta del cobro cuando el cliente no tiene ninguno abierto -->
      <section v-if="clientId && creating && !settleAll" class="picker__new">
        <p class="picker__new-title">
          <i class="fa-solid fa-circle-plus" aria-hidden="true" />
          <span v-if="!invoices.length">
            {{ selectedClient?.name ?? 'Este cliente' }} no tiene cobros pendientes. Crea el cobro
            aquí y sigue con el pago.
          </span>
          <span v-else>Crear un cobro nuevo</span>
        </p>

        <div class="picker__new-fields">
          <BaseMonthPicker v-model="newPeriod" label="Período que cubre" />
          <BaseCurrencyInput v-model="newAmount" label="Monto del cobro" />
          <BaseDatePicker
            v-model="newDueDate"
            label="Vence el"
            placeholder="Día de cobro del cliente"
          />
        </div>

        <p class="picker__preview">
          Se creará el cobro de <strong>{{ formatPeriod(newPeriod) }}</strong> por
          <strong>{{ formatMoney(Number(newAmount) || 0) }}</strong
          ><template v-if="newDueDate">
            , con vencimiento <strong>{{ formatDateShort(newDueDate) }}</strong></template
          >. En el siguiente paso registras el pago con la fecha real en que entró.
        </p>

        <BaseButton
          variant="outline"
          icon="fa-solid fa-file-circle-plus"
          :loading="invoicesStore.working"
          @click="createInvoice"
        >
          Crear cobro
        </BaseButton>
      </section>

      <button
        v-else-if="clientId && !loadingInvoices && !settleAll"
        class="picker__toggle"
        type="button"
        @click="openCreate"
      >
        <i class="fa-solid fa-plus" aria-hidden="true" />
        ¿Falta el cobro? Créalo aquí
      </button>

      <p v-if="loadingInvoices" class="picker__hint">
        <i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true" />
        Buscando cobros de este cliente…
      </p>
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton
        v-if="settleAll"
        variant="success"
        icon="fa-solid fa-hand-holding-dollar"
        :loading="saving"
        @click="submitSettle"
      >
        Registrar {{ formatMoney(Number(settleAmount) || 0) }}
      </BaseButton>
      <BaseButton
        v-else
        variant="success"
        icon="fa-solid fa-arrow-right"
        :disabled="!selected"
        @click="confirm"
      >
        Continuar
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.picker {
  @include flex-col($sp-4);
}

.picker__summary {
  @include flex-between(center, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: rgba($primary-light, 0.5);
}

.picker__summary-label {
  font-size: $fs-xs;
  color: $text-secondary;
}

.picker__summary-value {
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;
}

.picker__hint {
  @include flex(row, flex-start, flex-start, $sp-2);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i {
    color: $alert-info;
    margin-top: 2px;
  }
}

.picker__new {
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-sm;
  border: 1px dashed $border-strong;
  background: rgba($alert-info, 0.05);
  align-items: stretch;
}

.picker__new-title {
  @include flex(row, flex-start, flex-start, $sp-2);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i {
    color: $alert-info;
    margin-top: 2px;
  }
}

.picker__new-fields {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;

  > * {
    flex: 1 1 180px;
    min-width: 0;
  }
}

.picker__preview {
  font-size: $fs-xs;
  line-height: 1.6;
  color: $text-secondary;

  strong { color: $primary-dark; font-weight: 700; }
}

.picker__settle {
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $primary;
  background: rgba($primary, 0.05);
}

.picker__settle-head {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.picker__settle-title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 800;
  color: $primary;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.picker__settle-list {
  @include flex-col($sp-1);

  li {
    @include flex(row, space-between, center, $sp-2);
    flex-wrap: wrap;
    font-size: $fs-xs;
    color: $text-secondary;
    padding: $sp-1 0;
    border-bottom: 1px solid rgba($border-color, 0.6);

    &:last-child { border-bottom: none; }
    strong { color: $primary-dark; font-weight: 700; }
  }
}

.picker__settle-note {
  font-size: 0.68rem;
  color: $text-secondary;
  line-height: 1.5;
}

.picker__settle-fields {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;

  > * { flex: 1 1 150px; min-width: 0; }
}

.picker__toggle {
  @include flex(row, flex-start, center, $sp-2);
  align-self: flex-start;
  font-size: $fs-xs;
  font-weight: 600;
  color: $primary;
  transition: opacity $transition-fast;

  &:hover { opacity: 0.75; }
  &:focus-visible { @include focus-ring; }
}
</style>
