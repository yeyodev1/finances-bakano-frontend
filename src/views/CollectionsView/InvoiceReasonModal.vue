<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseModal, BaseTextarea } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { Invoice } from '@/types'

const props = defineProps<{
  modelValue: boolean
  action: 'waive' | 'cancel'
  invoice: Invoice | null
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: [reason: string]
}>()

const { formatPeriod, formatMoney } = useFormat()

const reason = ref('')
const touched = ref(false)

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      reason.value = ''
      touched.value = false
    }
  },
)

const isWaive = computed(() => props.action === 'waive')
const title = computed(() => (isWaive.value ? 'Condonar cobro' : 'Anular cobro'))
const error = computed(() => (touched.value && !reason.value.trim() ? 'El motivo es obligatorio' : ''))

function submit() {
  touched.value = true
  if (!reason.value.trim()) return
  emit('confirm', reason.value.trim())
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="title"
    size="sm"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="reason">
      <div class="reason__alert" :class="isWaive ? 'reason__alert--warn' : 'reason__alert--danger'">
        <i :class="isWaive ? 'fa-solid fa-hand-holding-heart' : 'fa-solid fa-ban'" aria-hidden="true" />
        <p v-if="isWaive">
          El cobro dejará de contar como ingreso esperado y no generará recordatorios ni mora.
        </p>
        <p v-else>El cobro quedará anulado y desaparecerá del total esperado del período.</p>
      </div>

      <div v-if="invoice" class="reason__invoice">
        <span class="reason__client">{{ invoice.clientName }}</span>
        <span class="reason__meta">
          {{ formatPeriod(invoice.period) }} · {{ formatMoney(invoice.amount) }}
        </span>
      </div>

      <BaseTextarea
        v-model="reason"
        label="Motivo"
        :rows="3"
        :error="error"
        placeholder="Explica por qué se realiza esta acción"
        required
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="emit('update:modelValue', false)">
        Cancelar
      </BaseButton>
      <BaseButton
        :variant="isWaive ? 'primary' : 'danger'"
        :icon="isWaive ? 'fa-solid fa-hand-holding-heart' : 'fa-solid fa-ban'"
        :loading="loading"
        @click="submit"
      >
        {{ isWaive ? 'Condonar' : 'Anular' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.reason {
  @include flex-col($sp-4);
}

.reason__alert {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  font-size: $fs-xs;
  line-height: 1.5;

  &--warn {
    background: $alert-warning-bg;
    color: darken($alert-warning, 18);

    i {
      color: $alert-warning;
    }
  }

  &--danger {
    background: $alert-error-bg;
    color: darken($alert-error, 12);

    i {
      color: $alert-error;
    }
  }
}

.reason__invoice {
  @include flex-col(2px);
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: $surface-alt;
}

.reason__client {
  font-weight: 700;
  color: $primary-dark;
}

.reason__meta {
  font-size: $fs-xs;
  color: $text-secondary;
}
</style>
