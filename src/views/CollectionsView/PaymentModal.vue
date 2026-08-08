<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  BaseButton,
  BaseCurrencyInput,
  BaseDatePicker,
  BaseInput,
  BaseModal,
  BaseSelect,
  BaseTextarea,
} from '@/components/base'
import ReceiptDropzone from './ReceiptDropzone.vue'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { PAYMENT_METHOD_OPTIONS, apiErrorMessage } from '@/stores/clients'
import { usePaymentsStore } from '@/stores/payments'
import type { Invoice, PaymentMethod } from '@/types'

const props = defineProps<{ modelValue: boolean; invoice: Invoice | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; registered: [] }>()

const store = usePaymentsStore()
const toast = useToast()
const { formatMoney, formatPeriod, formatDateShort, toISODate } = useFormat()

const form = reactive({
  amount: 0,
  paidAt: toISODate(new Date()) || '',
  method: 'transferencia' as PaymentMethod,
  reference: '',
  notes: '',
})

const receipt = ref<File | null>(null)
const errors = reactive<Record<string, string>>({})

const balance = computed(() => {
  if (!props.invoice) return 0
  return Math.max(Number(props.invoice.amount) - Number(props.invoice.paidAmount || 0), 0)
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    Object.keys(errors).forEach((k) => delete errors[k])
    receipt.value = null
    form.amount = balance.value
    form.paidAt = toISODate(new Date()) || ''
    form.reference = ''
    form.notes = ''
    form.method = 'transferencia'
  },
)

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!props.invoice) errors.invoice = 'Cobro no válido'
  if (Number(form.amount) <= 0) errors.amount = 'El monto debe ser mayor a cero'
  if (Number(form.amount) > balance.value + 0.009)
    errors.amount = `El monto supera el saldo pendiente (${formatMoney(balance.value)})`
  if (!form.paidAt) errors.paidAt = 'Selecciona la fecha del pago'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (!props.invoice) return
  if (!validate()) {
    toast.warning('Revisa el formulario', 'Corrige los campos marcados para continuar.')
    return
  }

  try {
    const result = await store.register({
      invoiceId: props.invoice._id,
      amount: Number(form.amount),
      paidAt: form.paidAt,
      method: form.method,
      reference: form.reference.trim() || undefined,
      notes: form.notes.trim() || undefined,
      receipt: receipt.value,
    })

    const extra = result.reactivated ? ' Se reactivó el espacio de trabajo del cliente.' : ''
    toast.success(
      'Pago registrado',
      `${formatMoney(Number(form.amount))} para ${props.invoice.clientName}.${extra}`,
    )
    emit('registered')
    emit('update:modelValue', false)
  } catch (error) {
    toast.error('No se pudo registrar el pago', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Registrar pago"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="invoice" class="pay">
      <section class="pay__invoice">
        <div>
          <p class="pay__client">{{ invoice.clientName }}</p>
          <p class="pay__meta">
            {{ formatPeriod(invoice.period) }} · vence {{ formatDateShort(invoice.dueDate) }}
          </p>
        </div>
        <div class="pay__balance">
          <span class="pay__balance-label">Saldo pendiente</span>
          <span class="pay__balance-value">{{ formatMoney(balance) }}</span>
        </div>
      </section>

      <div class="grid">
        <BaseCurrencyInput v-model="form.amount" label="Monto del pago" :error="errors.amount" />
        <BaseDatePicker v-model="form.paidAt" label="Fecha de pago" :error="errors.paidAt" />
      </div>

      <div class="grid">
        <BaseSelect v-model="form.method" :options="PAYMENT_METHOD_OPTIONS" label="Método de pago" />
        <BaseInput v-model="form.reference" label="Referencia" placeholder="N.º de transferencia o cheque" />
      </div>

      <BaseTextarea v-model="form.notes" label="Notas" :rows="2" placeholder="Detalles del pago" />

      <ReceiptDropzone v-model="receipt" />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="emit('update:modelValue', false)">
        Cancelar
      </BaseButton>
      <BaseButton variant="success" icon="fa-solid fa-hand-holding-dollar" :loading="store.saving" @click="submit">
        Registrar pago
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.pay {
  @include flex-col($sp-4);
}

.pay__invoice {
  @include flex-between(center, $sp-3);
  flex-wrap: wrap;
  padding: $sp-4;
  border-radius: $radius-md;
  background: rgba($primary, 0.06);
  border: 1px solid rgba($primary, 0.18);
}

.pay__client {
  font-weight: 700;
  color: $primary-dark;
  font-size: $fs-md;
}

.pay__meta {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: 2px;
}

.pay__balance {
  @include flex-col(2px);
  align-items: flex-end;
}

.pay__balance-label {
  @include label-text;
}

.pay__balance-value {
  font-size: $fs-lg;
  font-weight: 800;
  color: $primary;
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include md {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
