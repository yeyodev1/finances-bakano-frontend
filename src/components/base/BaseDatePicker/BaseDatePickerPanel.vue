<script setup lang="ts">
import { computed, ref } from 'vue'
import { MONTHS_ES, MONTHS_ES_SHORT, WEEKDAYS_ES_MIN } from '@/composables/useFormat'
import type { FloatingPosition } from '@/composables/useFloatingPanel'

interface Props {
  /** Fecha seleccionada en formato YYYY-MM-DD. */
  selected: string | null
  /** Mes visible (0-11) y año visible. */
  month: number
  year: number
  min?: string | null
  max?: string | null
  mobile?: boolean
  position: FloatingPosition
  clearable?: boolean
  title?: string
}

const props = withDefaults(defineProps<Props>(), {
  min: null,
  max: null,
  mobile: false,
  clearable: false,
  title: 'Selecciona una fecha',
})

const emit = defineEmits<{
  pick: [iso: string]
  'update:month': [value: number]
  'update:year': [value: number]
  today: []
  clear: []
  close: []
}>()

type View = 'days' | 'months' | 'years'
const el = ref<HTMLElement | null>(null)
const view = ref<View>('days')
defineExpose({ el })
const slideDir = ref<'left' | 'right'>('left')

const pad = (n: number) => String(n).padStart(2, '0')
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`
const todayIso = (() => {
  const t = new Date()
  return iso(t.getFullYear(), t.getMonth(), t.getDate())
})()

interface Cell { key: string; day: number; iso: string; outside: boolean; disabled: boolean }

const cells = computed<Cell[]>(() => {
  const first = new Date(props.year, props.month, 1)
  // Lunes = 0
  const offset = (first.getDay() + 6) % 7
  const daysInMonth = new Date(props.year, props.month + 1, 0).getDate()
  const daysPrev = new Date(props.year, props.month, 0).getDate()
  const out: Cell[] = []

  for (let i = offset - 1; i >= 0; i -= 1) {
    const d = daysPrev - i
    const date = new Date(props.year, props.month - 1, d)
    out.push(makeCell(date, d, true))
  }
  for (let d = 1; d <= daysInMonth; d += 1) {
    out.push(makeCell(new Date(props.year, props.month, d), d, false))
  }
  let next = 1
  while (out.length % 7 !== 0 || out.length < 42) {
    const date = new Date(props.year, props.month + 1, next)
    out.push(makeCell(date, next, true))
    next += 1
    if (out.length >= 42) break
  }
  return out
})

function makeCell(date: Date, day: number, outside: boolean): Cell {
  const value = iso(date.getFullYear(), date.getMonth(), date.getDate())
  const disabled = (!!props.min && value < props.min) || (!!props.max && value > props.max)
  return { key: `${value}-${outside ? 'o' : 'i'}`, day, iso: value, outside, disabled }
}

const years = computed(() => {
  const base = props.year - 6
  return Array.from({ length: 12 }, (_, i) => base + i)
})

function shift(step: number) {
  slideDir.value = step > 0 ? 'left' : 'right'
  let m = props.month + step
  let y = props.year
  if (m < 0) { m = 11; y -= 1 }
  if (m > 11) { m = 0; y += 1 }
  emit('update:month', m)
  emit('update:year', y)
}

const panelStyle = computed(() => {
  if (props.mobile) return undefined
  const { top, left, placement } = props.position
  return {
    top: `${top}px`,
    left: `${left}px`,
    transform: placement === 'top' ? 'translateY(-100%)' : undefined,
  }
})
</script>

<template>
  <div ref="el" class="dpp" :class="{ 'dpp--sheet': props.mobile }" :style="panelStyle">
    <header class="dpp__head">
      <button class="dpp__nav" type="button" aria-label="Mes anterior" @click="shift(-1)">
        <i class="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>

      <div class="dpp__selectors">
        <button class="dpp__pick" type="button" @click="view = view === 'months' ? 'days' : 'months'">
          {{ MONTHS_ES[props.month] }}
        </button>
        <button class="dpp__pick" type="button" @click="view = view === 'years' ? 'days' : 'years'">
          {{ props.year }}
        </button>
      </div>

      <button class="dpp__nav" type="button" aria-label="Mes siguiente" @click="shift(1)">
        <i class="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>
    </header>

    <Transition :name="`cal-${slideDir}`" mode="out-in">
      <!-- Días -->
      <div v-if="view === 'days'" :key="`${props.year}-${props.month}`" class="dpp__body">
        <div class="dpp__weekdays">
          <span v-for="(w, i) in WEEKDAYS_ES_MIN" :key="i" class="dpp__weekday">{{ w }}</span>
        </div>
        <div class="dpp__grid" role="grid">
          <button
            v-for="cell in cells"
            :key="cell.key"
            class="dpp__day"
            :class="{
              'dpp__day--outside': cell.outside,
              'dpp__day--today': cell.iso === todayIso,
              'dpp__day--selected': cell.iso === props.selected,
            }"
            type="button"
            :disabled="cell.disabled"
            :aria-current="cell.iso === todayIso ? 'date' : undefined"
            :aria-selected="cell.iso === props.selected"
            @click="emit('pick', cell.iso)"
          >
            {{ cell.day }}
          </button>
        </div>
      </div>

      <!-- Meses -->
      <div v-else-if="view === 'months'" key="months" class="dpp__body dpp__body--quick">
        <button
          v-for="(m, i) in MONTHS_ES_SHORT"
          :key="m"
          class="dpp__quick"
          :class="{ 'dpp__quick--on': i === props.month }"
          type="button"
          @click="emit('update:month', i); view = 'days'"
        >{{ m }}</button>
      </div>

      <!-- Años -->
      <div v-else key="years" class="dpp__body dpp__body--quick">
        <button
          v-for="y in years"
          :key="y"
          class="dpp__quick"
          :class="{ 'dpp__quick--on': y === props.year }"
          type="button"
          @click="emit('update:year', y); view = 'days'"
        >{{ y }}</button>
      </div>
    </Transition>

    <footer class="dpp__foot">
      <button class="dpp__action" type="button" @click="emit('today')">
        <i class="fa-solid fa-calendar-day" aria-hidden="true" /> Hoy
      </button>
      <button v-if="props.clearable" class="dpp__action dpp__action--muted" type="button" @click="emit('clear')">
        <i class="fa-solid fa-eraser" aria-hidden="true" /> Limpiar
      </button>
      <button v-if="props.mobile" class="dpp__action dpp__action--primary" type="button" @click="emit('close')">
        Listo
      </button>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.dpp {
  position: fixed;
  z-index: $z-dropdown;
  @include flex-col;
  width: 320px;
  background: $surface;
  border: 1px solid $border-color;
  border-radius: $radius-md;
  box-shadow: $shadow-lg;
  padding: $sp-3;
  transform-origin: top center;

  &--sheet {
    inset: auto 0 0 0;
    width: 100%;
    border-radius: $radius-lg $radius-lg 0 0;
    padding: $sp-4 $sp-4 calc(#{$sp-4} + env(safe-area-inset-bottom, 0px));
  }
}

.dpp__head {
  @include flex-between($gap: $sp-2);
  margin-bottom: $sp-3;
}

.dpp__nav {
  @include flex-center;
  width: 32px;
  height: 32px;
  flex: none;
  border-radius: $radius-full;
  color: $primary-dark;
  transition: background $transition-fast, transform $transition-fast, color $transition-fast;

  &:hover { background: rgba($primary, 0.1); color: $primary; transform: scale(1.1); }
  &:active { transform: scale(0.92); }
}

.dpp__selectors { @include flex-center($sp-2); }

.dpp__pick {
  padding: $sp-1 $sp-3;
  border-radius: $radius-full;
  font-size: $fs-sm;
  font-weight: 700;
  color: $primary-dark;
  transition: background $transition-fast, color $transition-fast;

  &:hover { background: rgba($primary, 0.1); color: $primary; }
}

.dpp__weekdays,
.dpp__grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.dpp__weekday {
  @include flex-center;
  height: 26px;
  font-size: 0.66rem;
  font-weight: 700;
  color: $text-secondary;
  text-transform: uppercase;
}

.dpp__day {
  @include flex-center;
  aspect-ratio: 1 / 1;
  min-height: 36px;
  border-radius: $radius-sm;
  font-size: $fs-sm;
  font-weight: 600;
  color: $primary-dark;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast,
    box-shadow $transition-fast;

  &:hover:not(:disabled) { background: rgba($primary, 0.12); color: $primary; transform: scale(1.08); }
  &:active:not(:disabled) { transform: scale(0.94); }
  &:disabled { opacity: 0.25; cursor: not-allowed; }

  &--outside { color: rgba($primary-dark, 0.3); font-weight: 400; }

  &--today {
    box-shadow: inset 0 0 0 1.5px rgba($primary, 0.5);
    color: $primary;
  }

  &--selected {
    background: $primary;
    color: $white;
    box-shadow: $shadow-primary;

    &:hover { background: darken($primary, 5); color: $white; }
  }
}

.dpp__body--quick {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: $sp-2;
  padding: $sp-2 0;
}

.dpp__quick {
  padding: $sp-3 $sp-2;
  border-radius: $radius-sm;
  font-size: $fs-sm;
  font-weight: 600;
  color: $primary-dark;
  transition: background $transition-fast, color $transition-fast, transform $transition-fast;

  &:hover { background: rgba($primary, 0.1); color: $primary; transform: translateY(-1px); }
  &--on { background: $primary; color: $white; }
}

.dpp__foot {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  margin-top: $sp-3;
  padding-top: $sp-3;
  border-top: 1px solid $border-color;
}

.dpp__action {
  @include flex-center($sp-2);
  padding: $sp-2 $sp-3;
  border-radius: $radius-full;
  font-size: $fs-xs;
  font-weight: 700;
  color: $primary;
  background: rgba($primary, 0.09);
  transition: background $transition-fast, transform $transition-fast;

  &:hover { background: rgba($primary, 0.18); transform: translateY(-1px); }
  &--muted { color: $text-secondary; background: rgba($primary-dark, 0.06); }
  &--primary { margin-left: auto; background: $primary; color: $white; }
}
</style>

<style lang="scss">
.cal-left-enter-active,
.cal-left-leave-active,
.cal-right-enter-active,
.cal-right-leave-active {
  transition: opacity $transition-fast, transform $transition-base;
}
.cal-left-enter-from { opacity: 0; transform: translateX(18px); }
.cal-left-leave-to { opacity: 0; transform: translateX(-18px); }
.cal-right-enter-from { opacity: 0; transform: translateX(-18px); }
.cal-right-leave-to { opacity: 0; transform: translateX(18px); }
</style>
