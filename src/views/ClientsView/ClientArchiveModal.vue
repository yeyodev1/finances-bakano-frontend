<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BaseButton,
  BaseFileDropzone,
  BaseModal,
  BaseSelect,
  BaseTextarea,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { ARCHIVE_REASON_OPTIONS, daysSince, lifetimeLabel } from '@/config/archiveReasons'
import type { ArchiveReason, Client } from '@/types'

const props = defineProps<{ modelValue: boolean; client: Client | null }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  archived: [client: Client | null]
}>()

const store = useClientsStore()
const toast = useToast()
const { formatMoney, formatDate } = useFormat()

const reason = ref<ArchiveReason | null>(null)
const notes = ref('')
const files = ref<File[]>([])

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    reason.value = null
    notes.value = ''
    files.value = []
  },
)

const lifetimeDays = computed(() => {
  const c = props.client
  if (!c) return 0
  return Number(c.lifetimeDays ?? 0) || daysSince(c.startDate)
})

const lifetimeText = computed(() => lifetimeLabel(lifetimeDays.value))

const lifetimeRevenue = computed(() => Number(props.client?.lifetimeRevenue ?? 0))

const canSubmit = computed(() => !!reason.value && !store.saving)

const reasonModel = computed<string | number | null>({
  get: () => reason.value,
  set: (value) => {
    reason.value = (value as ArchiveReason) || null
  },
})

function close() {
  emit('update:modelValue', false)
}

function onRejected(message: string) {
  toast.warning('Archivo no admitido', message)
}

async function submit() {
  const client = props.client
  if (!client || !reason.value) return

  try {
    const result = await store.archive(client._id, {
      reason: reason.value,
      notes: notes.value,
      attachments: files.value,
    })

    toast.success(
      'Cliente dado de baja',
      `${client.name} se archivó con todo su historial intacto.`,
    )

    const payload = result as { client?: Client; workspaceStillActive?: boolean }
    if (payload?.workspaceStillActive) {
      toast.warning(
        'El espacio de trabajo sigue activo',
        'Desactívalo manualmente desde la pestaña Espacios para dejar de dar servicio.',
        9000,
      )
    }

    emit('archived', payload?.client ?? null)
    close()
  } catch (error) {
    toast.error('No se pudo dar de baja', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Dar de baja al cliente"
    icon="fa-solid fa-box-archive"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div v-if="client" class="archive">
      <section class="archive__notice">
        <i class="fa-solid fa-shield-halved" aria-hidden="true" />
        <div>
          <p class="archive__notice-title">El cliente NO se elimina</p>
          <p>
            Se conserva todo el historial de cobros, pagos y documentos. Solo se cancelan los
            cobros futuros y deja de aparecer en la lista de activos.
          </p>
        </div>
      </section>

      <section class="archive__summary">
        <header class="archive__summary-head">
          <span class="archive__client">{{ client.name }}</span>
          <span class="archive__since">Cliente desde {{ formatDate(client.startDate) }}</span>
        </header>

        <div class="archive__figures">
          <div class="figure">
            <span class="figure__label">Duración como cliente</span>
            <span class="figure__value">{{ lifetimeText }}</span>
          </div>
          <div class="figure">
            <span class="figure__label">Total cobrado histórico</span>
            <span class="figure__value figure__value--money">{{ formatMoney(lifetimeRevenue) }}</span>
          </div>
          <div class="figure">
            <span class="figure__label">Deja de facturarse</span>
            <span class="figure__value figure__value--loss">
              {{ formatMoney(client.amount) }} / mes
            </span>
          </div>
        </div>
      </section>

      <BaseSelect
        v-model="reasonModel"
        :options="ARCHIVE_REASON_OPTIONS"
        label="Motivo de la baja"
        placeholder="Selecciona el motivo"
        icon="fa-solid fa-circle-question"
        searchable
        required
      />

      <BaseTextarea
        v-model="notes"
        label="Notas (opcional)"
        :rows="3"
        placeholder="Contexto del acuerdo, conversaciones, condiciones de salida…"
      />

      <BaseFileDropzone
        v-model="files"
        label="Documentos de respaldo (opcional)"
        hint="Capturas, correos o contratos en JPG, PNG o PDF"
        :max-files="8"
        @rejected="onRejected"
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="close">Cancelar</BaseButton>
      <BaseButton
        variant="danger"
        icon="fa-solid fa-box-archive"
        :disabled="!canSubmit"
        :loading="store.saving"
        @click="submit"
      >
        Dar de baja
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.archive {
  @include flex-col($sp-4);
}

.archive__notice {
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

.archive__notice-title {
  font-weight: 800;
  color: $primary-dark;
  margin-bottom: 2px;
}

.archive__summary {
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid rgba($primary, 0.18);
  background: rgba($primary, 0.05);
}

.archive__summary-head {
  @include flex-col(2px);
}

.archive__client {
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;
}

.archive__since {
  font-size: $fs-xs;
  color: $text-secondary;
}

.archive__figures {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include md {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.figure {
  @include flex-col(2px);
  padding: $sp-2 $sp-3;
  border-radius: $radius-sm;
  background: $surface;
  border: 1px solid $border-color;
}

.figure__label {
  @include label-text;
}

.figure__value {
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;

  &--money {
    color: $alert-success;
  }

  &--loss {
    color: $alert-error;
  }
}
</style>
