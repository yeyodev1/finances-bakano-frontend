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
import ClientSplitsEditor from './ClientSplitsEditor.vue'
import ClientTagsInput from './ClientTagsInput.vue'
import ClientBackfillPanel from './ClientBackfillPanel.vue'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { BILLING_TYPE_OPTIONS, PAYMENT_METHOD_OPTIONS, apiErrorMessage, useClientsStore } from '@/stores/clients'
import type { BillingType, Client, ClientSplit, PaymentMethod } from '@/types'

const props = defineProps<{ modelValue: boolean; client: Client | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [client: Client] }>()

const store = useClientsStore()
const toast = useToast()
const { toISODate } = useFormat()

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
  billingType: BillingType
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
    issueDay: 1,
    collectionDay: 5,
    collectionDayLabel: '',
    paymentMethod: 'transferencia',
    billingType: 'monthly',
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

const isEdit = computed(() => !!props.client)
const title = computed(() => (isEdit.value ? 'Editar cliente' : 'Nuevo cliente'))

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

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  if (!form.name.trim()) errors.name = 'El nombre es obligatorio'
  if (form.billingType !== 'no_charge' && Number(form.amount) <= 0)
    errors.amount = 'El monto debe ser mayor a cero'
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
    amount: Number(form.amount),
    issueDay: form.issueDay,
    collectionDay: form.collectionDay,
    collectionDayLabel: form.collectionDayLabel.trim() || undefined,
    paymentMethod: form.paymentMethod,
    billingType: form.billingType,
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

    toast.success(
      props.client ? 'Cliente actualizado' : 'Cliente creado',
      `${saved.name} se guardó correctamente.${extra}`,
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
  <BaseModal :model-value="modelValue" :title="title" size="lg" @update:model-value="emit('update:modelValue', $event)">
    <form class="form" @submit.prevent="submit">
      <fieldset class="group">
        <legend><i class="fa-solid fa-id-card" aria-hidden="true" /> Identificación</legend>
        <div class="grid">
          <BaseInput v-model="form.name" label="Nombre comercial" placeholder="Bakano Media" :error="errors.name" required />
          <BaseInput v-model="form.legalName" label="Razón social" placeholder="Opcional" />
        </div>
      </fieldset>

      <fieldset class="group">
        <legend><i class="fa-solid fa-address-book" aria-hidden="true" /> Contacto</legend>
        <div class="grid grid--3">
          <BaseInput v-model="form.contactName" label="Nombre de contacto" placeholder="Ana Pérez" />
          <BaseInput v-model="form.contactEmail" label="Email" type="email" placeholder="ana@empresa.com" :error="errors.contactEmail" />
          <BaseInput v-model="form.contactPhone" label="Teléfono" placeholder="+593 99 999 9999" />
        </div>
      </fieldset>

      <fieldset class="group">
        <legend><i class="fa-solid fa-sack-dollar" aria-hidden="true" /> Cobro</legend>
        <div class="grid grid--3">
          <BaseCurrencyInput v-model="form.amount" label="Monto mensual" :error="errors.amount" />
          <BaseDayPicker v-model="form.issueDay" label="Día de emisión" />
          <BaseDayPicker v-model="form.collectionDay" label="Día de cobro" />
        </div>
        <BaseInput
          v-model="form.collectionDayLabel"
          label="Etiqueta de cobro"
          placeholder="Ej. Último viernes laborable"
          hint="Texto libre para casos que no encajan en un día fijo."
        />
        <div class="grid">
          <BaseSelect v-model="form.paymentMethod" :options="PAYMENT_METHOD_OPTIONS" label="Método de pago" />
          <BaseSelect v-model="form.billingType" :options="BILLING_TYPE_OPTIONS" label="Tipo de facturación" />
        </div>
      </fieldset>

      <ClientSplitsEditor v-model="form.splits" :total="form.amount" />

      <fieldset class="group">
        <legend><i class="fa-solid fa-sliders" aria-hidden="true" /> Reglas y fechas</legend>
        <div class="grid grid--3">
          <BaseDatePicker v-model="form.startDate" label="Fecha de inicio" :error="errors.startDate" />
          <BaseMonthPicker v-model="form.billingStartPeriod" label="Primer mes a facturar" />
          <BaseInput
            v-model="form.graceDays"
            label="Días de gracia propios"
            type="number"
            placeholder="Usa el valor global si lo dejas vacío"
          />
        </div>
        <p class="hint">
          <i class="fa-solid fa-lightbulb" aria-hidden="true" />
          Úsalo cuando el cliente paga ahora pero el servicio arranca más adelante.
        </p>
        <BaseSwitch
          v-model="form.autoDeactivate"
          label="Auto-desactivación por mora"
          description="Desactiva el espacio del cliente cuando supere los días de gracia."
        />
      </fieldset>

      <ClientBackfillPanel
        v-if="startsInPast"
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
    </form>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton icon="fa-solid fa-floppy-disk" :loading="store.saving" @click="submit">
        {{ isEdit ? 'Guardar cambios' : 'Crear cliente' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.form {
  @include flex-col($sp-5);
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
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;

  i {
    color: $alert-warning;
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
