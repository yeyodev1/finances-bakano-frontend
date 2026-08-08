<script setup lang="ts">
import { confirmState, resolveConfirm } from '@/composables/useConfirm'
import BaseConfirmDialog from './BaseConfirmDialog.vue'

/**
 * Monta el diálogo global una sola vez (en App.vue) para que
 * `const { confirm } = useConfirm()` funcione desde cualquier parte.
 */
</script>

<template>
  <BaseConfirmDialog
    :model-value="confirmState.open"
    :title="confirmState.title"
    :message="confirmState.message"
    :confirm-label="confirmState.confirmLabel"
    :cancel-label="confirmState.cancelLabel"
    :variant="confirmState.variant"
    :loading="confirmState.loading"
    :icon="confirmState.icon"
    @update:model-value="!$event && resolveConfirm(false)"
    @confirm="resolveConfirm(true)"
    @cancel="resolveConfirm(false)"
  />
</template>
