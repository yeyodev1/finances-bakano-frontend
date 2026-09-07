<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  BaseButton,
  BaseCurrencyInput,
  BaseDatePicker,
  BaseDayPicker,
  BaseInput,
  BaseModal,
  BaseMonthPicker,
  BaseSelect,
  BaseSwitch,
  BaseTextarea,
} from '@/components/base'
import ClientCategoryPicker from './ClientCategoryPicker.vue'
import ClientSplitsEditor from './ClientSplitsEditor.vue'
import ClientTagsInput from './ClientTagsInput.vue'
import ClientBackfillPanel from './ClientBackfillPanel.vue'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { PAYMENT_METHOD_OPTIONS, apiErrorMessage, useClientsStore } from '@/stores/clients'
import type { BillingType, Client, ClientSplit, PaymentMethod } from '@/types'

const props = defineProps<{ modelValue: boolean; client: Client | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [client: Client] }>()

const store = useClientsStore()
const toast = useToast()
const { toISODate } = useFormat()

/**
 * Regla acordada con ventas: en Clientes solo se agrega el cliente, cuánto paga
 * y qué día. No registra ninguna venta ni cobro (eso va en Ventas) y no asume
 * que sea mensual: el vendedor elige cada cuánto paga.
 */
const CADENCE_OPTIONS: Array<{ value: BillingType; label: string; description: string; icon: string }> = [
  {
    value: 'monthly',
    label: 'Cada mes',
    description: 'Se le genera un cobro cada mes',
    icon: 'fa-solid fa-calendar-days',
  },
  {
    value: 'special',
    label: 'Una sola vez / a convenir',
    description: 'Sin cobro mensual automático',
    icon: 'fa-solid fa-star',
  },
  {
    value: 'no_charge',
    label: 'No paga',
    description: 'Cortesía o canje',
    icon: 'fa-solid fa-ban',
  },
]

interface FormState {
  name: string
  legalName: string
  contactName: string
  contactEmail: string
  contactPhone: string
  amount: number
  issueDay: number | null
  collectionDay: number | null
  collectionDayLabel: string
  paymentMethod: PaymentMethod
  /** Sin valor por defecto: el vendedor elige cada cuánto paga, no se asume mensual. */
  billingType: BillingType | null
  categoryId: string | null
  splits: ClientSplit[]
  notes: string
  tags: string[]
  autoDeactivate: boolean
  graceDays: number | null
  startDate: string
  billingStartPeriod: string
}

function blank(): FormState {
  return {
    name: '',
    legalName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    amount: 0,
    issueDay: null,
    collectionDay: null,
    collectionDayLabel: '',
    paymentMethod: 'transferencia',
    billingType: null,
    categoryId: null,
    splits: [],
    notes: '',
    tags: [],
    autoDeactivate: true,
    graceDays: null,
    startDate: toISODate(new Date()) || '',
    billingStartPeriod: '',
  }
}

const form = reactive<FormState>(blank())
const errors = reactive<Record<string, string>>({})
const generateBackfill = ref(false)
const markPaidUntil = ref<string | null>(null)
/** Al crear, lo secundario va plegado. Al editar se ve todo. */
const showMore = ref(false)

const isEdit = computed(() => !!props.client)
const title = computed(() => (isEdit.value ? 'Editar cliente' : 'Nuevo cliente'))
const isMonthly = computed(() => form.billingType === 'monthly')
const paysSomething = computed(() => form.billingType !== null && form.billingType !== 'no_charge')

const startsInPast = computed(() => {
  if (!form.startDate) return false
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const start = new Date(`${form.startDate}T00:00:00`)
  return !Number.isNaN(start.getTime()) && start < firstOfMonth
})

watch(
  () => [props.modelValue, props.client] as const,
  ([open, client]) => {
    if (!open) return
    Object.assign(form, blank())
    generateBackfill.value = false
    markPaidUntil.value = null
    showMore.value = !!client
    Object.keys(errors).forEach((k) => delete errors[k])
    if (!client) return
    Object.assign(form, {
      name: client.name,
      legalName: client.legalName || '',
      contactName: client.contactName || '',
      contactEmail: client.contactEmail || '',
      contactPhone: client.contactPhone || '',
      amount: client.amount,
      issueDay: client.issueDay ?? null,
      collectionDay: client.collectionDay ?? null,
      collectionDayLabel: client.collectionDayLabel || '',
      paymentMethod: client.paymentMethod,
      billingType: client.billingType,
      categoryId: client.categoryId ?? null,
      splits: (client.splits || []).map((s) => ({ ...s })),
      notes: client.notes || '',
      tags: [...(client.tags || [])],
      autoDeactivate: client.autoDeactivate,
      graceDays: client.graceDays ?? null,
      startDate: toISODate(client.startDate) || '',
      billingStartPeriod: client.billingStartPeriod || '',
    })
  },
  { immediate: true },
)

function pickCadence(value: BillingType) {
  form.billingType = value
  delete errors.billingType
}

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio'
  if (!form.billingType) errors.billingType = 'Elige cada cuánto paga'
  if (paysSomething.value && Number(form.amount) <= 0) errors.amount = 'Indica cuánto paga'
  if (isMonthly.value && !form.collectionDay && !form.collectionDayLabel.trim())
    errors.collectionDay = 'Indica qué día paga'
  if (form.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail))
    errors.contactEmail = 'Email inválido'
  if (!form.startDate) errors.startDate = 'La fecha de inicio es obligatoria'
  return Object.keys(errors).length === 0
}

function payload(): Partial<Client> {
  return {
    name: form.name.trim(),
    legalName: form.legalName.trim() || undefined,
    contactName: form.contactName.trim() || undefined,
    contactEmail: form.contactEmail.trim() || undefined,
    contactPhone: form.contactPhone.trim() || undefined,
    amount: paysSomething.value ? Number(form.amount) : 0,
    issueDay: form.issueDay,
    collectionDay: form.collectionDay,
    collectionDayLabel: form.collectionDayLabel.trim() || undefined,
    paymentMethod: form.paymentMethod,
    billingType: form.billingType ?? 'monthly',
    categoryId: form.categoryId,
    splits: form.splits.map((s) => ({ label: s.label, amount: Number(s.amount), day: s.day ?? null })),
    notes: form.notes.trim() || undefined,
    tags: form.tags,
    autoDeactivate: form.autoDeactivate,
    graceDays: form.graceDays,
    startDate: form.startDate,
    billingStartPeriod: form.billingStartPeriod || null,
  }
}

async function submit() {
  if (!validate()) {
    toast.warning('Revisa el formulario', 'Hay campos obligatorios sin completar.')
    return
  }

  try {
    const saved = props.client
      ? await store.update(props.client._id, payload())
      : await store.create(payload())

    let extra = ''
    if (startsInPast.value && generateBackfill.value) {
      try {
        const result = await store.backfill(saved._id, form.startDate, markPaidUntil.value)
        extra = ` Se crearon ${result.created} cobros y se marcaron ${result.markedPaid} como pagados.`
      } catch (error) {
        toast.warning('Cliente guardado, pero el backfill falló', apiErrorMessage(error))
      }
    }

    // Agregar un cliente no registra ninguna venta ni cobro. Si ya había una
    // venta abierta con ese nombre, el backend la enlaza y lo dice aquí.
    const linked = Number((saved as Client & { linkedSales?: number }).linkedSales || 0)
    const linkedNote = linked > 0 ? ` Se enlazó ${linked} venta(s) abierta(s) con ese nombre.` : ''
    toast.success(
      props.client ? 'Cliente actualizado' : 'Cliente agregado',
      props.client
        ? `${saved.name} se guardó correctamente.${extra}`
        : `${saved.name} quedó en Clientes. No se registró ninguna venta: eso va en Ventas.${linkedNote}${extra}`,
    )
    emit('saved', saved)
    close()
  } catch (error) {
    toast.error('No se pudo guardar', apiErrorMessage(error))
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    :subtitle="isEdit ? '' : 'Quién es, cuánto paga y qué día. La venta se registra en Ventas.'"
    icon="fa-solid fa-user-plus"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <form class="form" @submit.prevent="submit">
      <BaseInput
        v-model="form.name"
        label="Nombre del negocio"
        placeholder="Cómo se llama el negocio"
        :error="errors.name"
        required
      />

      <div class="cadence" role="radiogroup" aria-label="¿Cada cuánto paga?">
        <span class="cadence__label">¿Cada cuánto paga? <span class="req">*</span></span>
        <div class="cadence__options">
          <button
            v-for="option in CADENCE_OPTIONS"
            :key="option.value"
            type="button"
            role="radio"
            class="cadence__option"
            :class="{ 'cadence__option--on': form.billingType === option.value }"
            :aria-checked="form.billingType === option.value"
            @click="pickCadence(option.value)"
          >
            <i :class="option.icon" aria-hidden="true" />
            <span class="cadence__title">{{ option.label }}</span>
            <span class="cadence__desc">{{ option.description }}</span>
          </button>
        </div>
        <p v-if="errors.billingType" class="cadence__error">{{ errors.billingType }}</p>
      </div>

      <div v-if="paysSomething" class="grid grid--3">
        <BaseCurrencyInput
          v-model="form.amount"
          :label="isMonthly ? '¿Cuánto paga al mes?' : '¿Cuánto paga?'"
          :error="errors.amount"
        />
        <BaseDayPicker
          v-if="isMonthly"
          v-model="form.collectionDay"
          label="¿Qué día paga?"
          :error="errors.collectionDay"
        />
        <BaseSelect v-model="form.paymentMethod" :options="PAYMENT_METHOD_OPTIONS" label="¿Con qué paga?" />
      </div>

      <p v-if="form.billingType === 'special'" class="hint">
        <i class="fa-solid fa-lightbulb" aria-hidden="true" />
        Como no es mensual, no se le genera cobro automático: el cobro con su fecha se registra en
        <strong>Ventas → Registrar venta</strong>.
      </p>

      <button
        v-if="!isEdit"
        type="button"
        class="more"
        :aria-expanded="showMore"
        @click="showMore = !showMore"
      >
        <i :class="showMore ? 'fa-solid fa-chevron-up' : 'fa-solid fa-chevron-down'" aria-hidden="true" />
        {{ showMore ? 'Menos opciones' : 'Más opciones (contacto, tipo de cliente, fechas…)' }}
      </button>

      <template v-if="showMore">
        <fieldset class="group">
          <legend><i class="fa-solid fa-address-book" aria-hidden="true" /> Contacto</legend>
          <div class="grid grid--3">
            <BaseInput v-model="form.contactName" label="Nombre de contacto" placeholder="Ana Pérez" />
            <BaseInput
              v-model="form.contactEmail"
              label="Email"
              type="email"
              placeholder="ana@empresa.com"
              :error="errors.contactEmail"
            />
            <BaseInput v-model="form.contactPhone" label="Teléfono" placeholder="+593 99 999 9999" />
          </div>
          <div class="grid">
            <BaseInput v-model="form.legalName" label="Razón social" placeholder="Opcional" />
            <ClientCategoryPicker v-model="form.categoryId" />
          </div>
        </fieldset>

        <fieldset v-if="isMonthly" class="group">
          <legend><i class="fa-solid fa-sack-dollar" aria-hidden="true" /> Detalle del cobro</legend>
          <div class="grid">
            <BaseDayPicker v-model="form.issueDay" label="Día de emisión" />
            <BaseInput
              v-model="form.collectionDayLabel"
              label="Etiqueta de cobro"
              placeholder="Ej. Último viernes laborable"
              hint="Texto libre para casos que no encajan en un día fijo."
            />
          </div>
          <ClientSplitsEditor v-model="form.splits" :total="form.amount" />
        </fieldset>

        <fieldset class="group">
          <legend><i class="fa-solid fa-sliders" aria-hidden="true" /> Reglas y fechas</legend>
          <div class="grid grid--3">
            <BaseDatePicker v-model="form.startDate" label="Fecha de inicio" :error="errors.startDate" />
            <BaseMonthPicker v-if="isMonthly" v-model="form.billingStartPeriod" label="Primer mes a facturar" />
            <BaseInput
              v-model="form.graceDays"
              label="Días de gracia propios"
              type="number"
              placeholder="Usa el valor global si lo dejas vacío"
            />
          </div>
          <p v-if="isMonthly" class="hint">
            <i class="fa-solid fa-lightbulb" aria-hidden="true" />
            "Primer mes a facturar" sirve cuando el cliente paga ahora pero el servicio arranca más adelante.
          </p>
          <BaseSwitch
            v-model="form.autoDeactivate"
            label="Auto-desactivación por mora"
            description="Desactiva el espacio del cliente cuando supere los días de gracia."
          />
        </fieldset>

        <ClientBackfillPanel
          v-if="startsInPast && isMonthly"
          :start-date="form.startDate"
          :mark-paid-until="markPaidUntil"
          :generate="generateBackfill"
          @update:mark-paid-until="markPaidUntil = $event"
          @update:generate="generateBackfill = $event"
        />

        <fieldset class="group">
          <legend><i class="fa-solid fa-note-sticky" aria-hidden="true" /> Extras</legend>
          <ClientTagsInput v-model="form.tags" label="Etiquetas" placeholder="Agencia, retainer…" />
          <BaseTextarea v-model="form.notes" label="Notas" :rows="3" placeholder="Acuerdos, condiciones especiales…" />
        </fieldset>
      </template>
    </form>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton icon="fa-solid fa-floppy-disk" :loading="store.saving" @click="submit">
        {{ isEdit ? 'Guardar cambios' : 'Agregar cliente' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.form {
  @include flex-col($sp-5);
}

.cadence {
  @include flex-col($sp-2);
}

.cadence__label {
  @include label-text;
  color: $primary-dark;
}

.req {
  color: $alert-error;
}

.cadence__options {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-2;

  @include md {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.cadence__option {
  @include flex-col(2px);
  align-items: flex-start;
  text-align: left;
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  i {
    color: $primary;
    margin-bottom: 2px;
  }

  &:hover {
    border-color: $primary;
  }

  &--on {
    border-color: $primary;
    background: rgba($primary-light, 0.5);
    color: $primary-dark;
  }
}

.cadence__title {
  font-weight: 700;
  font-size: $fs-sm;
}

.cadence__desc {
  font-size: $fs-xs;
}

.cadence__error {
  font-size: $fs-xs;
  color: $alert-error;
}

.more {
  @include flex(row, flex-start, center, $sp-2);
  align-self: flex-start;
  padding: $sp-2 0;
  border: none;
  background: transparent;
  color: $primary;
  font-size: $fs-xs;
  font-weight: 700;
  cursor: pointer;
}

.group {
  @include flex-col($sp-3);
  border: none;

  legend {
    @include label-text;
    color: $primary;
    margin-bottom: $sp-2;

    i {
      margin-right: $sp-2;
    }
  }
}

.hint {
  @include flex(row, flex-start, flex-start, $sp-2);
  font-size: $fs-xs;
  line-height: 1.5;
  color: $text-secondary;

  i {
    color: $alert-warning;
    margin-top: 2px;
  }

  strong {
    color: $primary-dark;
  }
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include md {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &--3 {
    @include lg {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}
</style>
