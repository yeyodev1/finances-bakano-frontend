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
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useSalesStore } from '@/stores/sales'
import { useUsersStore } from '@/stores/users'
import SaleItemsEditor from './SaleItemsEditor.vue'
import SaleBillingFields from './SaleBillingFields.vue'
import ClientTypeField from './ClientTypeField.vue'
import { SALE_FREQUENCY_OPTIONS } from '@/config/saleOptions'
import type { Sale, SaleBilling, SaleFrequency, SaleItem, SelectOption } from '@/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; created: [sale: Sale] }>()

const sales = useSalesStore()
const users = useUsersStore()
const clients = useClientsStore()
const toast = useToast()
const { formatMoney, formatDateShort, toISODate } = useFormat()

const form = reactive({
  businessName: '',
  clientId: '' as string,
  categoryId: '' as string,
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  amount: 0,
  frequency: 'unico' as SaleFrequency,
  installmentsCount: 1,
  firstChargeDate: '',
  soldBy: '',
  ownerId: '',
  notes: '',
})

const touched = ref(false)
const items = ref<SaleItem[]>([])
const billing = ref<SaleBilling>({ needsInvoice: false })

/** Con conceptos el total manda el desglose; sin ellos, el campo suelto. */
const total = computed(() =>
  items.value.length
    ? items.value.reduce((acc, item) => acc + Number(item.amount || 0), 0)
    : Number(form.amount || 0),
)

const itemsValid = computed(
  () => !items.value.length || items.value.every((i) => i.concept.trim() && Number(i.amount) > 0),
)

const userOptions = computed<SelectOption[]>(() =>
  users.items
    .filter((u) => u.isActive)
    .map((u) => ({ value: u._id, label: u.name, description: u.email, image: u.photoUrl || null })),
)

const clientOptions = computed<SelectOption[]>(() => [
  { value: '', label: 'Cliente nuevo (todavía no existe)', icon: 'fa-solid fa-star' },
  ...clients.pickerOptions,
])

/** Línea del objetivo que corresponde al tipo elegido, para avisar cuánto falta. */
const goalLine = computed(() =>
  form.categoryId ? sales.goal?.lines.find((l) => l.categoryId === form.categoryId) ?? null : null,
)

const goalHint = computed(() => {
  if (!form.categoryId) return 'Sin tipo, la venta queda sin clasificar y no suma al objetivo'
  if (!sales.goal?.hasGoal) return 'Este mes no tiene objetivo definido'
  if (!goalLine.value) return 'Este tipo no está en el objetivo del mes: se verá aparte'
  const l = goalLine.value
  return `Objetivo: ${l.soldCount}/${l.targetCount} · ${formatMoney(l.soldAmount)} de ${formatMoney(l.targetAmount)}`
})

const isSingle = computed(() => form.frequency === 'unico')

/** Vista previa del calendario de cobros, calculada igual que en el backend. */
const preview = computed(() => {
  if (!form.firstChargeDate || total.value <= 0) return []
  const count = isSingle.value ? 1 : Math.max(Number(form.installmentsCount) || 1, 1)
  const grand = total.value
  const base = Math.floor((grand / count) * 100) / 100
  const start = new Date(form.firstChargeDate)
  if (Number.isNaN(start.getTime())) return []

  const rows: Array<{ index: number; dueDate: Date; amount: number }> = []
  let assigned = 0

  for (let i = 0; i < count; i += 1) {
    const isLast = i === count - 1
    const value = isLast ? Number((grand - assigned).toFixed(2)) : base
    assigned = Number((assigned + value).toFixed(2))

    const due = new Date(start)
    if (i > 0) {
      if (form.frequency === 'mensual') due.setMonth(due.getMonth() + i)
      else if (form.frequency === 'trimestral') due.setMonth(due.getMonth() + i * 3)
      else if (form.frequency === 'semanal') due.setDate(due.getDate() + 7 * i)
      else if (form.frequency === 'quincenal') due.setDate(due.getDate() + 15 * i)
    }
    rows.push({ index: i, dueDate: due, amount: value })
  }
  return rows
})

const errors = computed(() => ({
  businessName: touched.value && !form.businessName.trim() ? 'Indica el nombre del negocio' : '',
  amount: touched.value && total.value <= 0 ? 'El monto debe ser mayor a cero' : '',
  firstChargeDate: touched.value && !form.firstChargeDate ? 'Indica cuándo se cobra' : '',
  soldBy: touched.value && !form.soldBy ? 'Indica quién cerró la venta' : '',
  ownerId: touched.value && !form.ownerId ? 'Indica quién debe cobrarla' : '',
}))

const isValid = computed(
  () =>
    !!form.businessName.trim() &&
    total.value > 0 &&
    itemsValid.value &&
    !!form.firstChargeDate &&
    !!form.soldBy &&
    !!form.ownerId,
)

const model = <K extends keyof typeof form>(key: K) =>
  computed<string | number | null>({
    get: () => (form[key] as string) || null,
    set: (value) => {
      form[key] = (value ? String(value) : '') as (typeof form)[K]
    },
  })

const frequencyModel = model('frequency')
const soldByModel = model('soldBy')
const ownerModel = model('ownerId')
const clientModel = computed<string | number | null>({
  get: () => form.clientId || '',
  set: (value) => {
    form.clientId = value ? String(value) : ''
    const client = clients.picker.find((c) => c._id === form.clientId)
    if (client) {
      form.businessName = client.name
      if (!form.amount) form.amount = Number(client.amount || 0)
      // El tipo de la ficha del cliente manda si todavía no se eligió uno.
      if (!form.categoryId && client.categoryId) form.categoryId = client.categoryId
    }
  },
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    touched.value = false
    Object.assign(form, {
      businessName: '',
      clientId: '',
      categoryId: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      amount: 0,
      frequency: 'unico' as SaleFrequency,
      installmentsCount: 1,
      firstChargeDate: toISODate(new Date()) || '',
      soldBy: '',
      ownerId: '',
      notes: '',
    })
    items.value = []
    billing.value = { needsInvoice: false }
    if (!users.items.length) users.fetch().catch(() => undefined)
    clients.fetchPicker().catch(() => undefined)
    if (!clients.categories.length) clients.fetchCategories().catch(() => undefined)
  },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  touched.value = true
  if (!isValid.value) {
    toast.warning('Revisa el formulario', 'Faltan campos obligatorios.')
    return
  }

  try {
    const sale = await sales.create({
      businessName: form.businessName.trim(),
      clientId: form.clientId || null,
      categoryId: form.categoryId || null,
      contactName: form.contactName.trim() || undefined,
      contactEmail: form.contactEmail.trim() || undefined,
      contactPhone: form.contactPhone.trim() || undefined,
      amount: total.value,
      items: items.value.length ? items.value : undefined,
      billing: billing.value,
      frequency: form.frequency,
      installmentsCount: isSingle.value ? 1 : Number(form.installmentsCount),
      firstChargeDate: form.firstChargeDate,
      soldBy: form.soldBy,
      ownerId: form.ownerId,
      notes: form.notes.trim() || undefined,
    })
    toast.success('Venta registrada', `${sale.businessName} · ${formatMoney(sale.amount)}`)
    emit('created', sale)
    close()
  } catch (error) {
    toast.error('No se pudo registrar la venta', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Registrar venta"
    subtitle="Acuerdo cerrado hoy, cobros programados a futuro"
    icon="fa-solid fa-handshake"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="sale-form">
      <p class="sale-form__notice">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        La venta se registra sin cobrar. Cada cuota queda programada con su fecha y se marca como
        cobrada cuando entre el dinero. Si nunca paga, se da por perdida con su motivo.
      </p>

      <div class="fields">
        <BaseSelect
          v-model="clientModel"
          :options="clientOptions"
          label="¿Ya es cliente?"
          placeholder="Cliente nuevo"
          icon="fa-solid fa-user"
          searchable
        />
        <BaseInput
          v-model="form.businessName"
          label="Nombre del negocio"
          placeholder="Cómo se llama el negocio"
          :error="errors.businessName"
          required
        />
      </div>

      <ClientTypeField
        :model-value="form.categoryId || null"
        :hint="goalHint"
        :highlight="(sales.goal?.lines ?? []).map((l) => l.categoryId)"
        @update:model-value="form.categoryId = $event ?? ''"
      />

      <SaleItemsEditor v-model="items" />

      <div class="fields">
        <BaseCurrencyInput
          v-if="!items.length"
          v-model="form.amount"
          label="Monto total acordado"
          :error="errors.amount"
          hint="O añade conceptos arriba y se calcula solo"
        />
        <BaseSelect
          v-model="frequencyModel"
          :options="SALE_FREQUENCY_OPTIONS"
          label="¿Cómo se cobra?"
          icon="fa-solid fa-arrows-rotate"
        />
        <BaseInput
          v-if="!isSingle"
          v-model.number="form.installmentsCount"
          type="number"
          label="¿En cuántos cobros?"
          :min="1"
          hint="Se reparte el total entre todos"
        />
        <BaseDatePicker
          v-model="form.firstChargeDate"
          label="Primer cobro"
          :error="errors.firstChargeDate"
        />
      </div>

      <div class="fields">
        <BaseSelect
          v-model="soldByModel"
          :options="userOptions"
          label="Vendedor que cerró"
          placeholder="Selecciona al vendedor"
          icon="fa-solid fa-user-tie"
          :error="errors.soldBy"
          searchable
          required
        />
        <BaseSelect
          v-model="ownerModel"
          :options="userOptions"
          label="Responsable de cobrarla"
          placeholder="Quién persigue el cobro"
          icon="fa-solid fa-hand-holding-dollar"
          :error="errors.ownerId"
          searchable
          required
        />
      </div>

      <section v-if="preview.length" class="schedule">
        <h3 class="schedule__title">
          <i class="fa-solid fa-calendar-days" aria-hidden="true" />
          Calendario de cobros ({{ preview.length }})
        </h3>
        <ul class="schedule__list">
          <li v-for="row in preview" :key="row.index" class="schedule__row">
            <span class="schedule__n">{{ row.index + 1 }}</span>
            <span class="schedule__date">{{ formatDateShort(row.dueDate) }}</span>
            <span class="schedule__amount">{{ formatMoney(row.amount) }}</span>
          </li>
        </ul>
      </section>

      <div class="fields">
        <BaseInput v-model="form.contactName" label="Contacto (opcional)" />
        <BaseInput v-model="form.contactEmail" label="Correo (opcional)" type="email" />
        <BaseInput v-model="form.contactPhone" label="Teléfono (opcional)" />
      </div>

      <SaleBillingFields v-model="billing" />

      <BaseTextarea
        v-model="form.notes"
        label="Notas del acuerdo"
        :rows="2"
        placeholder="Qué se pactó, condiciones, alcance…"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton icon="fa-solid fa-check" :loading="sales.saving" @click="submit">
        Registrar venta
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.sale-form {
  @include flex-col($sp-4);
}

.sale-form__notice {
  @include flex(row, flex-start, flex-start, $sp-2);
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

.fields {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;

  > * {
    flex: 1 1 200px;
    min-width: 0;
  }
}

.schedule {
  @include flex-col($sp-2);
  padding: $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: rgba($primary-light, 0.4);
}

.schedule__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 700;
  color: $primary-dark;

  i { color: $primary; }
}

.schedule__list {
  @include flex-col($sp-1);
  max-height: 190px;
  overflow-y: auto;
  @include scrollbar(6px);
}

.schedule__row {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-2 0;
  font-size: $fs-xs;
  border-bottom: 1px solid rgba($border-color, 0.6);

  &:last-child { border-bottom: none; }
}

.schedule__n {
  @include flex-center;
  flex: none;
  width: 22px;
  height: 22px;
  border-radius: $radius-full;
  background: rgba($primary, 0.12);
  color: $primary;
  font-weight: 700;
  font-size: 0.66rem;
}

.schedule__date { flex: 1 1 auto; color: $text-secondary; }
.schedule__amount { flex: none; font-weight: 700; color: $primary-dark; }
</style>
