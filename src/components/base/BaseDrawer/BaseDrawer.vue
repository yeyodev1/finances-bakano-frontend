<script setup lang="ts">
import { onBeforeUnmount, useId, watch } from 'vue'
import { useBodyScrollLock } from '@/composables/useBodyScrollLock'

interface Props {
  modelValue: boolean
  title?: string
  subtitle?: string
  icon?: string
  side?: 'right' | 'left'
  width?: string
  persistent?: boolean
  hideClose?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  icon: '',
  side: 'right',
  width: '420px',
  persistent: false,
  hideClose: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

const uid = useId()
const { lock, unlock } = useBodyScrollLock()

function close() {
  if (props.persistent) return
  emit('update:modelValue', false)
  emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      lock()
      document.addEventListener('keydown', onKeydown, true)
    } else {
      unlock()
      document.removeEventListener('keydown', onKeydown, true)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown, true)
  unlock()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div v-if="props.modelValue" class="drawer" @click.self="close">
        <Transition :name="`drawer-${props.side}`" appear>
          <aside
            v-if="props.modelValue"
            class="drawer__panel"
            :class="`drawer__panel--${props.side}`"
            :style="{ '--drawer-w': props.width }"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="props.title ? `${uid}-title` : undefined"
          >
            <header v-if="props.title || $slots.header || !props.hideClose" class="drawer__header">
              <slot name="header">
                <div class="drawer__heading">
                  <span v-if="props.icon" class="drawer__icon"><i :class="props.icon" aria-hidden="true" /></span>
                  <div class="drawer__titles">
                    <h2 :id="`${uid}-title`" class="drawer__title">{{ props.title }}</h2>
                    <p v-if="props.subtitle" class="drawer__subtitle">{{ props.subtitle }}</p>
                  </div>
                </div>
              </slot>

              <button v-if="!props.hideClose" class="drawer__close" type="button" aria-label="Cerrar" @click="close">
                <i class="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>

            <div class="drawer__body"><slot /></div>

            <footer v-if="$slots.footer" class="drawer__footer"><slot name="footer" /></footer>
          </aside>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.drawer {
  position: fixed;
  inset: 0;
  z-index: $z-drawer;
  @include flex(column, flex-end, stretch);
  background: rgba($primary-dark, 0.5);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);

  @include md {
    flex-direction: row;
    justify-content: flex-end;
  }
}

.drawer__panel {
  @include flex-col;
  width: 100%;
  max-height: 90dvh;
  background: $surface;
  border-radius: $radius-lg $radius-lg 0 0;
  box-shadow: $shadow-lg;
  overflow: hidden;
  padding-bottom: env(safe-area-inset-bottom, 0);

  @include md {
    width: var(--drawer-w, 420px);
    max-width: 92vw;
    height: 100%;
    max-height: none;
    border-radius: 0;
    padding-bottom: 0;
  }

  &--left {
    @include md { margin-right: auto; }
  }
}

.drawer__header {
  position: relative;
  @include flex-between(flex-start, $sp-3);
  flex: none;
  padding: $sp-5 $sp-4 $sp-4;
  border-bottom: 1px solid $border-color;

  &::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    width: 44px;
    height: 4px;
    border-radius: $radius-full;
    background: rgba($primary-dark, 0.16);

    @include md { display: none; }
  }

  @include md { padding: $sp-5; }
}

.drawer__heading {
  @include flex(row, flex-start, center, $sp-3);
  min-width: 0;
}

.drawer__icon {
  @include flex-center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: $radius-sm;
  background: rgba($primary, 0.1);
  color: $primary;
}

.drawer__titles { min-width: 0; }

.drawer__title {
  font-size: $fs-md;
  font-weight: 700;
  @include truncate;
}

.drawer__subtitle {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: 2px;
}

.drawer__close {
  @include flex-center;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: $radius-full;
  color: $text-secondary;
  transition: background $transition-fast, color $transition-fast, transform $transition-base;

  &:hover { background: rgba($primary-dark, 0.07); color: $primary; transform: rotate(90deg); }
  &:focus-visible { @include focus-ring; }
}

.drawer__body {
  @include scrollbar(6px);
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: $sp-4;

  @include md { padding: $sp-5; }
}

.drawer__footer {
  @include flex(row, flex-end, center, $sp-2);
  flex-wrap: wrap;
  flex: none;
  padding: $sp-4;
  border-top: 1px solid $border-color;
  background: rgba($primary-light, 0.5);
}
</style>

<style lang="scss">
.drawer-right-enter-active,
.drawer-right-leave-active,
.drawer-left-enter-active,
.drawer-left-leave-active {
  transition: transform 0.34s $ease-out, opacity $transition-base;
}

// Móvil: siempre sube desde abajo
.drawer-right-enter-from,
.drawer-right-leave-to,
.drawer-left-enter-from,
.drawer-left-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@media (min-width: $bp-md) {
  .drawer-right-enter-from,
  .drawer-right-leave-to {
    transform: translateX(100%);
    opacity: 1;
  }
  .drawer-left-enter-from,
  .drawer-left-leave-to {
    transform: translateX(-100%);
    opacity: 1;
  }
}
</style>
