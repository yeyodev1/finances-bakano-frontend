<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  page: number
  pages: number
  total?: number
  limit?: number
  disabled?: boolean
  /** Nombre de lo que se lista, para el resumen: "cobros", "clientes"… */
  itemLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  total: 0,
  limit: 0,
  disabled: false,
  itemLabel: 'resultados',
})

const emit = defineEmits<{ 'update:page': [page: number] }>()

/**
 * Ventana de páginas con elipsis. Se muestran siempre la primera y la última
 * más las vecinas de la actual: con muchas páginas, pintarlas todas rompe el
 * ancho en móvil y no ayuda a nadie.
 */
const items = computed<Array<number | 'gap'>>(() => {
  const { page, pages } = props
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)

  const out: Array<number | 'gap'> = [1]
  const from = Math.max(2, page - 1)
  const to = Math.min(pages - 1, page + 1)

  if (from > 2) out.push('gap')
  for (let i = from; i <= to; i += 1) out.push(i)
  if (to < pages - 1) out.push('gap')
  out.push(pages)
  return out
})

/** Rango real que se está viendo, para que el usuario sepa dónde está. */
const range = computed(() => {
  if (!props.total || !props.limit) return null
  const first = (props.page - 1) * props.limit + 1
  const last = Math.min(props.page * props.limit, props.total)
  return { first, last }
})

const canPrev = computed(() => props.page > 1 && !props.disabled)
const canNext = computed(() => props.page < props.pages && !props.disabled)

function go(page: number) {
  if (props.disabled || page === props.page || page < 1 || page > props.pages) return
  emit('update:page', page)
}
</script>

<template>
  <nav v-if="props.pages > 1" class="pag" role="navigation" aria-label="Paginación">
    <p v-if="range" class="pag__range">
      {{ range.first }}–{{ range.last }} de {{ props.total }} {{ props.itemLabel }}
    </p>

    <div class="pag__controls">
      <button
        class="pag__arrow"
        type="button"
        :disabled="!canPrev"
        aria-label="Página anterior"
        @click="go(props.page - 1)"
      >
        <i class="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>

      <ul class="pag__list">
        <li v-for="(item, i) in items" :key="`${item}-${i}`">
          <span v-if="item === 'gap'" class="pag__gap" aria-hidden="true">…</span>
          <button
            v-else
            class="pag__page"
            :class="{ 'pag__page--on': item === props.page }"
            type="button"
            :disabled="props.disabled"
            :aria-label="`Ir a la página ${item}`"
            :aria-current="item === props.page ? 'page' : undefined"
            @click="go(item as number)"
          >
            {{ item }}
          </button>
        </li>
      </ul>

      <button
        class="pag__arrow"
        type="button"
        :disabled="!canNext"
        aria-label="Página siguiente"
        @click="go(props.page + 1)"
      >
        <i class="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </div>
  </nav>
</template>

<style scoped lang="scss">
.pag {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
  padding-top: $sp-3;
}

.pag__range {
  font-size: $fs-xs;
  color: $text-secondary;
  flex: 1 1 160px;
}

.pag__controls {
  @include flex(row, flex-end, center, $sp-1);
  flex-wrap: wrap;
}

.pag__list {
  @include flex(row, flex-start, center, $sp-1);
  flex-wrap: wrap;
}

.pag__arrow,
.pag__page {
  @include flex-center;
  min-width: 34px;
  height: 34px;
  padding: 0 $sp-2;
  border-radius: $radius-xs;
  border: 1px solid $border-color;
  background: $surface;
  font-size: $fs-xs;
  font-weight: 600;
  color: $text-secondary;
  cursor: pointer;
  transition: background $transition-fast, border-color $transition-fast, color $transition-fast;

  &:hover:not(:disabled) { border-color: $primary; color: $primary; }
  &:focus-visible { @include focus-ring; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

// La página actual se marca con fondo Y con negrita: el color no va solo.
.pag__page--on {
  background: rgba($primary, 0.12);
  border-color: $primary;
  color: $primary;
  font-weight: 800;
}

.pag__gap {
  @include flex-center;
  min-width: 20px;
  height: 34px;
  color: $text-secondary;
}
</style>
