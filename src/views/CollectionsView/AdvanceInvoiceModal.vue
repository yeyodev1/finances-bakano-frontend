<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  BaseButton,
  BaseCurrencyInput,
  BaseDatePicker,
  BaseModal,
  BaseMonthPicker,
  BaseSelect,
  BaseTextarea,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useInvoicesStore } from '@/stores/invoices'
import type { Client, Invoice, SelectOption } from '@/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [invoice: Invoice]
  pay: [invoice: Invoice]
}>()

const clients = useClientsStore()
const invoices = useInvoicesStore()
const toast = useToast()
const { formatPeriod, formatMoney } = useFormat()

const form = reactive({
  clientId: '' as string,
  period: '',
  amount: 0 as number,
  dueDate: '' as string,
  notes: '',
})

const touched = ref(false)
const loadingClients = ref(false)

function nextPeriod(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
}

const activeClients = computed<Client[]>(() =>
  clients.items.filter((c) => !c.isArchived && c.isActive),
)

const clientOptions = computed<SelectOption[]>(() =>
  activeClients.value.map((c) => ({
    value: c._id,
    label: c.name,
    description: formatMoney(c.amount),
    icon: 'fa-solid fa-building',
  })),
)

const selectedClient = computed(() => activeClients.value.find((c) => c._id === form.clientId) ?? null)

const clientModel = computed<string | number | null>({
  get: () => form.clientId || null,
  set: (value) => {
    form.clientId = value ? String(value) : ''
    const client = activeClients.value.find((c) => c._id === form.clientId)
    if (client) form.amount = Number(client.amount || 0)
  },
})

const errors = computed(() => ({
  clientId: touched.value && !form.clientId ? 'Selecciona el cliente' : '',
  period: touched.value && !form.period ? 'Selecciona el período a facturar' : '',
  amount: touched.value && Number(form.amount) <= 0 ? 'El monto debe ser mayor a cero' : '',
}))

const isValid = computed(
  () => !!form.clientId && !!form.period && Number(form.amount) > 0,
)

async function ensureClients() {
  if (clients.items.length) return
  loadingClients.value = true
  try {
    await clients.fetch(1)
  } catch (error) {
    toast.error('No se pudieron cargar los clientes', apiErrorMessage(error))
  } finally {
    loadingClients.value = false
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    touched.value = false
    form.clientId = ''
    form.period = nextPeriod()
    form.amount = 0
    form.dueDate = ''
    form.notes = ''
    void ensureClients()
  },
)

onMounted(() => {
  if (props.modelValue) void ensureClients()
})

function close() {
  emit('update:modelValue', false)
}

async function submit(thenPay: boolean) {
  touched.value = true
  if (!isValid.value) {
    toast.warning('Revisa el formulario', 'Completa cliente, período y monto para continuar.')
    return
  }

  try {
    const created = await invoices.createAdvance({
      clientId: form.clientId,
      period: form.period,
      amount: Number(form.amount),
      dueDate: form.dueDate || undefined,
      notes: form.notes.trim() || undefined,
    })

    toast.success(
      'Cobro anticipado creado',
      `${selectedClient.value?.name ?? 'Cliente'} · ${formatPeriod(form.period)}`,
    )
    emit('created', created)
    if (thenPay) emit('pay', created)
    close()
  } catch (error) {
    toast.error('No se pudo crear el cobro anticipado', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Cobro anticipado"
    icon="fa-solid fa-forward"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="advance">
      <div class="advance__notice">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        <p>
          Crea el cobro de un período futuro para poder registrar el pago hoy. Útil cuando el
          cliente paga por adelantado pero el servicio arranca más adelante.
        </p>
      </div>

      <BaseSelect
        v-model="clientModel"
        :options="clientOptions"
        label="Cliente"
        placeholder="Busca y selecciona el cliente"
        icon="fa-solid fa-user"
        :error="errors.clientId"
        :empty-text="loadingClients ? 'Cargando clientes…' : 'Sin clientes activos'"
        searchable
        required
      />

      <div class="grid">
        <BaseMonthPicker v-model="form.period" label="Período a facturar" :error="errors.period" />
        <BaseCurrencyInput v-model="form.amount" label="Monto" :error="errors.amount" />
      </div>

      <BaseDatePicker
        v-model="form.dueDate"
        label="Fecha de vencimiento (opcional)"
        placeholder="Si la dejas vacía se calcula con el día de cobro del cliente"
      />

      <BaseTextarea
        v-model="form.notes"
        label="Notas"
        :rows="2"
        placeholder="Acuerdo de pago anticipado, alcance del servicio…"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton variant="outline" icon="fa-solid fa-plus" :loading="invoices.working" @click="submit(false)">
        Solo crear
      </BaseButton>
      <BaseButton
        variant="success"
        icon="fa-solid fa-hand-holding-dollar"
        :loading="invoices.working"
        @click="submit(true)"
      >
        Crear y registrar pago
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.advance {
  @include flex-col($sp-4);
}

.advance__notice {
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
    margin-top: 2px;
  }
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
