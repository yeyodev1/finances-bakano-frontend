<script setup lang="ts">
import { toastItems, useToast } from '@/composables/useToast'
import BaseToastItem from './BaseToastItem.vue'

/**
 * Contenedor global de notificaciones. Se monta UNA sola vez (en App.vue).
 * Desktop: pila arriba-derecha. Móvil: arriba-centro a ancho completo.
 */
const { dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <TransitionGroup tag="ul" name="list" class="toasts" aria-live="polite" aria-atomic="false">
      <BaseToastItem
        v-for="toast in toastItems"
        :key="toast.id"
        :toast="toast"
        @dismiss="dismiss"
      />
    </TransitionGroup>
  </Teleport>
</template>

<style scoped lang="scss">
.toasts {
  position: fixed;
  top: calc(#{$sp-3} + env(safe-area-inset-top, 0px));
  left: $sp-3;
  right: $sp-3;
  z-index: $z-toast;
  @include flex-col($sp-2);
  align-items: stretch;
  pointer-events: none;
  margin: 0;
  padding: 0;

  @include md {
    left: auto;
    right: $sp-5;
    top: $sp-5;
    width: auto;
    align-items: flex-end;
  }
}
</style>
