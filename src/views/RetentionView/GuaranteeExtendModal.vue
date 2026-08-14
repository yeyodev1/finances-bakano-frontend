<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseModal, BaseMonthPicker, BaseTextarea } from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { useRetentionStore } from '@/stores/retention'
import { periodChip } from '@/config/retention'
import type { Guarantee } from '@/types'

const props = defineProps<{ modelValue: boolean; guarantee: Guarantee | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; extended: [] }>()

const store = useRetentionStore()
const toast = useToast()
const { formatMoney } = useFormat()

const period = ref('')
const resultNotes = ref('')

const lastPeriod = computed(() => {
  const cycles = props.guarantee?.cycles ?? []
  return cycles[cycles.length - 1]?.period ?? ''
})

const alreadyWaived = computed(() =>
  (props.guarantee?.cycles ?? []).reduce((total, cycle) => total + Number(cycle.waivedAmount || 0), 0),
)

function nextPeriod(from: string): string {
  const [year, month] = from.split('-').map(Number)
  if (!year || !month) return from
  const date = new Date(year, month, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const periodError = computed(() =>
  period.value && lastPeriod.value && period.value <= lastPeriod.value
    ? 'El segundo mes debe ser posterior al primero'
    : '',
)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    period.value = lastPeriod.value ? nextPeriod(lastPeriod.value) : ''
    resultNotes.value = ''
  },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  const guarantee = props.guarantee
  if (!guarantee || periodError.value) return

  try {
    const result = await store.extendGuarantee(guarantee._id, {
      period: period.value || undefined,
      resultNotes: resultNotes.value.trim() || undefined,
    })
    toast.success(
      'Garantía extendida',
      `${guarantee.clientName} tampoco paga ${periodChip(period.value)} (${formatMoney(
        result.waivedAmount,
      )}).`,
    )
    emit('extended')
    close()
  } catch (error) {
    toast.error('No se pudo extender la garantía', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Extender la garantía un mes más"
    icon="fa-solid fa-hourglass-half"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="guarantee" class="ext">
      <section class="ext__notice">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        <div>
          <p class="ext__notice-title">Último mes que permite la política</p>
          <p>
            {{ guarantee.clientName }} ya lleva {{ guarantee.cycles.length }} mes(es) sin pagar
            ({{ formatMoney(alreadyWaived) }}). Si al cierre de este segundo mes tampoco hay
            resultados, la garantía se marca como fracaso.
          </p>
        </div>
      </section>

      <BaseMonthPicker
        v-model="period"
        label="Segundo mes regalado"
        :min="lastPeriod"
        :error="periodError"
      />

      <BaseTextarea
        v-model="resultNotes"
        label="Qué pasó en el primer mes"
        :rows="3"
        placeholder="Métricas que sí mejoraron, qué faltó, qué se va a cambiar…"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton
        variant="secondary"
        icon="fa-solid fa-hourglass-half"
        :disabled="!period || !!periodError || store.saving"
        :loading="store.saving"
        @click="submit"
      >
        Extender un mes
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.ext {
  @include flex-col($sp-4);
}

.ext__notice {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-warning-bg;
  border: 1px solid rgba($alert-warning, 0.28);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i {
    color: $alert-warning;
    font-size: $fs-md;
    margin-top: 2px;
  }
}

.ext__notice-title {
  font-weight: 800;
  color: $primary-dark;
  margin-bottom: 2px;
}
</style>
