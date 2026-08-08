<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { BaseButton, BaseDatePicker, BaseInput, BaseModal, BaseTextarea } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { useInvoicesStore } from '@/stores/invoices'
import type { Invoice } from '@/types'

const props = defineProps<{ modelValue: boolean; invoice: Invoice | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; deferred: [] }>()

const store = useInvoicesStore()
const toast = useToast()
const { formatMoney, formatPeriod, formatDateShort, toISODate, toDate } = useFormat()

const form = reactive({ newDueDate: '', reason: '', notes: '' })
const touched = ref(false)

/** El acuerdo solo tiene sentido a partir del día siguiente al vencimiento actual. */
const minDate = computed(() => {
  const current = toDate(props.invoice?.dueDate) ?? new Date()
  const next = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1)
  return toISODate(next)
})

const balance = computed(() => {
  const inv = props.invoice
  if (!inv) return 0
  return Math.max(Number(inv.amount) - Number(inv.paidAmount || 0), 0)
})

const error = computed(() =>
  touched.value && !form.newDueDate ? 'Selecciona la nueva fecha de vencimiento' : '',
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    touched.value = false
    form.newDueDate = ''
    form.reason = ''
    form.notes = ''
  },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  const invoice = props.invoice
  touched.value = true
  if (!invoice || !form.newDueDate) return

  try {
    await store.defer(invoice._id, {
      newDueDate: form.newDueDate,
      reason: form.reason,
      notes: form.notes,
    })
    toast.success(
      'Cobro aplazado',
      `${invoice.clientName} vence ahora el ${formatDateShort(form.newDueDate)}.`,
    )
    emit('deferred')
    close()
  } catch (error_) {
    toast.error('No se pudo aplazar el cobro', apiErrorMessage(error_))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Aplazar cobro"
    icon="fa-solid fa-calendar-plus"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="invoice" class="defer">
      <div class="defer__notice">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        <p>
          Esto mueve solo el cobro de este mes. El próximo mes se vuelve a cobrar en la fecha
          habitual del cliente.
        </p>
      </div>

      <section class="defer__invoice">
        <div>
          <p class="defer__client">{{ invoice.clientName }}</p>
          <p class="defer__meta">
            {{ formatPeriod(invoice.period) }} · vence {{ formatDateShort(invoice.dueDate) }}
          </p>
        </div>
        <div class="defer__balance">
          <span class="defer__balance-label">Saldo pendiente</span>
          <span class="defer__balance-value">{{ formatMoney(balance) }}</span>
        </div>
      </section>

      <BaseDatePicker
        v-model="form.newDueDate"
        label="Nueva fecha de vencimiento"
        :min="minDate"
        :error="error"
        placeholder="Selecciona la fecha acordada"
        required
      />

      <BaseInput
        v-model="form.reason"
        label="Motivo del acuerdo"
        placeholder="Ej. flujo de caja, cierre de proyecto…"
        icon="fa-solid fa-comment-dots"
      />

      <BaseTextarea
        v-model="form.notes"
        label="Notas"
        :rows="2"
        placeholder="Con quién se acordó, condiciones, compromisos…"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton icon="fa-solid fa-calendar-plus" :loading="store.working" @click="submit">
        Aplazar cobro
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.defer {
  @include flex-col($sp-4);
}

.defer__notice {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-info-bg;
  border: 1px solid rgba($alert-info, 0.25);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;
  font-weight: 600;

  i {
    color: $alert-info;
    margin-top: 2px;
  }
}

.defer__invoice {
  @include flex-between(center, $sp-3);
  flex-wrap: wrap;
  padding: $sp-4;
  border-radius: $radius-md;
  background: rgba($primary, 0.06);
  border: 1px solid rgba($primary, 0.18);
}

.defer__client {
  font-weight: 700;
  color: $primary-dark;
  font-size: $fs-md;
}

.defer__meta {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: 2px;
}

.defer__balance {
  @include flex-col(2px);
  align-items: flex-end;
}

.defer__balance-label {
  @include label-text;
}

.defer__balance-value {
  font-size: $fs-lg;
  font-weight: 800;
  color: $primary;
}
</style>
