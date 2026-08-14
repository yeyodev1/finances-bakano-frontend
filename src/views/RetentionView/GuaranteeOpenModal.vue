<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BaseButton,
  BaseModal,
  BaseMonthPicker,
  BaseSelect,
  BaseTextarea,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useRetentionStore } from '@/stores/retention'
import { periodChip } from '@/config/retention'
import type { Client } from '@/types'

const props = withDefaults(
  defineProps<{ modelValue: boolean; client?: Client | null }>(),
  { client: null },
)

const emit = defineEmits<{ 'update:modelValue': [value: boolean]; opened: [] }>()

const store = useRetentionStore()
const clients = useClientsStore()
const toast = useToast()
const { formatMoney, toPeriod } = useFormat()

const pickedId = ref('')
const triggerPeriod = ref('')
const period = ref('')
const reason = ref('')

const target = computed<Client | null>(
  () => props.client ?? clients.picker.find((c) => c._id === pickedId.value) ?? null,
)

const pickedModel = computed<string | number | null>({
  get: () => pickedId.value || null,
  set: (value) => {
    pickedId.value = value ? String(value) : ''
  },
})

/** Solo clientes activos: a un archivado se le reactiva antes de darle garantía. */
const activeOptions = computed(() =>
  clients.pickerOptions.filter((option) => {
    const client = clients.picker.find((c) => c._id === option.value)
    return client && !client.isArchived
  }),
)

const monthly = computed(() => Number(target.value?.amount ?? 0))

const canSubmit = computed(
  () => !!target.value && !!period.value && !!triggerPeriod.value && !store.saving,
)

/** Un mes de garantía no puede empezar antes del mes que salió mal. */
const periodError = computed(() =>
  period.value && triggerPeriod.value && period.value < triggerPeriod.value
    ? 'El mes de garantía no puede ser anterior al mes sin resultados'
    : '',
)

function nextPeriod(from: string): string {
  const [year, month] = from.split('-').map(Number)
  if (!year || !month) return from
  const date = new Date(year, month, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    const now = toPeriod(new Date()) || ''
    pickedId.value = ''
    triggerPeriod.value = now
    period.value = nextPeriod(now)
    reason.value = ''
    if (!props.client) {
      clients.fetchPicker().catch((error) => {
        toast.error('No se pudieron cargar los clientes', apiErrorMessage(error))
      })
    }
  },
)

// Mover el mes sin resultados arrastra el mes regalado: casi siempre es el siguiente.
watch(triggerPeriod, (value, previous) => {
  if (!value || !previous) return
  if (period.value === nextPeriod(previous)) period.value = nextPeriod(value)
})

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  const client = target.value
  if (!client || periodError.value) return

  try {
    const result = await store.openGuarantee({
      clientId: client._id,
      period: period.value,
      triggerPeriod: triggerPeriod.value,
      reason: reason.value.trim() || undefined,
    })

    toast.success(
      'Garantía abierta',
      `${client.name} no paga ${periodChip(period.value)}. Se dejaron de cobrar ${formatMoney(
        result.waivedAmount,
      )}.`,
    )
    emit('opened')
    close()
  } catch (error) {
    toast.error('No se pudo abrir la garantía', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Dar mes de garantía"
    icon="fa-solid fa-shield-halved"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="guar">
      <section class="guar__notice">
        <i class="fa-solid fa-handshake-angle" aria-hidden="true" />
        <div>
          <p class="guar__notice-title">Somos agencia: cobramos por resultados</p>
          <p>
            Si el cliente no vio resultados, arranca el mes siguiente sin pagarnos. Si aparecen,
            se vuelve a cobrar. Si no, la política permite un segundo mes; agotado, se marca
            como fracaso.
          </p>
        </div>
      </section>

      <BaseSelect
        v-if="!props.client"
        v-model="pickedModel"
        :options="activeOptions"
        label="Cliente al que se le da garantía"
        placeholder="Busca y selecciona el cliente"
        icon="fa-solid fa-user"
        :empty-text="clients.pickerLoading ? 'Cargando clientes…' : 'Sin clientes activos'"
        searchable
        required
      />

      <section v-if="target" class="guar__summary">
        <div class="guar__figure">
          <span class="guar__label">Cliente</span>
          <span class="guar__value">{{ target.name }}</span>
        </div>
        <div class="guar__figure">
          <span class="guar__label">Se deja de cobrar</span>
          <span class="guar__value guar__value--loss">{{ formatMoney(monthly) }} / mes</span>
        </div>
        <div class="guar__figure">
          <span class="guar__label">Tope de la política</span>
          <span class="guar__value">2 meses</span>
        </div>
      </section>

      <div class="guar__row">
        <BaseMonthPicker v-model="triggerPeriod" label="Mes que quedó sin resultados" />
        <BaseMonthPicker
          v-model="period"
          label="Mes que se regala"
          :min="triggerPeriod"
          :error="periodError"
        />
      </div>

      <BaseTextarea
        v-model="reason"
        label="Qué se le prometió (opcional)"
        :rows="3"
        placeholder="Acuerdo con el cliente, métricas que se comprometieron, plazo…"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton
        variant="primary"
        icon="fa-solid fa-shield-halved"
        :disabled="!canSubmit"
        :loading="store.saving"
        @click="submit"
      >
        Abrir garantía
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.guar {
  @include flex-col($sp-4);
}

.guar__notice {
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
    font-size: $fs-md;
    margin-top: 2px;
  }
}

.guar__notice-title {
  font-weight: 800;
  color: $primary-dark;
  margin-bottom: 2px;
}

.guar__summary {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid rgba($primary, 0.18);
  background: rgba($primary, 0.05);
}

.guar__figure {
  @include flex-col(2px);
  flex: 1 1 150px;
  min-width: 0;
}

.guar__label {
  @include label-text;
}

.guar__value {
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;

  &--loss {
    color: $alert-warning;
  }
}

.guar__row {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;

  > * {
    flex: 1 1 200px;
    min-width: 0;
  }
}
</style>
