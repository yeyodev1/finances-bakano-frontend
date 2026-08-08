<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { avatarInitials, avatarTint } from '@/composables/useAvatarIdentity'

interface Props {
  src?: string | null
  name: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  rounded?: 'circle' | 'square'
  status?: 'active' | 'inactive' | 'override' | null
  alt?: string
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  size: 'md',
  rounded: 'circle',
  status: null,
  alt: '',
})

const failed = ref(false)
const loaded = ref(false)

watch(
  () => props.src,
  () => {
    failed.value = false
    loaded.value = false
  },
)

const showImage = computed(() => Boolean(props.src) && !failed.value)
const initials = computed(() => avatarInitials(props.name))
const tint = computed(() => avatarTint(props.name))

const statusTitle = computed(() => {
  if (props.status === 'active') return 'Espacio activo'
  if (props.status === 'inactive') return 'Espacio inactivo'
  if (props.status === 'override') return 'Acceso abierto por excepción'
  return undefined
})
</script>

<template>
  <span
    class="ws-avatar"
    :class="[
      `ws-avatar--${props.size}`,
      `ws-avatar--${props.rounded}`,
      { 'ws-avatar--override': props.status === 'override' },
    ]"
    :style="showImage && loaded ? undefined : tint"
    role="img"
    :aria-label="props.alt || props.name || 'Espacio de trabajo'"
    :title="props.name || undefined"
  >
    <img
      v-if="showImage"
      class="ws-avatar__img"
      :class="{ 'ws-avatar__img--in': loaded }"
      :src="props.src as string"
      :alt="props.alt || props.name"
      loading="lazy"
      decoding="async"
      referrerpolicy="no-referrer"
      @load="loaded = true"
      @error="failed = true"
    />
    <span v-if="!showImage || !loaded" class="ws-avatar__initials">{{ initials }}</span>

    <span
      v-if="props.status"
      class="ws-avatar__dot"
      :class="`ws-avatar__dot--${props.status}`"
      :title="statusTitle"
      aria-hidden="true"
    />
  </span>
</template>

<style scoped lang="scss">
.ws-avatar {
  position: relative;
  @include flex-center;
  flex: none;
  overflow: visible;
  color: $white;
  font-weight: 800;
  line-height: 1;
  user-select: none;
  background: $secondary;
  transition: transform $transition-base, box-shadow $transition-base;

  &--circle {
    border-radius: $radius-full;

    .ws-avatar__img {
      border-radius: $radius-full;
    }
  }

  &--square {
    border-radius: $radius-md;

    .ws-avatar__img {
      border-radius: $radius-md;
    }
  }

  &--override {
    box-shadow: 0 0 0 2px $surface, 0 0 0 4px rgba($alert-warning, 0.55);
  }
}

.ws-avatar__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0;
  transform: scale(1.04);
  transition: opacity $transition-slow $ease-out, transform $transition-slow $ease-out;

  &--in {
    opacity: 1;
    transform: scale(1);
  }
}

.ws-avatar__initials {
  letter-spacing: 0.02em;
  z-index: 1;
}

.ws-avatar__dot {
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 30%;
  height: 30%;
  min-width: 9px;
  min-height: 9px;
  border-radius: $radius-full;
  border: 2px solid $surface;
  z-index: 2;

  &--active {
    background: $alert-success;
  }

  &--inactive {
    background: $text-secondary;
  }

  &--override {
    background: $alert-warning;
    animation: ws-avatar-pulse 1.6s $ease-in-out infinite;
  }
}

@keyframes ws-avatar-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba($alert-warning, 0.7);
  }
  50% {
    box-shadow: 0 0 0 6px rgba($alert-warning, 0);
  }
}

.ws-avatar--xs { width: 26px; height: 26px; font-size: 0.6rem; }
.ws-avatar--sm { width: 34px; height: 34px; font-size: 0.72rem; }
.ws-avatar--md { width: 46px; height: 46px; font-size: $fs-sm; }
.ws-avatar--lg { width: 68px; height: 68px; font-size: $fs-md; }
.ws-avatar--xl { width: 96px; height: 96px; font-size: $fs-xl; }

@include md {
  .ws-avatar--xl { width: 112px; height: 112px; font-size: $fs-2xl; }
}
</style>
