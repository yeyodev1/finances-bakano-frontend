<script setup lang="ts">
import { onMounted } from 'vue'
import { BaseToast, BaseConfirmHost, BaseUpdateBanner } from '@/components/base'
import { useUserStore } from '@/stores/user'
import { useSettingsStore } from '@/stores/settings'
import { useSound } from '@/composables/useSound'

const userStore = useUserStore()
const settingsStore = useSettingsStore()

const sound = useSound()

onMounted(async () => {
  // Aplica la preferencia guardada; sin esto la librería arranca por defecto.
  sound.start()

  await userStore.bootstrap()
  if (userStore.isAuthenticated) void settingsStore.load()
})
</script>

<template>
  <div class="app-container">
    <RouterView v-slot="{ Component, route }">
      <Transition name="fade-slide" mode="out-in">
        <component :is="Component" :key="route.matched[0]?.path ?? route.path" />
      </Transition>
    </RouterView>

    <BaseToast />
    <BaseConfirmHost />
    <BaseUpdateBanner />
  </div>
</template>

<style lang="scss">
.app-container {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}
</style>
