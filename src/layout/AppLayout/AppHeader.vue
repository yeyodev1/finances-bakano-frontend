<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useClickOutside } from '@/composables/useClickOutside'
import { useUserStore } from '@/stores/user'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const ui = useUiStore()
const settings = useSettingsStore()

const menuOpen = ref(false)
const menuRef = ref<HTMLElement | null>(null)

useClickOutside(menuRef, () => {
  menuOpen.value = false
})

const title = computed(() => (route.meta?.title as string) || ui.pageTitle)
const subtitle = computed(() => {
  const name = userStore.user?.name?.split(' ')[0]
  return name ? `Hola, ${name}` : 'Panel de control'
})

const roleLabel = computed(() => {
  const map: Record<string, string> = {
    superadmin: 'Superadmin',
    admin: 'Administrador',
    viewer: 'Solo lectura',
  }
  return map[userStore.user?.role ?? ''] ?? ''
})

async function goSettings() {
  menuOpen.value = false
  await router.push('/ajustes')
}

async function handleLogout() {
  menuOpen.value = false
  await userStore.logout()
}
</script>

<template>
  <header class="header">
    <button
      type="button"
      class="header__menu"
      aria-label="Abrir menú"
      @click="ui.openDrawer()"
    >
      <i class="fa-solid fa-bars" />
    </button>

    <img :src="settings.iconUrl" :alt="settings.appName" class="header__logo" />

    <div class="header__titles">
      <span class="header__subtitle">{{ subtitle }}</span>
      <h1 class="header__title">{{ title }}</h1>
    </div>

    <div ref="menuRef" class="header__account">
      <button
        type="button"
        class="header__avatar"
        :aria-expanded="menuOpen"
        aria-label="Cuenta"
        @click="menuOpen = !menuOpen"
      >
        <img v-if="userStore.user?.photoUrl" :src="userStore.user.photoUrl" alt="" />
        <span v-else>{{ userStore.initials }}</span>
      </button>

      <Transition name="scale-pop">
        <div v-if="menuOpen" class="header__dropdown">
          <div class="header__dropdown-head">
            <strong>{{ userStore.displayName }}</strong>
            <span>{{ userStore.user?.email }}</span>
            <em v-if="roleLabel">{{ roleLabel }}</em>
          </div>
          <button type="button" class="header__dropdown-item" @click="goSettings">
            <i class="fa-solid fa-gear" />
            <span>Ajustes</span>
          </button>
          <button
            type="button"
            class="header__dropdown-item header__dropdown-item--danger"
            @click="handleLogout"
          >
            <i class="fa-solid fa-arrow-right-from-bracket" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </Transition>
    </div>
  </header>
</template>

<style scoped lang="scss">
.header {
  position: sticky;
  top: 0;
  z-index: $z-header;
  @include flex(row, flex-start, center, $sp-3);
  @include glass;
  min-height: $header-h;
  padding: $sp-3 $sp-4;
  border-bottom: 1px solid $border-color;

  @include lg {
    padding-inline: $sp-6;
  }
}

.header__menu {
  @include flex-center;
  @include pressable;
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  border-radius: $radius-sm;
  background: $surface-alt;
  color: $primary-dark;

  @include lg {
    display: none;
  }
}

.header__logo {
  height: 28px;
  width: auto;
  margin-inline: auto;

  @include lg {
    display: none;
  }
}

.header__titles {
  display: none;
  min-width: 0;

  @include lg {
    @include flex-col(0);
    flex: 1 1 auto;
  }
}

.header__subtitle {
  @include label-text;
  font-size: 0.66rem;
}

.header__title {
  @include truncate;
  font-size: $fs-lg;
  font-weight: 800;
}

.header__account {
  position: relative;
  flex: 0 0 auto;
  margin-left: auto;
}

.header__avatar {
  @include flex-center;
  @include pressable;
  @include gradient-primary;
  width: 38px;
  height: 38px;
  border-radius: $radius-full;
  color: $white;
  font-weight: 800;
  font-size: $fs-sm;
  overflow: hidden;
  border: 2px solid rgba($white, 0.9);
  box-shadow: $shadow-sm;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.header__dropdown {
  position: absolute;
  top: calc(100% + #{$sp-2});
  right: 0;
  width: 240px;
  @include flex-col($sp-1);
  padding: $sp-2;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  box-shadow: $shadow-lg;
  transform-origin: top right;
  z-index: $z-dropdown;
}

.header__dropdown-head {
  @include flex-col(2px);
  padding: $sp-3;
  border-radius: $radius-sm;
  background: $surface-alt;
  margin-bottom: $sp-1;

  strong {
    @include truncate;
    font-size: $fs-base;
  }

  span {
    @include truncate;
    font-size: $fs-xs;
    color: $text-secondary;
  }

  em {
    margin-top: $sp-1;
    align-self: flex-start;
    font-style: normal;
    font-size: 0.66rem;
    font-weight: 700;
    padding: 2px $sp-2;
    border-radius: $radius-full;
    background: rgba($secondary, 0.14);
    color: $secondary-dark;
  }
}

.header__dropdown-item {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-3;
  border-radius: $radius-sm;
  font-size: $fs-sm;
  font-weight: 600;
  color: $primary-dark;
  transition: background $transition-fast, color $transition-fast;

  i {
    width: 18px;
    text-align: center;
    color: $text-secondary;
  }

  &:hover {
    background: rgba($primary, 0.07);
    color: $primary;

    i {
      color: $primary;
    }
  }

  &--danger:hover {
    background: $alert-error-bg;
    color: $alert-error;

    i {
      color: $alert-error;
    }
  }
}
</style>
