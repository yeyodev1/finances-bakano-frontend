<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BaseButton,
  BaseCurrencyInput,
  BaseDatePicker,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseSwitch,
  BaseTextarea,
} from '@/components/base'
import ReceiptDropzone from '@/views/CollectionsView/ReceiptDropzone.vue'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useRetentionStore } from '@/stores/retention'
import { REFUND_REASON_OPTIONS } from '@/config/retention'
import type { Client, RefundReason, SelectOption } from '@/types'

const props = withDefaults(
  defineProps<{ modelValue: boolean; client?: Client | null }>(),
  { client: null },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean]; registered: [] }>()

const store = useRetentionStore()
const clients = useClientsStore()
const toast = useToast()
const { formatMoney, formatPeriodShort, toISODate } = useFormat()

const pickedId = ref('')
const invoiceId = ref('')
const amount = ref(0)
const reason = ref<RefundReason | null>(null)
const refundedAt = ref('')
const reference = ref('')
const notes = ref('')
const receipt = ref<File | null>(null)
const archiveClient = ref(false)

const target = computed<Client | null>(
  () => props.client ?? clients.picker.find((c) => c._id === pickedId.value) ?? null,
)

const pickedModel = computed<string | number | null>({
  get: () => pickedId.value || null,
  set: (value) => {
    pickedId.value = value ? String(value) : ''
  },
})

const reasonModel = computed<string | number | null>({
  get: () => reason.value,
  set: (value) => {
    reason.value = (value as RefundReason) || null
  },
})

function availableOf(id: string): number {
  const invoice = store.refundable.find((item) => item._id === id)
  if (!invoice) return 0
  return (
    Math.round((Number(invoice.paidAmount || 0) - Number(invoice.refundedAmount || 0)) * 100) / 100
  )
}

const invoiceOptions = computed<SelectOption[]>(() =>
  store.refundable.map((invoice) => ({
    value: invoice._id,
    label: `${formatPeriodShort(invoice.period)} · ${formatMoney(availableOf(invoice._id))} devolvibles`,
    icon: 'fa-solid fa-file-invoice-dollar',
  })),
)

const invoiceModel = computed<string | number | null>({
  get: () => invoiceId.value || null,
  set: (value) => {
    invoiceId.value = value ? String(value) : ''
    // El caso normal es devolver todo lo cobrado del período; se puede bajar a mano.
    if (invoiceId.value) amount.value = availableOf(invoiceId.value)
  },
})

const available = computed(() => (invoiceId.value ? availableOf(invoiceId.value) : 0))

const amountError = computed(() => {
  if (!invoiceId.value) return ''
  if (Number(amount.value) <= 0) return 'El monto debe ser mayor a cero'
  if (Number(amount.value) > available.value + 0.009) {
    return `No puedes devolver más de ${formatMoney(available.value)}`
  }
  return ''
})

const canSubmit = computed(
  () => !!invoiceId.value && !!reason.value && !amountError.value && !store.saving,
)

function reset() {
  pickedId.value = ''
  invoiceId.value = ''
  amount.value = 0
  reason.value = null
  refundedAt.value = toISODate(new Date()) || ''
  reference.value = ''
  notes.value = ''
  receipt.value = null
  archiveClient.value = false
  store.refundable = []
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    reset()
    if (!props.client) {
      clients.fetchPicker().catch((error) => {
        toast.error('No se pudieron cargar los clientes', apiErrorMessage(error))
      })
    }
  },
)

// Cada vez que cambia el cliente se recargan sus cobros devolvibles.
watch(
  () => target.value?._id,
  (id) => {
    invoiceId.value = ''
    amount.value = 0
    store.refundable = []
    if (!id) return
    store.fetchRefundable(id).catch((error) => {
      toast.error('No se pudieron cargar los cobros del cliente', apiErrorMessage(error))
    })
  },
  { immediate: true },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (!canSubmit.value || !reason.value) return

  try {
    const result = await store.registerRefund({
      invoiceId: invoiceId.value,
      amount: Number(amount.value),
      reason: reason.value,
      refundedAt: refundedAt.value || undefined,
      reference: reference.value.trim() || undefined,
      notes: notes.value.trim() || undefined,
      receipt: receipt.value,
      archiveClient: archiveClient.value,
    })

    toast.success('Reembolso registrado', result.message)
    if (result.archived) {
      toast.warning(
        'El cliente quedó de baja',
        'Revisa su espacio de trabajo: si sigue abierto, ciérralo desde Espacios.',
        9000,
      )
    }
    emit('registered')
    close()
  } catch (error) {
    toast.error('No se pudo registrar el reembolso', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Registrar reembolso"
    icon="fa-solid fa-rotate-left"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="ref">
      <section class="ref__notice">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        <div>
          <p class="ref__notice-title">El pago original no se toca</p>
          <p>
            La plata entró y esa caja no se reescribe. El reembolso se guarda como un
            movimiento aparte con su propia fecha, y lo neto del período se calcula restando.
          </p>
        </div>
      </section>

      <BaseSelect
        v-if="!props.client"
        v-model="pickedModel"
        :options="clients.pickerOptions"
        label="Cliente"
        placeholder="Busca y selecciona el cliente"
        icon="fa-solid fa-user"
        :empty-text="clients.pickerLoading ? 'Cargando clientes…' : 'Sin clientes'"
        searchable
        required
      />

      <BaseSelect
        v-model="invoiceModel"
        :options="invoiceOptions"
        label="Cobro que se devuelve"
        placeholder="Selecciona el período"
        icon="fa-solid fa-file-invoice-dollar"
        :empty-text="
          store.refundableLoading
            ? 'Cargando cobros…'
            : target
              ? 'Este cliente no tiene cobros devolvibles'
              : 'Elige primero el cliente'
        "
        searchable
        required
      />

      <div class="ref__row">
        <BaseCurrencyInput v-model="amount" label="Monto a devolver" :error="amountError" />
        <BaseDatePicker
          v-model="refundedAt"
          label="Fecha de la devolución"
          hint="El día en que salió el dinero, no el de hoy."
        />
      </div>

      <div class="ref__row">
        <BaseSelect
          v-model="reasonModel"
          :options="REFUND_REASON_OPTIONS"
          label="Motivo del reembolso"
          placeholder="Selecciona el motivo"
          icon="fa-solid fa-circle-question"
          searchable
          required
        />
        <BaseInput
          v-model="reference"
          label="Referencia"
          placeholder="N.º de transferencia o nota del banco"
        />
      </div>

      <BaseTextarea
        v-model="notes"
        label="Notas"
        :rows="2"
        placeholder="Acuerdo con el cliente, quién lo autorizó…"
      />

      <ReceiptDropzone v-model="receipt" />

      <BaseSwitch
        v-model="archiveClient"
        label="Dar de baja al cliente con este reembolso"
        description="Se archiva con motivo «Se le devolvió el dinero» y se anulan sus cobros futuros."
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton
        variant="danger"
        icon="fa-solid fa-rotate-left"
        :disabled="!canSubmit"
        :loading="store.saving"
        @click="submit"
      >
        Registrar reembolso
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.ref {
  @include flex-col($sp-4);
}

.ref__notice {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-info-bg;
  border: 1px solid rgba($alert-info, 0.25);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i {
    color: $alert-info;
    font-size: $fs-md;
    margin-top: 2px;
  }
}

.ref__notice-title {
  font-weight: 800;
  color: $primary-dark;
  margin-bottom: 2px;
}

.ref__row {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;

  > * {
    flex: 1 1 200px;
    min-width: 0;
  }
}
</style>
