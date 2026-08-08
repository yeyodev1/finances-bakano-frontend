<script setup lang="ts">
import { ref } from 'vue'
import { BaseTabs } from '@/components/base'
import NotificationsTab from './NotificationsTab.vue'
import BrandTab from './BrandTab.vue'

const tab = ref('notifications')

const tabs = [
  { value: 'notifications', label: 'Notificaciones', icon: 'fa-solid fa-bell' },
  { value: 'brand', label: 'Marca', icon: 'fa-solid fa-palette' },
]
</script>

<template>
  <div class="settings">
    <header class="settings__header">
      <h1><i class="fa-solid fa-gear" aria-hidden="true" /> Ajustes</h1>
      <p>Configura los correos automáticos y la identidad de la aplicación</p>
    </header>

    <BaseTabs v-model="tab" :tabs="tabs" />

    <Transition name="fade-slide" mode="out-in">
      <NotificationsTab v-if="tab === 'notifications'" key="notifications" />
      <BrandTab v-else key="brand" />
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.settings {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

.settings__header {
  h1 {
    @include flex(row, flex-start, center, $sp-3);
    font-size: $fs-xl;
    font-weight: 800;
    color: $primary-dark;

    i {
      color: $primary;
    }
  }

  p {
    font-size: $fs-xs;
    color: $text-secondary;
    margin-top: $sp-1;
  }
}
</style>
