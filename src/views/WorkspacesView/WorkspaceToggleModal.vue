<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseModal, BaseTextarea } from '@/components/base'
import type { Workspace } from '@/types'

const props = defineProps<{ modelValue: boolean; workspace: Workspace | null; loading?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; confirm: [reason: string] }>()

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

const deactivating = computed(() => props.workspace?.isActive === true)
const title = computed(() => (deactivating.value ? 'Desactivar espacio' : 'Activar espacio'))
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
    <div class="wt">
      <div class="wt__alert" :class="deactivating ? 'wt__alert--danger' : 'wt__alert--info'">
        <i :class="deactivating ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-circle-info'" aria-hidden="true" />
        <p v-if="deactivating">
          <strong>Esto afecta el acceso real del cliente</strong> en la plataforma de métricas: dejará de
          poder entrar a su espacio hasta que lo vuelvas a activar.
        </p>
        <p v-else>
          El cliente recuperará el acceso a su espacio en la plataforma de métricas de forma inmediata.
        </p>
      </div>

      <p v-if="workspace" class="wt__name">
        <i class="fa-solid fa-layer-group" aria-hidden="true" /> {{ workspace.name }}
        <span v-if="workspace.client"> · {{ workspace.client.name }}</span>
      </p>

      <BaseTextarea
        v-model="reason"
        label="Motivo"
        :rows="3"
        :error="error"
        placeholder="Ej. Mora de más de 15 días / Pago regularizado"
        required
      />
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="emit('update:modelValue', false)">
        Cancelar
      </BaseButton>
      <BaseButton
        :variant="deactivating ? 'danger' : 'success'"
        :icon="deactivating ? 'fa-solid fa-toggle-off' : 'fa-solid fa-toggle-on'"
        :loading="loading"
        @click="submit"
      >
        {{ deactivating ? 'Desactivar' : 'Activar' }}
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.wt {
  @include flex-col($sp-4);
}

.wt__alert {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  font-size: $fs-xs;
  line-height: 1.5;

  &--danger {
    background: $alert-error-bg;
    color: darken($alert-error, 12);

    i {
      color: $alert-error;
      margin-top: 2px;
    }
  }

  &--info {
    background: rgba($alert-info, 0.1);
    color: darken($alert-info, 16);

    i {
      color: $alert-info;
      margin-top: 2px;
    }
  }
}

.wt__name {
  @include flex(row, flex-start, center, $sp-2);
  font-weight: 700;
  color: $primary-dark;
  font-size: $fs-sm;

  i {
    color: $secondary;
  }

  span {
    font-weight: 500;
    color: $text-secondary;
  }
}
</style>
