<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { BaseButton, BaseEmptyState, BaseModal, BaseWorkspaceAvatar } from '@/components/base'
import type { Workspace, WorkspaceImage } from '@/types'

const props = defineProps<{ modelValue: boolean; workspace: Workspace | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const failed = ref<Record<string, boolean>>({})
const currentIndex = ref(0)

const gallery = computed<WorkspaceImage[]>(() => {
  const ws = props.workspace
  if (!ws) return []
  const list: WorkspaceImage[] = []
  const seen = new Set<string>()

  const push = (url: string | null | undefined, name: string, categoria: string) => {
    if (!url || seen.has(url)) return
    seen.add(url)
    list.push({ url, name, categoria })
  }

  push(ws.imageUrl, ws.name, 'Principal')
  push(ws.logoUrl, 'Logo', 'Logo')
  push(ws.pictureUrl, 'Foto de página', 'Página')
  for (const image of ws.images ?? []) push(image.url, image.name || 'Imagen', image.categoria || 'Galería')

  return list
})

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    currentIndex.value = 0
    failed.value = {}
  },
)

const current = computed(() => gallery.value[currentIndex.value] ?? null)

function select(index: number) {
  currentIndex.value = index
}

function move(step: number) {
  if (!gallery.value.length) return
  currentIndex.value = (currentIndex.value + step + gallery.value.length) % gallery.value.length
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    :title="workspace?.name || 'Imágenes del espacio'"
    :subtitle="workspace?.pageName || workspace?.instagramAccountName || ''"
    icon="fa-solid fa-images"
    size="lg"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="wiv">
      <BaseEmptyState
        v-if="!gallery.length"
        icon="fa-solid fa-image-slash"
        title="Sin imágenes"
        message="Este espacio todavía no trae imágenes desde métricas."
      />

      <template v-else>
        <div class="wiv__stage">
          <button
            v-if="gallery.length > 1"
            type="button"
            class="wiv__nav wiv__nav--prev"
            aria-label="Imagen anterior"
            @click="move(-1)"
          >
            <i class="fa-solid fa-chevron-left" aria-hidden="true" />
          </button>

          <Transition name="fade" mode="out-in">
            <img
              v-if="current && !failed[current.url]"
              :key="current.url"
              class="wiv__img"
              :src="current.url"
              :alt="current.name"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="failed[current.url] = true"
            />
            <div v-else class="wiv__fallback">
              <BaseWorkspaceAvatar :name="workspace?.name || ''" size="xl" rounded="square" />
              <p>No se pudo cargar esta imagen.</p>
            </div>
          </Transition>

          <button
            v-if="gallery.length > 1"
            type="button"
            class="wiv__nav wiv__nav--next"
            aria-label="Imagen siguiente"
            @click="move(1)"
          >
            <i class="fa-solid fa-chevron-right" aria-hidden="true" />
          </button>
        </div>

        <p class="wiv__caption">
          <strong>{{ current?.name }}</strong>
          <span v-if="current?.categoria"> · {{ current.categoria }}</span>
          <span class="wiv__count">{{ currentIndex + 1 }} / {{ gallery.length }}</span>
        </p>

        <div v-if="gallery.length > 1" class="wiv__thumbs">
          <button
            v-for="(image, index) in gallery"
            :key="image.url"
            type="button"
            class="wiv__thumb"
            :class="{ 'wiv__thumb--active': index === currentIndex }"
            :title="image.name"
            @click="select(index)"
          >
            <img
              v-if="!failed[image.url]"
              :src="image.url"
              :alt="image.name"
              loading="lazy"
              referrerpolicy="no-referrer"
              @error="failed[image.url] = true"
            />
            <span v-else class="wiv__thumb-fallback"><i class="fa-solid fa-image" aria-hidden="true" /></span>
          </button>
        </div>
      </template>
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="emit('update:modelValue', false)">
        Cerrar
      </BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.wiv {
  @include flex-col($sp-3);
}

.wiv__stage {
  position: relative;
  @include flex-center;
  width: 100%;
  min-height: 220px;
  max-height: 52vh;
  padding: $sp-3;
  border-radius: $radius-md;
  background: $surface-alt;
  border: 1px solid $border-color;
  overflow: hidden;
}

.wiv__img {
  max-width: 100%;
  max-height: 46vh;
  object-fit: contain;
  border-radius: $radius-sm;
  display: block;
}

.wiv__fallback {
  @include flex-col($sp-3);
  align-items: center;
  font-size: $fs-xs;
  color: $text-secondary;
}

.wiv__nav {
  @include flex-center;
  @include pressable;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border-radius: $radius-full;
  border: 1px solid $border-color;
  background: rgba($surface, 0.9);
  color: $primary-dark;
  cursor: pointer;
  z-index: 1;
  transition: background $transition-base, color $transition-base;

  &:hover {
    background: $primary;
    color: $white;
  }

  &--prev { left: $sp-2; }
  &--next { right: $sp-2; }

  &:focus-visible {
    @include focus-ring;
  }
}

.wiv__caption {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;

  strong {
    color: $primary-dark;
  }
}

.wiv__count {
  margin-left: auto;
  font-weight: 700;
  color: $primary;
}

.wiv__thumbs {
  @include flex(row, flex-start, center, $sp-2);
  overflow-x: auto;
  padding-bottom: $sp-1;
  @include scrollbar(6px);
}

.wiv__thumb {
  @include flex-center;
  @include pressable;
  flex: none;
  width: 58px;
  height: 58px;
  padding: 0;
  overflow: hidden;
  border-radius: $radius-sm;
  border: 2px solid transparent;
  background: $surface-alt;
  cursor: pointer;
  transition: border-color $transition-base, transform $transition-base;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &:hover {
    transform: translateY(-2px);
  }

  &--active {
    border-color: $primary;
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.wiv__thumb-fallback {
  color: $text-secondary;
}
</style>
