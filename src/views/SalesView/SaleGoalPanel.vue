<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  BaseBadge,
  BaseButton,
  BaseCurrencyInput,
  BaseInput,
  BaseModal,
  BaseMonthPicker,
  BaseSkeleton,
  BaseTextarea,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import ClientTypeField from './ClientTypeField.vue'
import { useSalesStore } from '@/stores/sales'
import { useUserStore } from '@/stores/user'
import type { SaleGoalSaleRow } from '@/types'

const store = useSalesStore()
const clients = useClientsStore()
const user = useUserStore()
const toast = useToast()
const { formatMoney, formatPeriod, formatDateShort } = useFormat()

const canEdit = computed(() => user.role === 'admin' || user.role === 'superadmin')
const goal = computed(() => store.goal)

const periodModel = computed<string>({
  get: () => store.goalPeriod,
  set: (value) => {
    if (value && value !== store.goalPeriod) void load(value)
  },
})

async function load(period?: string) {
  try {
    await store.fetchGoal(period)
  } catch (error) {
    toast.error('No se pudo cargar el objetivo', apiErrorMessage(error))
  }
}

function pctWidth(pct: number): string {
  return `${Math.min(pct, 100)}%`
}

function toneOf(pct: number): string {
  if (pct >= 100) return 'ok'
  if (pct >= 50) return 'mid'
  return 'low'
}

// ── Ubicar ventas sin clasificar ──
const placing = ref<string | null>(null)

async function place(sale: SaleGoalSaleRow, categoryId: string | null) {
  if (!categoryId) return
  placing.value = sale._id
  try {
    const updated = await store.changeCategory(sale._id, String(categoryId))
    const inGoal = goal.value?.lines.some((l) => l.categoryId === updated.categoryId)
    toast.success(
      `${updated.businessName} → ${updated.categoryName}`,
      inGoal ? 'Ya suma al objetivo del mes' : 'Ese tipo no está en el objetivo: se ve aparte',
    )
  } catch (error) {
    toast.error('No se pudo ubicar la venta', apiErrorMessage(error))
  } finally {
    placing.value = null
  }
}

// ── Editor del objetivo ──
interface DraftLine {
  categoryId: string
  targetCount: number
  targetAmount: number
  notes: string
}

const editorOpen = ref(false)
const draft = ref<DraftLine[]>([])
const draftNotes = ref('')

function openEditor(prefillCategoryId?: string) {
  draft.value = (goal.value?.lines ?? []).map((l) => ({
    categoryId: l.categoryId,
    targetCount: l.targetCount,
    targetAmount: l.targetAmount,
    notes: l.notes ?? '',
  }))
  if (prefillCategoryId && !draft.value.some((l) => l.categoryId === prefillCategoryId)) {
    draft.value.push({ categoryId: prefillCategoryId, targetCount: 1, targetAmount: 0, notes: '' })
  }
  if (!draft.value.length) addLine()
  draftNotes.value = goal.value?.notes ?? ''
  editorOpen.value = true
}

function addLine() {
  draft.value.push({ categoryId: '', targetCount: 1, targetAmount: 0, notes: '' })
}

/** Ids usados en las demás líneas: un tipo solo puede estar una vez. */
function usedExcept(index: number): string[] {
  return draft.value.filter((l, i) => i !== index && l.categoryId).map((l) => l.categoryId)
}

function nameOf(id: string): string {
  return clients.categories.find((c) => c._id === id)?.name ?? ''
}

function removeLine(index: number) {
  draft.value.splice(index, 1)
}

const goalCategoryIds = computed(() => (goal.value?.lines ?? []).map((l) => l.categoryId))

const draftValid = computed(
  () =>
    draft.value.length > 0 &&
    draft.value.every(
      (l) => l.categoryId && (Number(l.targetCount) > 0 || Number(l.targetAmount) > 0),
    ),
)

const draftTotals = computed(() => ({
  count: draft.value.reduce((acc, l) => acc + (Number(l.targetCount) || 0), 0),
  amount: draft.value.reduce((acc, l) => acc + (Number(l.targetAmount) || 0), 0),
}))

async function saveGoal() {
  if (!draftValid.value) {
    toast.warning('Revisa el objetivo', 'Cada línea necesita un tipo y cuántos o cuánto.')
    return
  }
  try {
    await store.saveGoal(
      draft.value.map((l) => ({
        categoryId: l.categoryId,
        targetCount: Number(l.targetCount) || 0,
        targetAmount: Number(l.targetAmount) || 0,
        notes: l.notes.trim() || undefined,
      })),
      draftNotes.value.trim() || undefined,
    )
    toast.success('Objetivo guardado', formatPeriod(store.goalPeriod))
    editorOpen.value = false
  } catch (error) {
    toast.error('No se pudo guardar el objetivo', apiErrorMessage(error))
  }
}
</script>

<template>
  <section class="goal" aria-labelledby="goal-title">
    <header class="goal__head">
      <div class="goal__title-wrap">
        <h2 id="goal-title" class="goal__title">
          <i class="fa-solid fa-bullseye" aria-hidden="true" /> Objetivo del mes
        </h2>
        <p class="goal__sub">Qué tipo de cliente buscamos, cuántos y cuánto va vendido</p>
      </div>
      <div class="goal__controls">
        <BaseMonthPicker v-model="periodModel" size="sm" />
        <BaseButton
          v-if="canEdit"
          size="sm"
          :variant="goal?.hasGoal ? 'ghost' : 'primary'"
          :icon="goal?.hasGoal ? 'fa-solid fa-pen' : 'fa-solid fa-plus'"
          @click="openEditor()"
        >
          {{ goal?.hasGoal ? 'Editar objetivo' : 'Definir objetivo' }}
        </BaseButton>
      </div>
    </header>

    <div v-if="store.goalLoading && !goal" class="goal__skeleton">
      <BaseSkeleton height="56px" />
      <BaseSkeleton height="120px" />
    </div>

    <template v-else-if="goal">
      <!-- Totales -->
      <div v-if="goal.hasGoal" class="totals">
        <div class="totals__bar" :class="`totals__bar--${toneOf(goal.totals.amountPct)}`">
          <div class="totals__row">
            <span class="totals__label">
              <i class="fa-solid fa-sack-dollar" aria-hidden="true" /> Monto
            </span>
            <strong>{{ formatMoney(goal.totals.inGoalAmount) }}</strong>
            <span class="totals__of">de {{ formatMoney(goal.totals.targetAmount) }}</span>
            <span class="totals__pct">{{ goal.totals.amountPct }}%</span>
          </div>
          <div class="bar" role="progressbar" :aria-valuenow="goal.totals.amountPct" aria-valuemin="0" aria-valuemax="100">
            <span class="bar__fill" :style="{ width: pctWidth(goal.totals.amountPct) }" />
          </div>
        </div>
        <div class="totals__bar" :class="`totals__bar--${toneOf(goal.totals.countPct)}`">
          <div class="totals__row">
            <span class="totals__label">
              <i class="fa-solid fa-users" aria-hidden="true" /> Clientes
            </span>
            <strong>{{ goal.totals.inGoalCount }}</strong>
            <span class="totals__of">de {{ goal.totals.targetCount }}</span>
            <span class="totals__pct">{{ goal.totals.countPct }}%</span>
          </div>
          <div class="bar" role="progressbar" :aria-valuenow="goal.totals.countPct" aria-valuemin="0" aria-valuemax="100">
            <span class="bar__fill" :style="{ width: pctWidth(goal.totals.countPct) }" />
          </div>
        </div>
      </div>

      <p v-else class="goal__empty">
        <i class="fa-solid fa-circle-info" aria-hidden="true" />
        {{ formatPeriod(goal.period) }} todavía no tiene objetivo.
        <template v-if="canEdit">Defínelo con el tipo de cliente que hay que buscar, cuántos y por cuánto.</template>
        <template v-else>Pídele a un administrador que lo cargue.</template>
        <span v-if="goal.totals.soldCount">
          · Ya van <strong>{{ goal.totals.soldCount }}</strong> venta(s) por
          <strong>{{ formatMoney(goal.totals.soldAmount) }}</strong>.
        </span>
      </p>

      <!-- Líneas por tipo de cliente -->
      <ul v-if="goal.lines.length" class="lines">
        <li v-for="line in goal.lines" :key="line.categoryId" class="line">
          <div class="line__head">
            <span class="line__name">
              <i :class="line.icon || 'fa-solid fa-tag'" :style="line.color ? { color: line.color } : undefined" aria-hidden="true" />
              {{ line.categoryName }}
            </span>
            <BaseBadge
              :variant="line.countPct >= 100 && line.amountPct >= 100 ? 'success' : line.soldCount ? 'warning' : 'neutral'"
              :icon="line.countPct >= 100 && line.amountPct >= 100 ? 'fa-solid fa-circle-check' : 'fa-solid fa-hourglass-half'"
              size="sm"
            >
              {{ line.countPct >= 100 && line.amountPct >= 100 ? 'Cumplido' : line.soldCount ? 'En curso' : 'Sin ventas' }}
            </BaseBadge>
          </div>

          <div class="line__metric">
            <span class="line__figure"><strong>{{ line.soldCount }}</strong> / {{ line.targetCount }} clientes</span>
            <div class="bar bar--sm" :class="`bar--${toneOf(line.countPct)}`">
              <span class="bar__fill" :style="{ width: pctWidth(line.countPct) }" />
            </div>
          </div>
          <div class="line__metric">
            <span class="line__figure"><strong>{{ formatMoney(line.soldAmount) }}</strong> / {{ formatMoney(line.targetAmount) }}</span>
            <div class="bar bar--sm" :class="`bar--${toneOf(line.amountPct)}`">
              <span class="bar__fill" :style="{ width: pctWidth(line.amountPct) }" />
            </div>
          </div>

          <p class="line__remaining">
            <template v-if="line.remainingCount > 0 || line.remainingAmount > 0">
              <i class="fa-solid fa-flag" aria-hidden="true" />
              Faltan
              <template v-if="line.remainingCount > 0">{{ line.remainingCount }} cliente(s)</template>
              <template v-if="line.remainingCount > 0 && line.remainingAmount > 0"> · </template>
              <template v-if="line.remainingAmount > 0">{{ formatMoney(line.remainingAmount) }}</template>
            </template>
            <template v-else>
              <i class="fa-solid fa-trophy" aria-hidden="true" /> Meta alcanzada
            </template>
          </p>
          <p v-if="line.notes" class="line__notes">{{ line.notes }}</p>

          <ul v-if="line.sales.length" class="line__sales">
            <li v-for="sale in line.sales" :key="sale._id">
              <span class="line__sale-name">{{ sale.businessName }}</span>
              <span class="line__sale-amount">{{ formatMoney(sale.amount) }}</span>
            </li>
          </ul>
        </li>
      </ul>

      <!-- Vendido con un tipo que no está en el objetivo -->
      <div v-if="goal.outside.length" class="outside">
        <h3 class="goal__h3">
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
          Vendido fuera del objetivo
        </h3>
        <p class="goal__muted">
          Estas ventas tienen tipo, pero ese tipo no está en la meta del mes. Suman al total vendido,
          no a ninguna línea.
        </p>
        <ul class="outside__list">
          <li v-for="bucket in goal.outside" :key="bucket.categoryId" class="outside__item">
            <span class="outside__name">
              <i :class="bucket.icon || 'fa-solid fa-tag'" :style="bucket.color ? { color: bucket.color } : undefined" aria-hidden="true" />
              {{ bucket.categoryName }}
            </span>
            <span class="outside__figures">{{ bucket.soldCount }} venta(s) · {{ formatMoney(bucket.soldAmount) }}</span>
            <BaseButton
              v-if="canEdit"
              size="sm"
              variant="ghost"
              icon="fa-solid fa-plus"
              @click="openEditor(bucket.categoryId)"
            >
              Añadir al objetivo
            </BaseButton>
          </li>
        </ul>
      </div>

      <!-- Sin clasificar: hay que ubicarlas -->
      <div v-if="goal.unclassified.length" class="unclassified">
        <h3 class="goal__h3 goal__h3--warn">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          {{ goal.unclassified.length }} venta(s) sin tipo de cliente · {{ formatMoney(goal.totals.unclassifiedAmount) }}
        </h3>
        <p class="goal__muted">No suman al objetivo hasta que indiques qué tipo de cliente es cada una.</p>
        <ul class="unclassified__list">
          <li v-for="sale in goal.unclassified" :key="sale._id" class="unclassified__item">
            <div class="unclassified__main">
              <span class="unclassified__name">{{ sale.businessName }}</span>
              <span class="unclassified__meta">
                {{ formatMoney(sale.amount) }} · {{ formatDateShort(sale.agreedAt) }}
                <template v-if="sale.soldByName"> · vendió {{ sale.soldByName }}</template>
              </span>
            </div>
            <ClientTypeField
              v-if="canEdit"
              :model-value="null"
              label=""
              placeholder="¿Dónde va?"
              size="sm"
              :clearable="false"
              :highlight="goalCategoryIds"
              :disabled="placing === sale._id"
              @update:model-value="place(sale, $event)"
            />
            <BaseBadge v-else variant="warning" icon="fa-solid fa-question" size="sm">Sin clasificar</BaseBadge>
          </li>
        </ul>
      </div>

      <p v-if="goal.hasGoal && goal.updatedByName" class="goal__foot">
        Objetivo cargado por {{ goal.updatedByName }}
        <template v-if="goal.updatedAt"> · {{ formatDateShort(goal.updatedAt) }}</template>
        <template v-if="goal.notes"> · {{ goal.notes }}</template>
      </p>
    </template>

    <!-- Editor -->
    <BaseModal
      v-model="editorOpen"
      :title="`Objetivo de ${formatPeriod(store.goalPeriod)}`"
      subtitle="Qué tipo de cliente hay que buscar, cuántos y por cuánto"
      icon="fa-solid fa-bullseye"
      size="lg"
    >
      <div class="editor">
        <p class="editor__intro">
          <i class="fa-solid fa-circle-info" aria-hidden="true" />
          Una tarjeta por tipo de cliente. Si el tipo no existe, escríbelo con tus palabras y se
          crea al instante.
        </p>

        <ul class="editor__lines">
          <li v-for="(line, index) in draft" :key="index" class="eline">
            <header class="eline__head">
              <span class="eline__n">{{ index + 1 }}</span>
              <span class="eline__title">{{ nameOf(line.categoryId) || 'Nuevo tipo de cliente' }}</span>
              <BaseButton
                variant="ghost"
                size="sm"
                icon="fa-solid fa-trash"
                aria-label="Quitar este tipo del objetivo"
                @click="removeLine(index)"
              />
            </header>

            <ClientTypeField
              :model-value="line.categoryId || null"
              label="¿Qué tipo de cliente buscamos?"
              placeholder="Elige de la lista o escribe uno nuevo"
              :exclude="usedExcept(index)"
              :clearable="false"
              required
              @update:model-value="line.categoryId = $event ?? ''"
            />

            <div class="eline__targets">
              <BaseInput
                v-model.number="line.targetCount"
                type="number"
                label="¿Cuántos clientes?"
                :min="0"
                hint="Cierres de este tipo en el mes"
              />
              <BaseCurrencyInput v-model="line.targetAmount" label="¿Cuánto en ventas?" hint="Total acordado que esperamos" />
            </div>

            <BaseInput
              v-model="line.notes"
              label="Nota para el vendedor (opcional)"
              placeholder="Zona, ticket mínimo, prioridad…"
            />
          </li>
        </ul>

        <div class="editor__foot">
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-plus" @click="addLine">
            Añadir otro tipo
          </BaseButton>
          <span class="editor__totals">
            Meta total: <strong>{{ draftTotals.count }}</strong> clientes ·
            <strong>{{ formatMoney(draftTotals.amount) }}</strong>
          </span>
        </div>

        <BaseTextarea
          v-model="draftNotes"
          label="Notas del objetivo"
          :rows="2"
          placeholder="De dónde salió la meta, condiciones, lo que dijo el vendedor…"
        />
      </div>

      <template #footer>
        <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="editorOpen = false">Cancelar</BaseButton>
        <BaseButton icon="fa-solid fa-check" :loading="store.saving" :disabled="!draftValid" @click="saveGoal">
          Guardar objetivo
        </BaseButton>
      </template>
    </BaseModal>
  </section>
</template>

<style scoped lang="scss">
.goal {
  @include card($sp-5);
  @include flex-col($sp-4);
}

.goal__head {
  @include flex(row, space-between, flex-start, $sp-3);
  flex-wrap: wrap;
}

.goal__title-wrap { flex: 1 1 240px; min-width: 0; }

.goal__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-md;
  font-weight: 800;
  color: $primary-dark;

  i { color: $primary; }
}

.goal__sub {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: 2px;
}

.goal__controls {
  @include flex(row, flex-end, center, $sp-2);
  flex: 1 1 260px;
  flex-wrap: wrap;
}

.goal__skeleton { @include flex-col($sp-2); }

.goal__empty {
  @include flex(row, flex-start, flex-start, $sp-2);
  flex-wrap: wrap;
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-info-bg;
  border: 1px solid rgba($alert-info, 0.25);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i { color: $alert-info; margin-top: 2px; }
  strong { color: $primary-dark; }
}

.goal__h3 {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-sm;
  font-weight: 800;
  color: $primary-dark;

  i { color: $primary; }

  &--warn,
  &--warn i { color: $alert-warning; }
}

.goal__muted { font-size: $fs-xs; color: $text-secondary; }

.goal__foot { font-size: $fs-xs; color: $text-secondary; }

// ── Barras ──
.bar {
  position: relative;
  height: 10px;
  border-radius: $radius-full;
  background: rgba($primary, 0.1);
  overflow: hidden;

  &--sm { height: 6px; }
}

.bar__fill {
  display: block;
  height: 100%;
  border-radius: $radius-full;
  background: $primary;
  transition: width $transition-base;
}

.bar--ok .bar__fill,
.totals__bar--ok .bar__fill { background: $alert-success; }
.bar--mid .bar__fill,
.totals__bar--mid .bar__fill { background: $alert-warning; }
.bar--low .bar__fill,
.totals__bar--low .bar__fill { background: $primary; }

.totals {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
}

.totals__bar {
  @include flex-col($sp-2);
  flex: 1 1 260px;
  min-width: 0;
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
}

.totals__row {
  @include flex(row, flex-start, baseline, $sp-2);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;

  strong { font-size: $fs-lg; font-weight: 800; color: $primary-dark; }
}

.totals__label {
  @include flex(row, flex-start, center, $sp-1);
  font-weight: 700;
  i { color: $primary; }
}

.totals__pct { margin-left: auto; font-weight: 800; color: $primary-dark; }

// ── Líneas ──
.lines {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
}

.line {
  @include flex-col($sp-2);
  flex: 1 1 260px;
  min-width: 0;
  padding: $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: $surface;
}

.line__head {
  @include flex(row, space-between, center, $sp-2);
  flex-wrap: wrap;
}

.line__name {
  @include flex(row, flex-start, center, $sp-2);
  font-weight: 800;
  color: $primary-dark;
  @include truncate;

  i { color: $primary; }
}

.line__metric { @include flex-col(4px); }

.line__figure {
  font-size: $fs-xs;
  color: $text-secondary;
  strong { color: $primary-dark; font-weight: 800; }
}

.line__remaining {
  @include flex(row, flex-start, center, $sp-1);
  font-size: $fs-xs;
  font-weight: 700;
  color: $alert-warning;
  i { color: $alert-warning; }
}

.line__notes { font-size: $fs-xs; color: $text-secondary; font-style: italic; }

.line__sales {
  @include flex-col(2px);
  margin-top: $sp-1;
  padding-top: $sp-2;
  border-top: 1px dashed $border-color;
  font-size: $fs-xs;

  li { @include flex(row, space-between, center, $sp-2); }
}

.line__sale-name { color: $text-secondary; @include truncate; }
.line__sale-amount { flex: none; font-weight: 700; color: $primary-dark; }

// ── Fuera del objetivo ──
.outside,
.unclassified {
  @include flex-col($sp-2);
  padding-top: $sp-3;
  border-top: 1px solid $border-color;
}

.outside__list,
.unclassified__list { @include flex-col($sp-2); }

.outside__item,
.unclassified__item {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  padding: $sp-2 $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  font-size: $fs-xs;
}

.outside__name {
  @include flex(row, flex-start, center, $sp-2);
  flex: 1 1 160px;
  font-weight: 700;
  color: $primary-dark;
  i { color: $primary; }
}

.outside__figures { flex: 1 1 160px; color: $text-secondary; }

.unclassified__item { border-color: rgba($alert-warning, 0.4); }

.unclassified__main {
  @include flex-col(2px);
  flex: 1 1 200px;
  min-width: 0;
}

.unclassified__name { font-weight: 700; color: $primary-dark; @include truncate; }
.unclassified__meta { color: $text-secondary; }

.unclassified__item > :last-child { flex: 1 1 220px; min-width: 0; }

// ── Editor ──
.editor { @include flex-col($sp-4); }

.editor__intro {
  @include flex(row, flex-start, flex-start, $sp-2);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-info-bg;
  border: 1px solid rgba($alert-info, 0.25);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i { color: $alert-info; margin-top: 2px; }
}

.editor__lines { @include flex-col($sp-3); }

.eline {
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  background: $surface;
}

.eline__head {
  @include flex(row, flex-start, center, $sp-2);
  padding-bottom: $sp-2;
  border-bottom: 1px dashed $border-color;
}

.eline__n {
  @include flex-center;
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: $radius-full;
  background: rgba($primary, 0.12);
  color: $primary;
  font-weight: 800;
  font-size: 0.7rem;
}

.eline__title {
  flex: 1 1 auto;
  min-width: 0;
  font-weight: 800;
  color: $primary-dark;
  @include truncate;
}

.eline__targets {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;

  > * { flex: 1 1 180px; min-width: 0; }
}

.editor__foot {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.editor__totals {
  font-size: $fs-xs;
  color: $text-secondary;
  strong { color: $primary-dark; font-weight: 800; }
}
</style>
