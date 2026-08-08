<script setup lang="ts">
defineProps<{ compact?: boolean }>()
</script>

<template>
  <div class="art" :class="{ 'art--compact': compact }" aria-hidden="true">
    <div class="art__glow art__glow--one" />
    <div class="art__glow art__glow--two" />

    <svg class="art__svg" viewBox="0 0 420 220" role="presentation">
      <defs>
        <linearGradient id="nf-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#e6285c" />
          <stop offset="100%" stop-color="#85529c" />
        </linearGradient>
        <linearGradient id="nf-paper" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" />
          <stop offset="100%" stop-color="#f5f3ef" />
        </linearGradient>
      </defs>

      <!-- factura extraviada -->
      <g class="art__paper">
        <rect x="150" y="34" width="120" height="152" rx="10" fill="url(#nf-paper)" stroke="#e5e0ea" />
        <rect x="168" y="58" width="84" height="8" rx="4" fill="#e6e2ec" />
        <rect x="168" y="78" width="60" height="8" rx="4" fill="#eeebf2" />
        <rect x="168" y="104" width="84" height="8" rx="4" fill="#eeebf2" />
        <rect x="168" y="124" width="46" height="8" rx="4" fill="#eeebf2" />
        <rect x="168" y="152" width="84" height="14" rx="7" fill="url(#nf-grad)" opacity="0.18" />
      </g>

      <!-- lupa buscando -->
      <g class="art__lens">
        <circle cx="272" cy="132" r="34" fill="none" stroke="url(#nf-grad)" stroke-width="7" />
        <circle cx="272" cy="132" r="34" fill="#e6285c" opacity="0.07" />
        <line
          x1="296"
          y1="156"
          x2="330"
          y2="190"
          stroke="url(#nf-grad)"
          stroke-width="9"
          stroke-linecap="round"
        />
      </g>

      <!-- monedas que se escapan -->
      <circle class="art__coin art__coin--1" cx="96" cy="70" r="13" fill="#3bb77e" opacity="0.85" />
      <circle class="art__coin art__coin--2" cx="70" cy="132" r="9" fill="#f59e0b" opacity="0.8" />
      <circle class="art__coin art__coin--3" cx="112" cy="168" r="7" fill="#85529c" opacity="0.75" />
      <circle class="art__coin art__coin--4" cx="348" cy="60" r="10" fill="#e6285c" opacity="0.6" />
    </svg>
  </div>
</template>

<style scoped lang="scss">
.art {
  position: relative;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  display: flex;
  justify-content: center;

  &--compact {
    max-width: 280px;
  }
}

.art__svg {
  position: relative;
  width: 100%;
  height: auto;
  z-index: 1;
}

.art__glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(46px);
  opacity: 0.4;
  animation: pulse-soft 6s $ease-in-out infinite;

  &--one {
    width: 190px;
    height: 190px;
    background: rgba($primary, 0.4);
    top: -20px;
    left: 4%;
  }

  &--two {
    width: 160px;
    height: 160px;
    background: rgba($secondary, 0.36);
    bottom: -26px;
    right: 6%;
    animation-delay: 1.4s;
  }
}

.art__paper {
  animation: nf-float 5s $ease-in-out infinite;
  transform-origin: center;
}

.art__lens {
  animation: nf-search 6s $ease-in-out infinite;
  transform-origin: 272px 132px;
}

.art__coin {
  animation: nf-drift 5.5s $ease-in-out infinite;

  &--2 { animation-delay: 0.6s; }
  &--3 { animation-delay: 1.2s; }
  &--4 { animation-delay: 1.8s; }
}

@keyframes nf-float {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-10px) rotate(1.5deg); }
}

@keyframes nf-search {
  0%, 100% { transform: translate(0, 0) scale(1); }
  35% { transform: translate(-52px, -30px) scale(1.04); }
  70% { transform: translate(-18px, 12px) scale(0.98); }
}

@keyframes nf-drift {
  0%, 100% { transform: translateY(0); opacity: 0.8; }
  50% { transform: translateY(-14px); opacity: 1; }
}
</style>
