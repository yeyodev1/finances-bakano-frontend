<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseDatePicker, BaseModal, BaseSelect, BaseTextarea } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { useSalesStore } from '@/stores/sales'
import { SALE_LOST_REASON_OPTIONS } from '@/config/saleOptions'
import type { Sale, SaleLostReason } from '@/types'

/** Baja de la venta: el motivo es obligatorio, si no el dato no sirve para nada. */
const props = defineProps<{ modelValue: boolean; sale: Sale | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [] }>()

const sales = useSalesStore()
const toast = useToast()
const { formatMoney, toISODate } = useFormat()

const reason = ref<SaleLostReason | null>(null)
const notes = ref('')
const lostAt = ref('')

const reasonModel = computed<string | number | null>({
  get: () => reason.value,
  set: (value) => {
    reason.value = (value as SaleLostReason) || null
  },
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    reason.value = null
    notes.value = ''
    lostAt.value = toISODate(new Date()) || ''
  },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (!props.sale || !reason.value) {
    toast.warning('Falta el motivo', 'Indica por qué se perdió la venta.')
    return
  }

  try {
    await sales.lose(props.sale._id, {
      reason: reason.value,
      notes: notes.value.trim() || undefined,
      lostAt: lostAt.value || undefined,
    })
    toast.success('Venta dada por perdida', `${props.sale.businessName} salió del circuito de cobro.`)
    emit('done')
    close()
  } catch (error) {
    toast.error('No se pudo dar por perdida', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Dar la venta por perdida"
    :subtitle="sale?.businessName"
    icon="fa-solid fa-circle-xmark"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="sale" class="lose">
      <p class="lose__notice">
        <i class="fa-solid fa-shield-halved" aria-hidden="true" />
        La venta no se borra: queda con su motivo y su historial completo para poder analizar por
        qué se cae el dinero acordado. Se puede reabrir después.
      </p>

      <p class="lose__amount">
        Deja de esperarse <strong>{{ formatMoney(sale.amount) }}</strong>
      </p>

      <BaseSelect
        v-model="reasonModel"
        :options="SALE_LOST_REASON_OPTIONS"
        label="Motivo"
        placeholder="Por qué se perdió"
        icon="fa-solid fa-circle-question"
        searchable
        required
      />

      <BaseDatePicker v-model="lostAt" label="Fecha en que se dio por perdida" />

      <BaseTextarea
        v-model="notes"
        label="Notas (opcional)"
        :rows="3"
        placeholder="Qué pasó, con quién se habló, qué dijeron…"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton
        variant="danger"
        icon="fa-solid fa-circle-xmark"
        :disabled="!reason"
        :loading="sales.saving"
        @click="submit"
      >
        Dar por perdida
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.lose {
  @include flex-col($sp-4);
}

.lose__notice {
  @include flex(row, flex-start, flex-start, $sp-2);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i {
    color: $alert-info;
    margin-top: 2px;
  }
}

.lose__amount {
  font-size: $fs-xs;
  color: $text-secondary;

  strong {
    color: $alert-error;
    font-weight: 800;
    font-size: $fs-base;
  }
}
</style>
