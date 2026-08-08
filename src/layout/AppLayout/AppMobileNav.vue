<script setup lang="ts">
import { useNavItems } from './useNavItems'
import { useUiStore } from '@/stores/ui'

const { primaryItems } = useNavItems()
const ui = useUiStore()
</script>

<template>
  <nav class="bottomnav" aria-label="Navegación principal">
    <RouterLink
      v-for="item in primaryItems"
      :key="item.name"
      :to="item.path"
      class="bottomnav__item"
      active-class="is-active"
    >
      <i :class="item.icon" class="bottomnav__icon" />
      <span class="bottomnav__label">{{ item.title }}</span>
      <span class="bottomnav__dot" aria-hidden="true" />
    </RouterLink>

    <button
      type="button"
      class="bottomnav__item bottomnav__item--more"
      :class="{ 'is-active': ui.mobileDrawerOpen }"
      aria-label="Más opciones"
      @click="ui.toggleDrawer()"
    >
      <i class="fa-solid fa-ellipsis bottomnav__icon" />
      <span class="bottomnav__label">Más</span>
      <span class="bottomnav__dot" aria-hidden="true" />
    </button>
  </nav>
</template>

<style scoped lang="scss">
.bottomnav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: calc(#{$bottomnav-h} + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  @include flex(row, space-around, stretch);
  @include glass;
  border-top: 1px solid $border-color;
  box-shadow: 0 -6px 22px rgba($primary-dark, 0.08);
  z-index: $z-header;

  @include lg {
    display: none;
  }
}

.bottomnav__item {
  position: relative;
  flex: 1 1 0;
  @include flex(column, center, center, 2px);
  @include pressable;
  color: $text-secondary;
  font-size: $fs-xs;
  min-width: 0;
  padding: $sp-1;

  &.is-active {
    color: $primary;

    .bottomnav__icon {
      transform: translateY(-2px) scale(1.08);
    }

    .bottomnav__dot {
      opacity: 1;
      transform: translateX(-50%) scaleX(1);
    }
  }
}

.bottomnav__icon {
  font-size: 1.15rem;
  transition: transform $transition-base;
}

.bottomnav__label {
  @include truncate;
  max-width: 100%;
  font-weight: 600;
  font-size: 0.68rem;
}

.bottomnav__dot {
  position: absolute;
  top: 0;
  left: 50%;
  width: 28px;
  height: 3px;
  border-radius: $radius-full;
  background: $primary;
  opacity: 0;
  transform: translateX(-50%) scaleX(0.2);
  transition: opacity $transition-base, transform $transition-base;
}
</style>
