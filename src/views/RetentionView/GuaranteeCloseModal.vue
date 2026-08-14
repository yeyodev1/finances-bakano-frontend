<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BaseButton,
  BaseCurrencyInput,
  BaseDatePicker,
  BaseModal,
  BaseSelect,
  BaseSwitch,
  BaseTextarea,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { useRetentionStore } from '@/stores/retention'
import { GUARANTEE_OUTCOME_OPTIONS, periodChip } from '@/config/retention'
import type { Guarantee, GuaranteeOutcome, SelectOption } from '@/types'

const props = defineProps<{ modelValue: boolean; guarantee: Guarantee | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; closed: [] }>()

const store = useRetentionStore()
const toast = useToast()
const { formatMoney, formatPeriodShort, toISODate } = useFormat()

const outcome = ref<GuaranteeOutcome>('cumplida')
const notes = ref('')
const archiveClient = ref(true)
const withRefund = ref(false)
const refundInvoiceId = ref('')
const refundAmount = ref(0)
const refundedAt = ref('')

const isFailure = computed(() => outcome.value === 'fallida')

const waivedTotal = computed(() =>
  (props.guarantee?.cycles ?? []).reduce(
    (total, cycle) => total + Number(cycle.waivedAmount || 0),
    0,
  ),
)

const monthsLabel = computed(() =>
  (props.guarantee?.cycles ?? []).map((cycle) => periodChip(cycle.period)).join(' y ') || '—',
)

const clientId = computed(() => {
  const raw = props.guarantee?.clientId
  return typeof raw === 'string' ? raw : (raw?._id ?? '')
})

/** Cobros con dinero devolvible del cliente, para elegir de dónde sale el reembolso. */
const invoiceOptions = computed<SelectOption[]>(() =>
  store.refundable.map((invoice) => {
    const available =
      Number(invoice.paidAmount || 0) - Number(invoice.refundedAmount || 0)
    return {
      value: invoice._id,
      label: `${formatPeriodShort(invoice.period)} · ${formatMoney(available)} devolvibles`,
      icon: 'fa-solid fa-file-invoice-dollar',
    }
  }),
)

const refundInvoiceModel = computed<string | number | null>({
  get: () => refundInvoiceId.value || null,
  set: (value) => {
    refundInvoiceId.value = value ? String(value) : ''
    const invoice = store.refundable.find((item) => item._id === refundInvoiceId.value)
    if (invoice) {
      refundAmount.value =
        Math.round(
          (Number(invoice.paidAmount || 0) - Number(invoice.refundedAmount || 0)) * 100,
        ) / 100
    }
  },
})

const refundError = computed(() => {
  if (!withRefund.value) return ''
  if (!refundInvoiceId.value) return 'Elige el cobro que se devuelve'
  if (Number(refundAmount.value) <= 0) return 'El monto debe ser mayor a cero'
  const invoice = store.refundable.find((item) => item._id === refundInvoiceId.value)
  const available = invoice
    ? Number(invoice.paidAmount || 0) - Number(invoice.refundedAmount || 0)
    : 0
  if (Number(refundAmount.value) > available + 0.009) {
    return `No puedes devolver más de ${formatMoney(available)}`
  }
  return ''
})

const canSubmit = computed(() => !!props.guarantee && !refundError.value && !store.saving)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    outcome.value = 'cumplida'
    notes.value = ''
    archiveClient.value = true
    withRefund.value = false
    refundInvoiceId.value = ''
    refundAmount.value = 0
    refundedAt.value = toISODate(new Date()) || ''
    store.refundable = []
  },
)

// Los cobros devolvibles solo se piden si de verdad se va a devolver algo.
watch(withRefund, (value) => {
  if (!value || !clientId.value || store.refundable.length) return
  store.fetchRefundable(clientId.value).catch((error) => {
    toast.error('No se pudieron cargar los cobros del cliente', apiErrorMessage(error))
  })
})

watch(outcome, (value) => {
  if (value !== 'fallida') withRefund.value = false
})

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  const guarantee = props.guarantee
  if (!guarantee || refundError.value) return

  try {
    const result = await store.closeGuarantee(guarantee._id, {
      outcome: outcome.value,
      notes: notes.value.trim() || undefined,
      archiveClient: isFailure.value ? archiveClient.value : undefined,
      refund:
        isFailure.value && withRefund.value
          ? {
              invoiceId: refundInvoiceId.value,
              amount: Number(refundAmount.value),
              reason: 'garantia',
              refundedAt: refundedAt.value || undefined,
              notes: notes.value.trim() || undefined,
            }
          : undefined,
    })

    toast.success('Garantía cerrada', result.message)
    emit('closed')
    close()
  } catch (error) {
    toast.error('No se pudo cerrar la garantía', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Cerrar la garantía"
    icon="fa-solid fa-flag-checkered"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="guarantee" class="close">
      <section class="close__summary">
        <div class="close__figure">
          <span class="close__label">Cliente</span>
          <span class="close__value">{{ guarantee.clientName }}</span>
        </div>
        <div class="close__figure">
          <span class="close__label">Meses regalados</span>
          <span class="close__value">{{ monthsLabel }}</span>
        </div>
        <div class="close__figure">
          <span class="close__label">Sin cobrar</span>
          <span class="close__value close__value--loss">{{ formatMoney(waivedTotal) }}</span>
        </div>
      </section>

      <fieldset class="close__outcomes">
        <legend class="close__legend">¿Cómo terminó?</legend>

        <label
          v-for="option in GUARANTEE_OUTCOME_OPTIONS"
          :key="option.value"
          class="outcome"
          :class="[`outcome--${option.tone}`, { 'outcome--on': outcome === option.value }]"
        >
          <input v-model="outcome" type="radio" :value="option.value" class="outcome__input" />
          <i class="outcome__icon" :class="option.icon" aria-hidden="true" />
          <span class="outcome__text">
            <span class="outcome__label">{{ option.label }}</span>
            <span class="outcome__hint">{{ option.hint }}</span>
          </span>
          <i
            class="outcome__check fa-solid"
            :class="outcome === option.value ? 'fa-circle-check' : 'fa-circle'"
            aria-hidden="true"
          />
        </label>
      </fieldset>

      <BaseTextarea
        v-model="notes"
        :label="isFailure ? 'Qué falló' : 'Qué resultados aparecieron'"
        :rows="3"
        placeholder="Contexto para el histórico: métricas, conversaciones, compromisos…"
      />

      <template v-if="isFailure">
        <BaseSwitch
          v-model="archiveClient"
          label="Dar de baja al cliente"
          description="Se archiva con motivo «Garantía agotada sin resultados» y se anulan sus cobros futuros."
        />

        <BaseSwitch
          v-model="withRefund"
          label="Además, devolverle dinero"
          description="Registra el reembolso contra un cobro ya pagado. El pago original no se toca."
        />

        <section v-if="withRefund" class="close__refund">
          <BaseSelect
            v-model="refundInvoiceModel"
            :options="invoiceOptions"
            label="Cobro que se devuelve"
            placeholder="Selecciona el período"
            icon="fa-solid fa-file-invoice-dollar"
            :empty-text="
              store.refundableLoading ? 'Cargando cobros…' : 'Este cliente no tiene cobros devolvibles'
            "
            searchable
            required
          />

          <div class="close__row">
            <BaseCurrencyInput
              v-model="refundAmount"
              label="Monto a devolver"
              :error="refundError"
            />
            <BaseDatePicker v-model="refundedAt" label="Fecha de la devolución" />
          </div>
        </section>
      </template>
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton
        :variant="isFailure ? 'danger' : 'success'"
        :icon="isFailure ? 'fa-solid fa-heart-crack' : 'fa-solid fa-circle-check'"
        :disabled="!canSubmit"
        :loading="store.saving"
        @click="submit"
      >
        {{ isFailure ? 'Marcar como fracaso' : 'Cerrar garantía' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.close {
  @include flex-col($sp-4);
}

.close__summary {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid rgba($primary, 0.18);
  background: rgba($primary, 0.05);
}

.close__figure {
  @include flex-col(2px);
  flex: 1 1 150px;
  min-width: 0;
}

.close__label {
  @include label-text;
}

.close__value {
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;

  &--loss {
    color: $alert-warning;
  }
}

.close__outcomes {
  @include flex-col($sp-2);
  border: 0;
  padding: 0;
  margin: 0;
}

.close__legend {
  @include label-text;
  margin-bottom: $sp-1;
}

// Cada opción lleva icono y texto: el color nunca es la única señal.
.outcome {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-3;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  background: $surface;
  cursor: pointer;
  transition: border-color $transition-base, background $transition-base, transform $transition-fast;

  &:hover {
    transform: translateY(-1px);
  }

  &--on {
    border-width: 2px;
    padding: calc(#{$sp-3} - 1px);
  }
}

.outcome__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.outcome__icon {
  font-size: $fs-md;
  flex: none;
  width: 22px;
  text-align: center;
}

.outcome__text {
  @include flex-col(2px);
  flex: 1 1 auto;
  min-width: 0;
}

.outcome__label {
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;
}

.outcome__hint {
  font-size: $fs-xs;
  line-height: 1.45;
  color: $text-secondary;
}

.outcome__check {
  flex: none;
  color: $text-secondary;
}

@each $name, $color in (success: $alert-success, danger: $alert-error, secondary: $primary-dark) {
  .outcome--#{$name} {
    .outcome__icon {
      color: $color;
    }

    &.outcome--on {
      border-color: $color;
      background: rgba($color, 0.07);

      .outcome__check {
        color: $color;
      }
    }
  }
}

.close__refund {
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid rgba($alert-error, 0.25);
  background: $alert-error-bg;
}

.close__row {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;

  > * {
    flex: 1 1 200px;
    min-width: 0;
  }
}
</style>
