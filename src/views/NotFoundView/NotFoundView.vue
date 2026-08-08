<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores/settings'
import { useUserStore } from '@/stores/user'
import { BaseButton } from '@/components/base'
import NotFoundArt from './NotFoundArt.vue'

const route = useRoute()
const router = useRouter()
const settings = useSettingsStore()
const userStore = useUserStore()

const mounted = ref(false)
onMounted(() => {
  mounted.value = true
})

const attempted = computed(() => route.fullPath)
const isAuthenticated = computed(() => userStore.isAuthenticated)

const shortcuts = [
  { to: '/', icon: 'fa-solid fa-chart-pie', title: 'Resumen', text: 'KPIs y gráficos del mes' },
  {
    to: '/cobros',
    icon: 'fa-solid fa-file-invoice-dollar',
    title: 'Cobros del mes',
    text: 'Registrar pagos y aplazamientos',
  },
  { to: '/clientes', icon: 'fa-solid fa-users', title: 'Clientes', text: 'Fichas y espacios vinculados' },
  { to: '/espacios', icon: 'fa-solid fa-layer-group', title: 'Espacios', text: 'Estado de acceso de cada cliente' },
]

function goBack() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}
</script>

<template>
  <div class="notfound">
    <div class="notfound__aura" aria-hidden="true" />

    <div class="notfound__inner" :class="{ 'is-in': mounted }">
      <img :src="settings.logoUrl" :alt="settings.appName" class="notfound__brand" />

      <NotFoundArt class="notfound__art" />

      <p class="notfound__code">
        <span>4</span><span>0</span><span>4</span>
      </p>

      <h1 class="notfound__title">Esta página no está en los libros</h1>
      <p class="notfound__text">
        La dirección que abriste no existe o cambió de sitio. Tus cobros y clientes siguen
        justo donde los dejaste.
      </p>

      <code v-if="attempted !== '/'" class="notfound__path">{{ attempted }}</code>

      <div class="notfound__actions">
        <BaseButton variant="primary" icon="fa-solid fa-house" @click="router.push('/')">
          Ir al resumen
        </BaseButton>
        <BaseButton variant="ghost" icon="fa-solid fa-arrow-left" @click="goBack">
          Volver atrás
        </BaseButton>
      </div>

      <nav v-if="isAuthenticated" class="notfound__shortcuts">
        <RouterLink v-for="(s, i) in shortcuts" :key="s.to" :to="s.to" class="shortcut" :style="{ '--d': `${i * 70}ms` }">
          <span class="shortcut__icon"><i :class="s.icon" /></span>
          <span class="shortcut__body">
            <strong>{{ s.title }}</strong>
            <small>{{ s.text }}</small>
          </span>
          <i class="fa-solid fa-chevron-right shortcut__chevron" />
        </RouterLink>
      </nav>
    </div>
  </div>
</template>

<style scoped lang="scss">
.notfound {
  position: relative;
  flex: 1;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $sp-8 $sp-5 $sp-12;
  background: $primary-light;
  overflow: hidden;
}

.notfound__aura {
  position: absolute;
  inset: -30% -10% auto -10%;
  height: 60%;
  background: radial-gradient(circle at 50% 0%, rgba($primary, 0.16), transparent 65%);
  pointer-events: none;
}

.notfound__inner {
  position: relative;
  width: 100%;
  max-width: 620px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: $sp-4;
  opacity: 0;
  transform: translateY(16px);
  transition: opacity $transition-slow, transform $transition-slow;

  &.is-in {
    opacity: 1;
    transform: none;
  }
}

.notfound__brand {
  height: 26px;
  width: auto;
  opacity: 0.85;
}

.notfound__art {
  margin: $sp-2 0 -$sp-2;
}

.notfound__code {
  display: flex;
  gap: $sp-2;
  font-size: 3.4rem;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.03em;

  span {
    background: linear-gradient(135deg, $primary, $secondary);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: nf-bounce 2.4s $ease-spring infinite;

    &:nth-child(2) { animation-delay: 0.14s; }
    &:nth-child(3) { animation-delay: 0.28s; }
  }

  @include md {
    font-size: 4.6rem;
  }
}

.notfound__title {
  font-size: $fs-lg;
  color: $primary-dark;

  @include md {
    font-size: $fs-xl;
  }
}

.notfound__text {
  max-width: 44ch;
  color: $text-secondary;
  font-size: $fs-base;
}

.notfound__path {
  display: inline-block;
  max-width: 100%;
  padding: $sp-2 $sp-3;
  border-radius: $radius-full;
  background: rgba($primary-dark, 0.05);
  border: 1px solid $border-color;
  color: $muted;
  font-size: $fs-xs;
  @include truncate;
}

.notfound__actions {
  display: flex;
  flex-direction: column;
  gap: $sp-3;
  width: 100%;
  margin-top: $sp-2;

  @include sm {
    flex-direction: row;
    justify-content: center;
    width: auto;
  }
}

.notfound__shortcuts {
  display: flex;
  flex-direction: column;
  gap: $sp-2;
  width: 100%;
  margin-top: $sp-6;

  @include md {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }
}

.shortcut {
  display: flex;
  align-items: center;
  gap: $sp-3;
  padding: $sp-3 $sp-4;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  text-align: left;
  box-shadow: $shadow-xs;
  transition: transform $transition-base, box-shadow $transition-base, border-color $transition-base;
  animation: nf-rise 0.5s $ease-out backwards;
  animation-delay: var(--d);

  @include md {
    flex: 1 1 240px;
    max-width: 280px;
  }

  &:hover {
    transform: translateY(-3px);
    box-shadow: $shadow-md;
    border-color: rgba($primary, 0.3);

    .shortcut__chevron {
      transform: translateX(3px);
      color: $primary;
    }
  }
}

.shortcut__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 38px;
  height: 38px;
  border-radius: $radius-sm;
  background: rgba($primary, 0.1);
  color: $primary;
  font-size: $fs-base;
}

.shortcut__body {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;

  strong {
    font-size: $fs-base;
    color: $primary-dark;
    @include truncate;
  }

  small {
    font-size: $fs-xs;
    color: $text-secondary;
    @include truncate;
  }
}

.shortcut__chevron {
  color: rgba($primary-dark, 0.25);
  font-size: $fs-sm;
  transition: transform $transition-base, color $transition-base;
}

@keyframes nf-bounce {
  0%, 100% { transform: translateY(0); }
  30% { transform: translateY(-9px); }
}

@keyframes nf-rise {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: none; }
}
</style>
