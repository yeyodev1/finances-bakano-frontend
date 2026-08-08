<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { avatarInitials, avatarTint } from '@/composables/useAvatarIdentity'

interface Props {
  name?: string
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  square?: boolean
  status?: 'online' | 'offline' | 'busy' | null
  ring?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  name: '',
  src: null,
  size: 'md',
  square: false,
  status: null,
  ring: false,
})

const failed = ref(false)
watch(() => props.src, () => { failed.value = false })

const showImage = computed(() => Boolean(props.src) && !failed.value)

const initials = computed(() => avatarInitials(props.name))

/** Hash estable del nombre → tono HSL determinista dentro de la paleta de marca. */
const tint = computed(() => avatarTint(props.name))
</script>

<template>
  <span
    class="avatar"
    :class="[`avatar--${props.size}`, { 'avatar--square': props.square, 'avatar--ring': props.ring }]"
    :style="showImage ? undefined : tint"
    :title="props.name || undefined"
    role="img"
    :aria-label="props.name || 'Avatar'"
  >
    <img
      v-if="showImage"
      class="avatar__img"
      :src="props.src as string"
      :alt="props.name"
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="failed = true"
    />
    <span v-else class="avatar__initials">{{ initials }}</span>

    <span v-if="props.status" class="avatar__status" :class="`avatar__status--${props.status}`" aria-hidden="true" />
  </span>
</template>

<style scoped lang="scss">
.avatar {
  position: relative;
  @include flex-center;
  flex: none;
  border-radius: $radius-full;
  overflow: visible;
  color: $white;
  font-weight: 700;
  line-height: 1;
  user-select: none;
  background: $secondary;
  transition: transform $transition-base, box-shadow $transition-base;

  &:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: $shadow-sm;
  }

  &--square {
    border-radius: $radius-sm;
    .avatar__img { border-radius: $radius-sm; }
  }

  &--ring {
    box-shadow: 0 0 0 2px $surface, 0 0 0 4px rgba($primary, 0.35);
  }
}

.avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: $radius-full;
  display: block;
}

.avatar__initials {
  letter-spacing: 0.02em;
}

.avatar__status {
  position: absolute;
  right: -1px;
  bottom: -1px;
  width: 28%;
  height: 28%;
  min-width: 8px;
  min-height: 8px;
  border-radius: $radius-full;
  border: 2px solid $surface;

  &--online { background: $BAKANO-GREEN; }
  &--offline { background: $text-secondary; }
  &--busy { background: $alert-error; }
}

// ── Tamaños ──────────────────────────────────────────────────────
.avatar--xs { width: 26px; height: 26px; font-size: 0.6rem; }
.avatar--sm { width: 32px; height: 32px; font-size: 0.7rem; }
.avatar--md { width: 42px; height: 42px; font-size: $fs-sm; }
.avatar--lg { width: 56px; height: 56px; font-size: $fs-md; }
.avatar--xl { width: 80px; height: 80px; font-size: $fs-lg; }

@include md {
  .avatar--xl { width: 96px; height: 96px; font-size: $fs-xl; }
}
</style>
