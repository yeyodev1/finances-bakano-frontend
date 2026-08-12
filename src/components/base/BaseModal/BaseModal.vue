<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { useBodyScrollLock } from '@/composables/useBodyScrollLock'
import { useModalStack } from '@/composables/useModalStack'

interface Props {
  modelValue: boolean
  title?: string
  subtitle?: string
  icon?: string
  size?: 'sm' | 'md' | 'lg' | 'full'
  persistent?: boolean
  hideClose?: boolean
  scrollable?: boolean
  /**
   * `top` lo eleva por encima de otros modales. Lo usa el diálogo de
   * confirmación, que casi siempre se abre desde dentro de otro modal.
   */
  layer?: 'default' | 'top'
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  icon: '',
  size: 'md',
  persistent: false,
  hideClose: false,
  scrollable: true,
  layer: 'default',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
  open: []
}>()

const uid = useId()
const panelRef = ref<HTMLElement | null>(null)
const { lock, unlock } = useBodyScrollLock()

// Solo el modal de encima responde a Escape; ver useModalStack.
const modalStack = useModalStack()
const isTopmost = () => modalStack.isTopmost(uid)

function close() {
  if (props.persistent) {
    pulse()
    return
  }
  emit('update:modelValue', false)
  emit('close')
}

/** Feedback visual cuando el modal es persistente y se intenta cerrar. */
const shaking = ref(false)
function pulse() {
  shaking.value = true
  setTimeout(() => { shaking.value = false }, 400)
}

function onKeydown(event: KeyboardEvent) {
  if (!isTopmost()) return
  if (event.key === 'Escape') {
    event.stopPropagation()
    close()
    return
  }
  if (event.key !== 'Tab') return
  // Focus trap
  const panel = panelRef.value
  if (!panel) return
  const focusables = panel.querySelectorAll<HTMLElement>(
    'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
  )
  if (!focusables.length) return
  const first = focusables[0]
  const last = focusables[focusables.length - 1]
  if (!first || !last) return
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      lock()
      modalStack.push(uid)
      document.addEventListener('keydown', onKeydown, true)
      emit('open')
      nextTick(() => {
        const panel = panelRef.value
        const target = panel?.querySelector<HTMLElement>('[autofocus]') ?? panel
        target?.focus()
      })
    } else {
      unlock()
      modalStack.remove(uid)
      document.removeEventListener('keydown', onKeydown, true)
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  modalStack.remove(uid)
  document.removeEventListener('keydown', onKeydown, true)
  unlock()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="props.modelValue"
        class="modal"
        :class="{ 'modal--top': props.layer === 'top' }"
        @click.self="close"
      >
        <Transition name="modal-panel" appear>
          <div
            ref="panelRef"
            class="modal__panel"
            :class="[`modal__panel--${props.size}`, { 'modal__panel--shake': shaking }]"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="props.title ? `${uid}-title` : undefined"
            tabindex="-1"
          >
            <header v-if="props.title || $slots.header || !props.hideClose" class="modal__header">
              <slot name="header">
                <div class="modal__heading">
                  <span v-if="props.icon" class="modal__icon"><i :class="props.icon" aria-hidden="true" /></span>
                  <div class="modal__titles">
                    <h2 :id="`${uid}-title`" class="modal__title">{{ props.title }}</h2>
                    <p v-if="props.subtitle" class="modal__subtitle">{{ props.subtitle }}</p>
                  </div>
                </div>
              </slot>

              <button
                v-if="!props.hideClose"
                class="modal__close"
                type="button"
                aria-label="Cerrar"
                @click="close"
              >
                <i class="fa-solid fa-xmark" aria-hidden="true" />
              </button>
            </header>

            <div class="modal__body" :class="{ 'modal__body--scroll': props.scrollable }">
              <slot />
            </div>

            <footer v-if="$slots.footer" class="modal__footer">
              <slot name="footer" />
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.modal {
  position: fixed;
  inset: 0;
  z-index: $z-modal;
  @include flex(column, flex-end, stretch);
  background: rgba($primary-dark, 0.55);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  padding: 0;

  @include md {
    @include flex(row, center, center);
    padding: $sp-6;
  }

  &--top { z-index: $z-confirm; }
}

.modal__panel {
  @include flex-col;
  position: relative;
  width: 100%;
  max-height: 92dvh;
  background: $surface;
  border-radius: $radius-lg $radius-lg 0 0;
  box-shadow: $shadow-lg;
  overflow: hidden;
  outline: none;
  padding-bottom: env(safe-area-inset-bottom, 0);

  @include md {
    border-radius: $radius-lg;
    max-height: 86dvh;
    padding-bottom: 0;
  }

  &--shake { animation: modal-shake 0.4s $ease-in-out; }
}

@keyframes modal-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-7px); }
  75% { transform: translateX(7px); }
}

// ── Tamaños (solo desde tablet; en móvil siempre ancho completo) ──
@include md {
  .modal__panel--sm { max-width: 420px; }
  .modal__panel--md { max-width: 620px; }
  .modal__panel--lg { max-width: 880px; }
  .modal__panel--full {
    max-width: none;
    width: 100%;
    height: 100%;
    max-height: none;
    border-radius: $radius-md;
  }
}

.modal__header {
  @include flex-between(flex-start, $sp-3);
  flex: none;
  padding: $sp-5 $sp-4 $sp-4;
  border-bottom: 1px solid $border-color;

  @include md { padding: $sp-5; }

  // Asa visual de la hoja en móvil
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
}

.modal__heading {
  @include flex(row, flex-start, center, $sp-3);
  min-width: 0;
}

.modal__icon {
  @include flex-center;
  width: 36px;
  height: 36px;
  flex: none;
  border-radius: $radius-sm;
  background: rgba($primary, 0.1);
  color: $primary;
}

.modal__titles { min-width: 0; }

.modal__title {
  font-size: $fs-md;
  font-weight: 700;
  @include truncate;

  @include md { font-size: $fs-lg; }
}

.modal__subtitle {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: 2px;
}

.modal__close {
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

.modal__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: $sp-4;

  @include md { padding: $sp-5; }

  &--scroll {
    @include scrollbar(6px);
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}

.modal__footer {
  @include flex(row, flex-end, center, $sp-2);
  flex-wrap: wrap;
  flex: none;
  padding: $sp-4;
  border-top: 1px solid $border-color;
  background: rgba($primary-light, 0.5);

  @include md { padding: $sp-4 $sp-5; }
}
</style>

<style lang="scss">
// Transición del panel: hoja inferior en móvil, scale-pop desde tablet
.modal-panel-enter-active,
.modal-panel-leave-active {
  transition: transform 0.32s $ease-out, opacity $transition-base;
}
.modal-panel-enter-from,
.modal-panel-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

@media (min-width: $bp-md) {
  .modal-panel-enter-active { transition: transform 0.32s $ease-spring, opacity $transition-base; }
  .modal-panel-enter-from,
  .modal-panel-leave-to {
    transform: scale(0.94) translateY(12px);
    opacity: 0;
  }
}
</style>
