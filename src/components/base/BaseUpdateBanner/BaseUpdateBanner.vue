<script setup lang="ts">
import { useAppVersion } from '@/composables/useAppVersion'

/**
 * Aviso de versión nueva. No bloquea: quien está a mitad de registrar un pago
 * no debería perder lo escrito por un despliegue, así que se recarga solo si la
 * persona lo pide.
 */
const { updateAvailable, reload } = useAppVersion({ autoStart: true })
</script>

<template>
  <Teleport to="body">
    <Transition name="update-slide">
      <div v-if="updateAvailable" class="upd" role="status" aria-live="polite">
        <span class="upd__icon" aria-hidden="true">
          <i class="fa-solid fa-arrows-rotate" />
        </span>

        <div class="upd__text">
          <p class="upd__title">Se actualizó la aplicación</p>
          <p class="upd__msg">
            Recarga para usar la versión nueva. Si estás a mitad de algo, termina primero.
          </p>
        </div>

        <button class="upd__action" type="button" @click="reload">
          <i class="fa-solid fa-rotate-right" aria-hidden="true" />
          Actualizar
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.upd {
  position: fixed;
  left: $sp-4;
  right: $sp-4;
  bottom: $sp-4;
  z-index: $z-update;
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  padding: $sp-3 $sp-4;
  border-radius: $radius-md;
  background: $primary-dark;
  box-shadow: $shadow-lg;
  padding-bottom: calc(#{$sp-3} + env(safe-area-inset-bottom, 0px));

  @include md {
    left: auto;
    right: $sp-5;
    bottom: $sp-5;
    max-width: 460px;
    flex-wrap: nowrap;
  }
}

.upd__icon {
  @include flex-center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: $radius-full;
  background: rgba($white, 0.14);
  color: $white;
}

.upd__text {
  @include flex-col(2px);
  flex: 1 1 180px;
  min-width: 0;
}

.upd__title {
  font-size: $fs-sm;
  font-weight: 800;
  color: $white;
}

.upd__msg {
  font-size: $fs-xs;
  line-height: 1.45;
  color: rgba($white, 0.75);
}

.upd__action {
  @include flex(row, center, center, $sp-2);
  flex: none;
  padding: $sp-2 $sp-4;
  border-radius: $radius-sm;
  background: $white;
  color: $primary-dark;
  font-size: $fs-xs;
  font-weight: 800;
  cursor: pointer;
  transition: transform $transition-fast, opacity $transition-fast;

  &:hover { transform: translateY(-1px); }
  &:active { transform: translateY(0); }
  &:focus-visible { @include focus-ring; }
}
</style>

<style lang="scss">
.update-slide-enter-active,
.update-slide-leave-active {
  transition: transform 0.3s $ease-out, opacity $transition-base;
}
.update-slide-enter-from,
.update-slide-leave-to {
  transform: translateY(20px);
  opacity: 0;
}
</style>
