<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  width?: string | number
  height?: string | number
  radius?: string
  count?: number
  circle?: boolean
  gap?: string
  inline?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  width: '100%',
  height: '14px',
  radius: '',
  count: 1,
  circle: false,
  gap: '0.5rem',
  inline: false,
})

const toCss = (v: string | number) => (typeof v === 'number' ? `${v}px` : v)

const blocks = computed(() => Array.from({ length: Math.max(1, props.count) }, (_, i) => i))

const style = computed(() => ({
  width: toCss(props.width),
  height: toCss(props.height),
  borderRadius: props.circle ? '999px' : props.radius || undefined,
  aspectRatio: props.circle ? '1 / 1' : undefined,
}))
</script>

<template>
  <div class="skeleton-wrap" :class="{ 'skeleton-wrap--inline': props.inline }" :style="{ gap: props.gap }" aria-hidden="true">
    <span
      v-for="i in blocks"
      :key="i"
      class="skeleton"
      :class="{ 'skeleton--last': props.count > 1 && i === blocks.length - 1 }"
      :style="style"
    />
  </div>
</template>

<style scoped lang="scss">
.skeleton-wrap {
  @include flex-col;
  width: 100%;

  &--inline {
    flex-direction: row;
    align-items: center;
    width: auto;
  }
}

.skeleton {
  display: block;
  flex: none;
  background: linear-gradient(
    90deg,
    rgba($primary-dark, 0.06) 0%,
    rgba($primary-dark, 0.12) 40%,
    rgba($primary-dark, 0.06) 80%
  );
  background-size: 800px 100%;
  border-radius: $radius-xs;
  animation: shimmer 1.4s linear infinite;
}

.skeleton--last {
  max-width: 68%;
}
</style>
