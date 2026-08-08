<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()

const bullets = [
  {
    icon: 'fa-solid fa-bolt',
    title: 'Cobros automáticos',
    text: 'Genera las facturas del mes con un clic y olvídate de las hojas de cálculo.',
  },
  {
    icon: 'fa-solid fa-triangle-exclamation',
    title: 'Alertas de mora',
    text: 'Detecta al instante quién está vencido y cuántos días lleva sin pagar.',
  },
  {
    icon: 'fa-solid fa-chart-line',
    title: 'Todo de un vistazo',
    text: 'Facturado, cobrado y pendiente en gráficos claros mes a mes.',
  },
]
</script>

<template>
  <aside class="hero">
    <div class="hero__glow" aria-hidden="true" />

    <div class="hero__top">
      <img :src="settings.iconLightUrl" :alt="settings.appName" class="hero__icon" />
      <span class="hero__name">{{ settings.appName }}</span>
    </div>

    <div class="hero__body">
      <h2 class="hero__claim">Control total de tus cobros mensuales</h2>
      <p class="hero__lead">
        Clientes, facturas, pagos y espacios de trabajo en un solo panel.
      </p>

      <ul class="hero__list">
        <li v-for="(item, index) in bullets" :key="item.title" :style="{ '--i': index }">
          <span class="hero__bullet-icon"><i :class="item.icon" /></span>
          <span class="hero__bullet-text">
            <strong>{{ item.title }}</strong>
            <em>{{ item.text }}</em>
          </span>
        </li>
      </ul>
    </div>

    <p class="hero__foot">© {{ new Date().getFullYear() }} Bakano · Panel interno</p>
  </aside>
</template>

<style scoped lang="scss">
.hero {
  display: none;

  @include lg {
    position: relative;
    @include flex-col($sp-8);
    @include gradient-dark;
    justify-content: space-between;
    flex: 1 1 46%;
    max-width: 560px;
    padding: $sp-10 $sp-10 $sp-8;
    color: $text-light;
    overflow: hidden;
  }
}

.hero__glow {
  position: absolute;
  width: 460px;
  height: 460px;
  right: -160px;
  top: -140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba($primary, 0.45) 0%, transparent 68%);
  filter: blur(10px);
}

.hero__top,
.hero__body,
.hero__foot {
  position: relative;
  z-index: 1;
}

.hero__top {
  @include flex(row, flex-start, center, $sp-3);
}

.hero__icon {
  height: 40px;
  width: auto;
}

.hero__name {
  font-size: $fs-md;
  font-weight: 800;
  letter-spacing: -0.01em;
}

.hero__claim {
  font-size: $fs-2xl;
  line-height: 1.15;
  color: $white;
  margin-bottom: $sp-3;
  max-width: 12ch;
}

.hero__lead {
  font-size: $fs-base;
  color: rgba($white, 0.72);
  margin-bottom: $sp-8;
  max-width: 34ch;
}

.hero__list {
  @include flex-col($sp-5);
  margin: 0;
  padding: 0;

  li {
    @include flex(row, flex-start, flex-start, $sp-4);
    animation: hero-in 0.5s $ease-out backwards;
    animation-delay: calc(0.18s + var(--i) * 0.09s);
  }
}

.hero__bullet-icon {
  @include flex-center;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: $radius-sm;
  background: rgba($white, 0.1);
  border: 1px solid rgba($white, 0.14);
  color: $primary;
  font-size: $fs-base;
}

.hero__bullet-text {
  @include flex-col(2px);

  strong {
    font-size: $fs-base;
    color: $white;
  }

  em {
    font-style: normal;
    font-size: $fs-sm;
    color: rgba($white, 0.62);
    line-height: 1.45;
  }
}

.hero__foot {
  font-size: $fs-xs;
  color: rgba($white, 0.42);
}

@keyframes hero-in {
  from {
    opacity: 0;
    transform: translateX(-14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
