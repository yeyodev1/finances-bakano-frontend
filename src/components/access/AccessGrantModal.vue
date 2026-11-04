<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseDatePicker, BaseModal, BaseSelect, BaseTextarea } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { SelectOption } from '@/types'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    clientName?: string
    workspaceName?: string
    overdueAmount?: number
    maxDaysOverdue?: number
    loading?: boolean
  }>(),
  { clientName: '', workspaceName: '', overdueAmount: 0, maxDaysOverdue: 0, loading: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [payload: { reason: string; until: string | null }]
}>()

const { formatMoney, toISODate } = useFormat()

const PRESETS: SelectOption[] = [
  { value: 'promesa', label: 'Promesa de pago del cliente', icon: 'fa-solid fa-handshake' },
  { value: 'transferencia', label: 'Transferencia en tránsito / por confirmar', icon: 'fa-solid fa-money-bill-transfer' },
  { value: 'acuerdo', label: 'Acuerdo comercial vigente', icon: 'fa-solid fa-file-signature' },
  { value: 'campana', label: 'Campaña activa que no se puede frenar', icon: 'fa-solid fa-bullhorn' },
  { value: 'cortesia', label: 'Cortesía autorizada por dirección', icon: 'fa-solid fa-user-shield' },
  { value: 'otro', label: 'Otro motivo (escribirlo)', icon: 'fa-solid fa-pen' },
]

const preset = ref<string | number | null>(null)
const notes = ref('')
const until = ref<string | null>(null)
const touched = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    preset.value = null
    notes.value = ''
    until.value = null
    touched.value = false
  },
)

const presetLabel = computed(
  () => PRESETS.find((option) => option.value === preset.value)?.label ?? '',
)

const reason = computed(() => {
  const extra = notes.value.trim()
  if (!preset.value || preset.value === 'otro') return extra
  return extra ? `${presetLabel.value} — ${extra}` : presetLabel.value
})

const reasonError = computed(() => {
  if (!touched.value) return ''
  if (!preset.value) return 'Selecciona un motivo'
  if (preset.value === 'otro' && !notes.value.trim()) return 'Describe el motivo'
  return ''
})

const indefinite = computed(() => !until.value)
const minDate = computed<string | null>(() => toISODate(new Date()))

function submit() {
  touched.value = true
  if (reasonError.value || !reason.value.trim()) return
  emit('confirm', { reason: reason.value.trim(), until: until.value })
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Abrir acceso por excepción"
    subtitle="El espacio debería estar cerrado por mora"
    icon="fa-solid fa-unlock-keyhole"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="ag">
      <div class="ag__alert">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
        <p>
          <strong>Este espacio debería estar cerrado.</strong> Vas a abrirlo a propósito dejando la
          excepción registrada y visible en toda la app hasta que la cierres o venza.
        </p>
      </div>

      <div class="ag__target">
        <p class="ag__client">
          <i class="fa-solid fa-user" aria-hidden="true" /> {{ clientName || 'Cliente sin nombre' }}
        </p>
        <p v-if="workspaceName" class="ag__workspace">
          <i class="fa-solid fa-layer-group" aria-hidden="true" /> {{ workspaceName }}
        </p>
        <div class="ag__debt">
          <div class="ag__debt-item">
            <span class="ag__debt-label">Monto adeudado</span>
            <span class="ag__debt-value ag__debt-value--money">{{ formatMoney(overdueAmount) }}</span>
          </div>
          <div class="ag__debt-item">
            <span class="ag__debt-label">Días de mora</span>
            <span class="ag__debt-value">{{ maxDaysOverdue || 0 }}</span>
          </div>
        </div>
      </div>

      <BaseSelect
        v-model="preset"
        label="Motivo de la excepción"
        :options="PRESETS"
        placeholder="Selecciona un motivo"
        icon="fa-solid fa-circle-question"
        :error="reasonError"
        required
      />

      <BaseTextarea
        v-model="notes"
        label="Detalle del motivo"
        :rows="3"
        placeholder="Ej. Confirmó pago para el viernes por WhatsApp"
        :required="preset === 'otro'"
        hint="Queda registrado junto a quién autorizó la excepción."
      />

      <BaseDatePicker
        v-model="until"
        label="Vigente hasta"
        :min="minDate"
        placeholder="Sin fecha: excepción indefinida"
        hint="Al vencer, el cron cierra el acceso automáticamente."
      />

      <div v-if="indefinite" class="ag__callout">
        <i class="fa-solid fa-infinity" aria-hidden="true" />
        <p>
          Sin fecha de cierre la excepción es <strong>indefinida</strong>: nadie la cerrará por ti,
          hay que revocarla a mano desde esta pantalla.
        </p>
      </div>
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="emit('update:modelValue', false)">
        Cancelar
      </BaseButton>
      <BaseButton variant="danger" icon="fa-solid fa-unlock-keyhole" :loading="loading" @click="submit">
        Abrir acceso igualmente
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.ag {
  @include flex-col($sp-4);
}

.ag__alert {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-error-bg;
  border-left: 3px solid $alert-error;
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i {
    color: $alert-error;
    margin-top: 2px;
  }

  strong {
    color: $alert-error;
  }
}

.ag__target {
  @include flex-col($sp-2);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $surface-alt;
  border: 1px solid $border-color;
}

.ag__client {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;

  i {
    color: $secondary;
  }
}

.ag__workspace {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;

  i {
    color: $secondary;
  }
}

.ag__debt {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
  margin-top: $sp-1;
}

.ag__debt-item {
  @include flex-col(2px);
  flex: 1 1 auto;
  min-width: 130px;
  padding: $sp-2 $sp-3;
  border-radius: $radius-xs;
  background: $surface;
  border: 1px solid $border-color;
}

.ag__debt-label {
  @include label-text;
}

.ag__debt-value {
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;

  &--money {
    color: $alert-error;
  }
}

.ag__callout {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-warning-bg;
  border-left: 3px solid $alert-warning;
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;
  animation: scale-pop $transition-base $ease-spring both;

  i {
    color: $alert-warning;
    margin-top: 2px;
  }
}

@keyframes scale-pop {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
