<script setup lang="ts">
import { computed } from 'vue'
import type { ConfirmVariant } from '@/composables/useConfirm'
import BaseModal from '../BaseModal/BaseModal.vue'
import BaseButton from '../BaseButton/BaseButton.vue'

interface Props {
  modelValue: boolean
  title?: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: ConfirmVariant
  loading?: boolean
  icon?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '¿Estás seguro?',
  message: 'Esta acción no se puede deshacer.',
  confirmLabel: 'Confirmar',
  cancelLabel: 'Cancelar',
  variant: 'danger',
  loading: false,
  icon: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const ICONS: Record<ConfirmVariant, string> = {
  danger: 'fa-solid fa-triangle-exclamation',
  warning: 'fa-solid fa-circle-exclamation',
  primary: 'fa-solid fa-circle-question',
}

const BUTTON_VARIANT: Record<ConfirmVariant, 'danger' | 'primary' | 'secondary'> = {
  danger: 'danger',
  warning: 'primary',
  primary: 'primary',
}

const resolvedIcon = computed(() => props.icon || ICONS[props.variant])

function cancel() {
  if (props.loading) return
  emit('update:modelValue', false)
  emit('cancel')
}

function accept() {
  if (props.loading) return
  emit('confirm')
}
</script>

<template>
  <BaseModal
    :model-value="props.modelValue"
    size="sm"
    hide-close
    :persistent="props.loading"
    :scrollable="false"
    @update:model-value="!$event && cancel()"
  >
    <div class="confirm" :class="`confirm--${props.variant}`">
      <span class="confirm__icon">
        <i :class="resolvedIcon" aria-hidden="true" />
      </span>

      <h3 class="confirm__title">{{ props.title }}</h3>
      <p class="confirm__message">{{ props.message }}</p>

      <slot />
    </div>

    <template #footer>
      <div class="confirm__actions">
        <BaseButton variant="ghost" :disabled="props.loading" block @click="cancel">
          {{ props.cancelLabel }}
        </BaseButton>
        <BaseButton
          :variant="BUTTON_VARIANT[props.variant]"
          :loading="props.loading"
          block
          autofocus
          @click="accept"
        >
          {{ props.confirmLabel }}
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.confirm {
  @include flex(column, center, center, $sp-3);
  text-align: center;
  padding: $sp-2 0 $sp-3;
}

.confirm__icon {
  @include flex-center;
  width: 68px;
  height: 68px;
  border-radius: $radius-full;
  font-size: 1.7rem;
  animation: confirm-pop 0.4s $ease-spring both;
}

@keyframes confirm-pop {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

.confirm__title {
  font-size: $fs-md;
  font-weight: 700;

  @include md { font-size: $fs-lg; }
}

.confirm__message {
  font-size: $fs-sm;
  color: $text-secondary;
  line-height: 1.55;
  max-width: 44ch;
}

.confirm__actions {
  @include flex-col($sp-2);
  width: 100%;

  @include md {
    flex-direction: row-reverse;
    justify-content: flex-start;
  }
}

// ── Variantes ────────────────────────────────────────────────────
.confirm--danger .confirm__icon {
  background: $alert-error-bg;
  color: $alert-error;
  box-shadow: 0 0 0 8px rgba($alert-error, 0.06);
}

.confirm--warning .confirm__icon {
  background: $alert-warning-bg;
  color: $alert-warning;
  box-shadow: 0 0 0 8px rgba($alert-warning, 0.06);
}

.confirm--primary .confirm__icon {
  background: rgba($primary, 0.1);
  color: $primary;
  box-shadow: 0 0 0 8px rgba($primary, 0.05);
}
</style>
