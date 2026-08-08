<script setup lang="ts">
import type { ClientAttachment } from '@/types'

const props = withDefaults(
  defineProps<{ attachments?: ClientAttachment[]; compact?: boolean }>(),
  { attachments: () => [], compact: false },
)

function isImage(file: ClientAttachment): boolean {
  if (file.mimeType) return file.mimeType.startsWith('image/')
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(file.url || '')
}

function iconFor(file: ClientAttachment): string {
  if (file.mimeType === 'application/pdf' || /\.pdf$/i.test(file.url || '')) {
    return 'fa-solid fa-file-pdf'
  }
  return 'fa-solid fa-file-lines'
}

function humanSize(bytes?: number): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const list = () => props.attachments ?? []
</script>

<template>
  <TransitionGroup v-if="list().length" name="list" tag="ul" class="gallery" :class="{ 'gallery--compact': compact }">
    <li v-for="(file, index) in list()" :key="`${file.url}-${index}`" class="gallery__item">
      <a :href="file.url" target="_blank" rel="noopener noreferrer" class="gallery__link" :title="file.name">
        <img v-if="isImage(file)" :src="file.url" :alt="file.name" class="gallery__thumb" loading="lazy" />
        <span v-else class="gallery__icon"><i :class="iconFor(file)" aria-hidden="true" /></span>

        <span class="gallery__meta">
          <span class="gallery__name">{{ file.name }}</span>
          <span v-if="humanSize(file.size)" class="gallery__size">{{ humanSize(file.size) }}</span>
        </span>

        <i class="fa-solid fa-arrow-up-right-from-square gallery__open" aria-hidden="true" />
      </a>
    </li>
  </TransitionGroup>

  <p v-else class="gallery__empty">
    <i class="fa-solid fa-paperclip" aria-hidden="true" /> Sin documentos adjuntos
  </p>
</template>

<style scoped lang="scss">
.gallery {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-2;
  list-style: none;

  @include md {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  &--compact {
    @include md {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
}

.gallery__link {
  @include flex(row, flex-start, center, $sp-3);
  @include pressable;
  padding: $sp-2;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: $surface;
  text-decoration: none;
  transition: border-color $transition-base, background $transition-base;

  &:hover {
    border-color: rgba($primary, 0.45);
    background: rgba($primary, 0.05);
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.gallery__thumb {
  width: 46px;
  height: 46px;
  object-fit: cover;
  border-radius: $radius-xs;
  border: 1px solid $border-color;
  flex: none;
}

.gallery__icon {
  @include flex-center;
  width: 46px;
  height: 46px;
  border-radius: $radius-xs;
  background: $alert-error-bg;
  color: $alert-error;
  font-size: $fs-lg;
  flex: none;
}

.gallery__meta {
  @include flex-col(2px);
  min-width: 0;
  flex: 1;
}

.gallery__name {
  @include truncate;
  font-size: $fs-xs;
  font-weight: 600;
  color: $primary-dark;
}

.gallery__size {
  font-size: $fs-xs;
  color: $text-secondary;
}

.gallery__open {
  font-size: $fs-xs;
  color: $text-secondary;
  flex: none;
}

.gallery__empty {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;
}
</style>
