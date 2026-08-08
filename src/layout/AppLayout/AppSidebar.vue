<script setup lang="ts">
import { computed } from 'vue'
import { useNavItems } from './useNavItems'
import { useUiStore } from '@/stores/ui'
import { useSettingsStore } from '@/stores/settings'

const { items } = useNavItems()
const ui = useUiStore()
const settings = useSettingsStore()

const collapsed = computed(() => ui.sidebarCollapsed)
</script>

<template>
  <aside class="sidebar" :class="{ 'is-collapsed': collapsed }">
    <RouterLink to="/" class="sidebar__brand" :title="settings.appName">
      <img
        :src="collapsed ? settings.iconUrl : settings.logoUrl"
        :alt="settings.appName"
        class="sidebar__logo"
        :class="{ 'sidebar__logo--icon': collapsed }"
      />
    </RouterLink>

    <nav class="sidebar__nav">
      <RouterLink
        v-for="item in items"
        :key="item.name"
        :to="item.path"
        class="sidebar__item"
        :active-class="item.path === '/' ? 'is-root' : 'is-active'"
        exact-active-class="is-active"
        :title="collapsed ? item.title : undefined"
      >
        <span class="sidebar__indicator" aria-hidden="true" />
        <i :class="item.icon" class="sidebar__icon" />
        <Transition name="fade">
          <span v-if="!collapsed" class="sidebar__label">{{ item.title }}</span>
        </Transition>
        <span v-if="collapsed" class="sidebar__tooltip">{{ item.title }}</span>
      </RouterLink>
    </nav>

    <button
      type="button"
      class="sidebar__collapse"
      :aria-label="collapsed ? 'Expandir menú' : 'Colapsar menú'"
      @click="ui.toggleSidebar()"
    >
      <i :class="collapsed ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left'" />
      <span v-if="!collapsed">Colapsar</span>
    </button>
  </aside>
</template>

<style scoped lang="scss">
.sidebar {
  display: none;

  @include lg {
    @include flex-col($sp-2);
    position: sticky;
    top: 0;
    height: 100dvh;
    flex: 0 0 auto;
    width: $sidebar-w;
    padding: $sp-5 $sp-3 $sp-4;
    background: $surface;
    border-right: 1px solid $border-color;
    transition: width $transition-base;
    z-index: $z-header;
  }

  &.is-collapsed {
    width: $sidebar-w-collapsed;
    padding-inline: $sp-2;
  }
}

.sidebar__brand {
  @include flex-center;
  height: 46px;
  margin-bottom: $sp-5;
  padding-inline: $sp-2;
}

.sidebar__logo {
  max-height: 40px;
  width: auto;
  object-fit: contain;
  transition: all $transition-base;

  &--icon {
    max-height: 34px;
  }
}

.sidebar__nav {
  @include flex-col($sp-1);
  flex: 1 1 auto;
  overflow-y: auto;
  @include scrollbar(6px);
}

.sidebar__item {
  position: relative;
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-3 $sp-3;
  border-radius: $radius-sm;
  color: $muted;
  font-size: $fs-base;
  font-weight: 600;
  white-space: nowrap;
  transition: background $transition-fast, color $transition-fast;

  &:hover {
    background: rgba($primary, 0.06);
    color: $primary-dark;
  }

  &.is-active {
    background: rgba($primary, 0.1);
    color: $primary;

    .sidebar__indicator {
      transform: scaleY(1);
      opacity: 1;
    }

    .sidebar__icon {
      color: $primary;
    }
  }
}

.sidebar__indicator {
  position: absolute;
  left: 0;
  top: 50%;
  translate: 0 -50%;
  width: 3px;
  height: 60%;
  border-radius: $radius-full;
  background: $primary;
  transform: scaleY(0.2);
  opacity: 0;
  transition: transform $transition-base, opacity $transition-base;
}

.sidebar__icon {
  width: 20px;
  text-align: center;
  font-size: $fs-md;
  flex: 0 0 auto;
}

.sidebar__label {
  @include truncate;
}

.sidebar__tooltip {
  position: absolute;
  left: calc(100% + #{$sp-2});
  top: 50%;
  translate: 0 -50%;
  padding: $sp-1 $sp-3;
  background: $primary-dark;
  color: $text-light;
  font-size: $fs-xs;
  border-radius: $radius-xs;
  box-shadow: $shadow-md;
  opacity: 0;
  pointer-events: none;
  transition: opacity $transition-fast;
  z-index: $z-dropdown;
}

.sidebar__item:hover .sidebar__tooltip {
  opacity: 1;
}

.sidebar__collapse {
  @include flex(row, center, center, $sp-2);
  @include pressable;
  margin-top: $sp-3;
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px dashed $border-color;
  color: $text-secondary;
  font-size: $fs-sm;
  font-weight: 600;

  &:hover {
    color: $primary;
    border-color: rgba($primary, 0.4);
    background: rgba($primary, 0.05);
  }

  &:focus-visible {
    @include focus-ring;
  }
}
</style>
