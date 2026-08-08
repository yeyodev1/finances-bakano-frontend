<script setup lang="ts">
import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNavItems } from './useNavItems'
import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'

const { items } = useNavItems()
const ui = useUiStore()
const userStore = useUserStore()
const settings = useSettingsStore()
const route = useRoute()

watch(
  () => route.fullPath,
  () => ui.closeDrawer(),
)

async function handleLogout() {
  ui.closeDrawer()
  await userStore.logout()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="ui.mobileDrawerOpen" class="drawer__overlay" @click="ui.closeDrawer()" />
    </Transition>

    <Transition name="slide-right">
      <aside v-if="ui.mobileDrawerOpen" class="drawer" role="dialog" aria-label="Menú">
        <header class="drawer__head">
          <img :src="settings.logoUrl" :alt="settings.appName" class="drawer__logo" />
          <button type="button" class="drawer__close" aria-label="Cerrar" @click="ui.closeDrawer()">
            <i class="fa-solid fa-xmark" />
          </button>
        </header>

        <div class="drawer__user">
          <span class="drawer__avatar">{{ userStore.initials }}</span>
          <div class="drawer__userinfo">
            <strong class="drawer__username">{{ userStore.displayName }}</strong>
            <span class="drawer__usermail">{{ userStore.user?.email }}</span>
          </div>
        </div>

        <nav class="drawer__nav">
          <RouterLink
            v-for="item in items"
            :key="item.name"
            :to="item.path"
            class="drawer__item"
            active-class="is-active"
          >
            <i :class="item.icon" class="drawer__icon" />
            <span>{{ item.title }}</span>
            <i class="fa-solid fa-chevron-right drawer__chevron" />
          </RouterLink>
        </nav>

        <button type="button" class="drawer__logout" @click="handleLogout">
          <i class="fa-solid fa-arrow-right-from-bracket" />
          <span>Cerrar sesión</span>
        </button>
      </aside>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.drawer__overlay {
  position: fixed;
  inset: 0;
  background: rgba($primary-dark, 0.45);
  backdrop-filter: blur(2px);
  z-index: $z-drawer;
}

.drawer {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: min(86vw, 320px);
  @include flex-col($sp-4);
  padding: $sp-5 $sp-4 $sp-6;
  background: $surface;
  box-shadow: $shadow-lg;
  overflow-y: auto;
  @include scrollbar(6px);
  z-index: calc(#{$z-drawer} + 1);
}

.drawer__head {
  @include flex-between;
}

.drawer__logo {
  max-height: 34px;
  width: auto;
}

.drawer__close {
  @include flex-center;
  @include pressable;
  width: 36px;
  height: 36px;
  border-radius: $radius-full;
  background: $surface-alt;
  color: $primary-dark;
}

.drawer__user {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-3;
  border-radius: $radius-md;
  background: $surface-alt;
}

.drawer__avatar {
  @include flex-center;
  @include gradient-primary;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: $radius-full;
  color: $white;
  font-weight: 800;
  font-size: $fs-sm;
}

.drawer__userinfo {
  @include flex-col(2px);
  min-width: 0;
}

.drawer__username {
  @include truncate;
  font-size: $fs-base;
}

.drawer__usermail {
  @include truncate;
  font-size: $fs-xs;
  color: $text-secondary;
}

.drawer__nav {
  @include flex-col($sp-1);
  flex: 1 1 auto;
}

.drawer__item {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-3;
  border-radius: $radius-sm;
  font-weight: 600;
  color: $primary-dark;
  transition: background $transition-fast, color $transition-fast;

  &.is-active {
    background: rgba($primary, 0.1);
    color: $primary;
  }

  &:active {
    background: rgba($primary, 0.14);
  }
}

.drawer__icon {
  width: 22px;
  text-align: center;
  color: inherit;
}

.drawer__chevron {
  margin-left: auto;
  font-size: $fs-xs;
  opacity: 0.4;
}

.drawer__logout {
  @include flex(row, center, center, $sp-2);
  @include pressable;
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid rgba($alert-error, 0.3);
  background: $alert-error-bg;
  color: $alert-error;
  font-weight: 700;
}
</style>
