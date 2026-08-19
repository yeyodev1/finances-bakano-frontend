<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseModal, BaseTextarea } from '@/components/base'
import InvoicePickerModal from '@/views/PaymentsView/InvoicePickerModal.vue'
import { useFormat } from '@/composables/useFormat'
import type { Invoice, PaymentSubmission } from '@/types'

/**
 * Revisión de un comprobante: aprobar registra el pago por el NETO (el fee lo
 * asume el cliente); rechazar exige un motivo porque el cliente lo lee en su
 * portal.
 */
const props = defineProps<{
  modelValue: boolean
  submission: PaymentSubmission | null
  mode: 'approve' | 'reject'
  saving: boolean
}>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  approve: [payload: { invoiceId?: string; reviewNote?: string }]
  reject: [payload: { reviewNote: string }]
}>()

const { formatMoney, formatPeriod, formatDateShort } = useFormat()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const note = ref('')
const pickerOpen = ref(false)
const invoice = ref<Invoice | null>(null)

watch(open, (value) => {
  if (!value) return
  note.value = ''
  invoice.value = null
})

const isApprove = computed(() => props.mode === 'approve')
const canSubmit = computed(() => (isApprove.value ? true : note.value.trim().length >= 3))

/** Factura sugerida: la que el cliente eligió al subir el comprobante. */
const linkedInvoice = computed(() => {
  const raw = props.submission?.invoiceId
  return raw && typeof raw !== 'string' ? (raw as Invoice) : null
})

const clientId = computed(() => {
  const raw = props.submission?.clientId
  if (!raw) return null
  return typeof raw === 'string' ? raw : raw._id
})

function onPicked(picked: Invoice) {
  invoice.value = picked
  pickerOpen.value = false
}

function submit() {
  if (!canSubmit.value) return
  if (isApprove.value) {
    emit('approve', {
      invoiceId: invoice.value?._id,
      reviewNote: note.value.trim() || undefined,
    })
  } else {
    emit('reject', { reviewNote: note.value.trim() })
  }
}
</script>

<template>
  <BaseModal
    v-model="open"
    size="md"
    :icon="isApprove ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'"
    :title="isApprove ? 'Aprobar comprobante' : 'Rechazar comprobante'"
    :subtitle="submission ? submission.clientName : ''"
  >
    <div v-if="submission" class="review">
      <ul class="review__amounts">
        <li>
          <span>Monto enviado</span>
          <strong>{{ formatMoney(submission.grossAmount) }}</strong>
        </li>
        <li>
          <span>Fee bancario</span>
          <strong>−{{ formatMoney(submission.feeAmount) }}</strong>
        </li>
        <li class="review__net">
          <span>Neto a acreditar</span>
          <strong>{{ formatMoney(submission.netAmount) }}</strong>
        </li>
      </ul>

      <p v-if="isApprove" class="review__notice">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        El pago se registrará por el <strong>neto recibido</strong>: el fee de la transferencia
        internacional lo asume el cliente. Si el neto no cubre la factura, quedará en pago parcial.
      </p>
      <p v-else class="review__notice review__notice--danger">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        El motivo del rechazo <strong>lo verá el cliente</strong> en su portal. Explica qué debe
        corregir.
      </p>

      <div v-if="isApprove" class="review__invoice">
        <span class="review__label">Factura destino</span>
        <p v-if="invoice">
          {{ formatPeriod(invoice.period) }} · {{ formatMoney(invoice.amount) }} · vence
          {{ formatDateShort(invoice.dueDate) }}
        </p>
        <p v-else-if="linkedInvoice">
          {{ formatPeriod(linkedInvoice.period) }} · {{ formatMoney(linkedInvoice.amount) }}
          <small>(elegida por el cliente)</small>
        </p>
        <p v-else class="review__muted">Se aplicará al cobro abierto más viejo del cliente.</p>
        <BaseButton variant="ghost" size="sm" icon="fa-solid fa-list" @click="pickerOpen = true">
          Elegir otra factura
        </BaseButton>
      </div>

      <BaseTextarea
        v-model="note"
        :label="isApprove ? 'Nota interna (opcional)' : 'Motivo del rechazo'"
        :placeholder="
          isApprove ? 'Ej: verificado contra Mercury' : 'Ej: el monto del comprobante no coincide'
        "
        :rows="3"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" :disabled="saving" @click="open = false">Cancelar</BaseButton>
      <BaseButton
        :variant="isApprove ? 'success' : 'danger'"
        :loading="saving"
        :disabled="!canSubmit"
        :icon="isApprove ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'"
        @click="submit"
      >
        {{ isApprove ? 'Aprobar y registrar pago' : 'Rechazar comprobante' }}
      </BaseButton>
    </template>
  </BaseModal>

  <InvoicePickerModal
    v-if="clientId"
    v-model="pickerOpen"
    :client-id="clientId"
    :client-name="submission?.clientName || ''"
    @picked="onPicked"
  />
</template>

<style scoped lang="scss">
.review {
  @include flex-col(12px);

  &__amounts {
    @include flex-col(6px);
    list-style: none;
    margin: 0;
    padding: $sp-3;
    border: 1px solid $border-color;
    border-radius: $radius-md;

    li {
      @include flex-between;
      font-size: $fs-sm;
    }
  }

  &__net {
    padding-top: 6px;
    border-top: 1px dashed $border-color;

    strong {
      color: $primary-dark;
      font-size: $fs-md;
    }
  }

  &__notice {
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin: 0;
    padding: $sp-3;
    border-radius: $radius-md;
    background: rgba($alert-warning, 0.12);
    font-size: $fs-sm;

    i {
      margin-top: 2px;
      color: $alert-warning;
    }

    &--danger {
      background: rgba($alert-error, 0.1);

      i {
        color: $alert-error;
      }
    }
  }

  &__invoice {
    @include flex-col(6px);

    p {
      margin: 0;
      font-size: $fs-sm;
    }
  }

  &__label {
    @include label-text;
  }

  &__muted {
    color: rgba($primary-dark, 0.55);
  }
}
</style>
