<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import AppMobileNav from './AppMobileNav.vue'
import AppDrawer from './AppDrawer.vue'
import { useUiStore } from '@/stores/ui'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const ui = useUiStore()
const userStore = useUserStore()
const settings = useSettingsStore()

watch(
  () => route.meta?.title,
  (title) => {
    if (title) ui.setPageTitle(String(title))
  },
  { immediate: true },
)

onMounted(() => {
  void settings.load()
  if (!userStore.user) void userStore.bootstrap()
})
</script>

<template>
  <div class="layout">
    <AppSidebar />

    <div class="layout__main">
      <AppHeader />

      <main class="layout__content">
        <div class="layout__container">
          <RouterView v-slot="{ Component, route: child }">
            <Transition name="fade-slide" mode="out-in">
              <component :is="Component" :key="child.path" />
            </Transition>
          </RouterView>
        </div>
      </main>
    </div>

    <AppMobileNav />
    <AppDrawer />
  </div>
</template>

<style scoped lang="scss">
.layout {
  @include flex(row, flex-start, stretch);
  flex: 1 1 auto;
  min-height: 100dvh;
  background: $surface-alt;
}

.layout__main {
  @include flex-col(0);
  flex: 1 1 auto;
  min-width: 0;
}

.layout__content {
  flex: 1 1 auto;
  padding: $sp-4 $sp-4 calc(#{$bottomnav-h} + #{$sp-6} + env(safe-area-inset-bottom));
  @include scrollbar;

  @include md {
    padding-inline: $sp-6;
  }

  @include lg {
    padding: $sp-6 $sp-6 $sp-10;
  }
}

.layout__container {
  width: 100%;
  max-width: $container-max;
  margin-inline: auto;
}
</style>
