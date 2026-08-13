<script setup lang="ts">
import { computed, ref } from 'vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import type { SortDirection, TableColumn, TableSort } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
interface Props {
  columns: TableColumn[]
  rows: any[]
  loading?: boolean
  emptyText?: string
  emptyIcon?: string
  rowKey?: string
  skeletonRows?: number
  hoverable?: boolean
  stickyHeader?: boolean
  /** Clase extra por fila, útil para atenuar registros archivados. */
  rowClass?: (row: any, index: number) => string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  emptyText: 'No hay datos para mostrar',
  emptyIcon: 'fa-solid fa-table-list',
  rowKey: 'id',
  skeletonRows: 5,
  hoverable: true,
  stickyHeader: true,
  rowClass: undefined,
})

const emit = defineEmits<{
  'row-click': [row: any]
  sort: [value: TableSort]
}>()

const { isMobile } = useBreakpoint()
const sort = ref<TableSort | null>(null)

const skeletons = computed(() => Array.from({ length: props.skeletonRows }, (_, i) => i))
const isEmpty = computed(() => !props.loading && props.rows.length === 0)
const mobileColumns = computed(() => props.columns.filter((c) => !c.hideOnMobile && c.key !== 'actions'))

function keyOf(row: any, index: number): string | number {
  const value = row?.[props.rowKey]
  return value ?? index
}

function cellValue(row: any, column: TableColumn): unknown {
  return row?.[column.key]
}

function toggleSort(column: TableColumn) {
  if (!column.sortable) return
  const dir: SortDirection =
    sort.value?.key === column.key && sort.value.dir === 'asc' ? 'desc' : 'asc'
  sort.value = { key: column.key, dir }
  emit('sort', sort.value)
}

function sortIcon(column: TableColumn) {
  if (sort.value?.key !== column.key) return 'fa-solid fa-sort'
  return sort.value.dir === 'asc' ? 'fa-solid fa-sort-up' : 'fa-solid fa-sort-down'
}
</script>

<template>
  <div class="tbl">
    <!-- ── Escritorio: tabla real ─────────────────────────────── -->
    <div v-if="!isMobile" class="tbl__scroll">
      <table class="tbl__table">
        <thead class="tbl__head" :class="{ 'tbl__head--sticky': props.stickyHeader }">
          <tr>
            <th
              v-for="col in props.columns"
              :key="col.key"
              class="tbl__th"
              :class="[`tbl__cell--${col.align ?? 'left'}`, { 'tbl__th--sortable': col.sortable }]"
              :style="col.width ? { width: col.width } : undefined"
              :aria-sort="sort?.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined"
              @click="toggleSort(col)"
            >
              <span class="tbl__th-inner">
                {{ col.label }}
                <i v-if="col.sortable" class="tbl__sort" :class="sortIcon(col)" aria-hidden="true" />
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          <template v-if="props.loading">
            <tr v-for="i in skeletons" :key="`sk-${i}`" class="tbl__row tbl__row--skeleton">
              <td v-for="col in props.columns" :key="col.key" class="tbl__td">
                <span class="tbl__bar" :style="{ width: `${55 + ((i * 13) % 40)}%` }" />
              </td>
            </tr>
          </template>

          <tr
            v-for="(row, index) in props.rows"
            v-else
            :key="keyOf(row, index)"
            class="tbl__row"
            :class="[{ 'tbl__row--hover': props.hoverable }, props.rowClass?.(row, index)]"
            :style="{ animationDelay: `${Math.min(index, 12) * 24}ms` }"
            @click="emit('row-click', row)"
          >
            <td
              v-for="col in props.columns"
              :key="col.key"
              class="tbl__td"
              :class="`tbl__cell--${col.align ?? 'left'}`"
            >
              <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)" :column="col" :index="index">
                <slot v-if="col.key === 'actions'" name="actions" :row="row" :index="index" />
                <template v-else>{{ cellValue(row, col) ?? '—' }}</template>
              </slot>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Móvil: cada fila es una tarjeta ────────────────────── -->
    <div v-else class="tbl__cards">
      <template v-if="props.loading">
        <div v-for="i in skeletons" :key="`skm-${i}`" class="tbl__card">
          <span class="tbl__bar" style="width: 60%" />
          <span class="tbl__bar" style="width: 85%" />
          <span class="tbl__bar" style="width: 45%" />
        </div>
      </template>

      <TransitionGroup v-else name="list" tag="div" class="tbl__cards-inner">
        <article
          v-for="(row, index) in props.rows"
          :key="keyOf(row, index)"
          class="tbl__card tbl__card--data"
          @click="emit('row-click', row)"
        >
          <div v-for="col in mobileColumns" :key="col.key" class="tbl__pair">
            <span class="tbl__pair-label">{{ col.label }}</span>
            <span class="tbl__pair-value">
              <slot :name="`cell-${col.key}`" :row="row" :value="cellValue(row, col)" :column="col" :index="index">
                {{ cellValue(row, col) ?? '—' }}
              </slot>
            </span>
          </div>

          <div v-if="$slots['cell-actions'] || $slots.actions" class="tbl__card-actions">
            <slot name="cell-actions" :row="row" :value="null" :column="props.columns[0]" :index="index">
              <slot name="actions" :row="row" :index="index" />
            </slot>
          </div>
        </article>
      </TransitionGroup>
    </div>

    <!-- ── Vacío ──────────────────────────────────────────────── -->
    <Transition name="fade">
      <div v-if="isEmpty" class="tbl__empty">
        <slot name="empty">
          <i :class="props.emptyIcon" aria-hidden="true" />
          <p>{{ props.emptyText }}</p>
        </slot>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.tbl {
  width: 100%;
  min-width: 0;
}

// ── Escritorio ───────────────────────────────────────────────────
.tbl__scroll {
  @include scrollbar(8px);
  width: 100%;
  overflow-x: auto;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  background: $surface;
  box-shadow: $shadow-xs;
}

.tbl__table {
  width: 100%;
  // Sin un ancho mínimo la tabla nunca desborda: reparte el hueco que haya y
  // aplasta las columnas hasta que los encabezados se tocan. Entre 768 y 1024
  // —sidebar ya oculto, pero aún en modo tabla— era ilegible. Con esto el
  // contenedor scrollea, que es para lo que tiene `overflow-x: auto`.
  min-width: $table-min-width;
  border-collapse: separate;
  border-spacing: 0;
  font-size: $fs-sm;
}

// Las celdas no parten las palabras: una columna estrecha no debe romper
// "Transferencia" en dos líneas, prefiere que la tabla scrollee.
.tbl__table th,
.tbl__table td {
  white-space: nowrap;
}

.tbl__head--sticky th {
  position: sticky;
  top: 0;
  z-index: 2;
}

.tbl__th {
  @include label-text;
  background: $primary-light;
  padding: $sp-3 $sp-4;
  border-bottom: 1px solid $border-color;
  white-space: nowrap;
  user-select: none;
  transition: background $transition-fast, color $transition-fast;

  &--sortable {
    cursor: pointer;
    &:hover { background: rgba($primary, 0.08); color: $primary; }
  }
}

.tbl__th-inner {
  @include flex(row, flex-start, center, $sp-2);
}

.tbl__cell--center .tbl__th-inner { justify-content: center; }
.tbl__cell--right .tbl__th-inner { justify-content: flex-end; }

.tbl__sort {
  font-size: 0.7em;
  opacity: 0.5;
  transition: opacity $transition-fast, transform $transition-fast;

  .tbl__th--sortable:hover & { opacity: 1; transform: scale(1.15); }
}

.tbl__row {
  animation: tbl-row-in $transition-slow $ease-out both;
  transition: background $transition-fast;

  &--hover:hover {
    background: rgba($primary, 0.045);
  }
}

@keyframes tbl-row-in {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

.tbl__td {
  padding: $sp-3 $sp-4;
  border-bottom: 1px solid rgba($primary-dark, 0.05);
  vertical-align: middle;
  color: $primary-dark;

  .tbl__row:last-child & { border-bottom: none; }
}

.tbl__cell--center { text-align: center; }
.tbl__cell--right { text-align: right; }

// ── Skeletons ────────────────────────────────────────────────────
.tbl__bar {
  display: block;
  height: 13px;
  border-radius: $radius-xs;
  background: linear-gradient(
    90deg,
    rgba($primary-dark, 0.06) 0%,
    rgba($primary-dark, 0.13) 40%,
    rgba($primary-dark, 0.06) 80%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s linear infinite;
}

// ── Móvil: tarjetas ──────────────────────────────────────────────
.tbl__cards { width: 100%; }

.tbl__cards-inner {
  @include flex-col($sp-3);
}

.tbl__card {
  @include card($sp-4);
  @include flex-col($sp-2);

  &--data {
    @include card-hover;
    cursor: pointer;
  }

  &:active { transform: scale(0.995); }
}

.tbl__pair {
  @include flex-between(center, $sp-3);
  gap: $sp-3;
  padding: 3px 0;
  border-bottom: 1px dashed rgba($primary-dark, 0.06);

  &:last-of-type { border-bottom: none; }
}

.tbl__pair-label {
  @include label-text;
  flex: none;
  font-size: 0.66rem;
}

.tbl__pair-value {
  flex: 1 1 auto;
  min-width: 0;
  text-align: right;
  font-size: $fs-sm;
  color: $primary-dark;
  overflow-wrap: anywhere;
}

.tbl__card-actions {
  @include flex(row, flex-end, center, $sp-2);
  flex-wrap: wrap;
  padding-top: $sp-2;
  margin-top: $sp-1;
  border-top: 1px solid $border-color;
}

// ── Vacío ────────────────────────────────────────────────────────
.tbl__empty {
  @include flex(column, center, center, $sp-3);
  padding: $sp-10 $sp-4;
  color: $text-secondary;
  text-align: center;
  font-size: $fs-sm;

  i { font-size: $fs-xl; opacity: 0.45; }
}
</style>
