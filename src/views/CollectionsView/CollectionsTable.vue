<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BaseBadge,
  BaseButton,
  BaseEmptyState,
  BaseSkeleton,
  BaseTable,
  BaseWorkspaceAvatar,
} from '@/components/base'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useFormat } from '@/composables/useFormat'
import {
  INVOICE_STATUS_ICONS,
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_TONE,
  isDeferred,
  lastDeferral,
} from '@/stores/invoices'
import type { Client, Invoice } from '@/types'

const props = defineProps<{ items: Invoice[]; loading: boolean }>()

// ── Selección múltiple ───────────────────────────────────────────
// Solo se pueden seleccionar los cobros abiertos: condonar o aplazar uno ya
// pagado o anulado no significa nada y el backend lo rechazaría igual.
const selectedIds = ref<string[]>([])

function isSelectable(invoice: Invoice): boolean {
  return ['pending', 'partial', 'overdue'].includes(invoice.status)
}

const selectableRows = computed(() => props.items.filter(isSelectable))

const selectedRows = computed(() =>
  props.items.filter((i) => selectedIds.value.includes(i._id)),
)

const allSelected = computed(
  () => selectableRows.value.length > 0 && selectedIds.value.length === selectableRows.value.length,
)

const selectedTotal = computed(() =>
  selectedRows.value.reduce((acc, i) => acc + balance(i), 0),
)

function toggleRow(id: string) {
  const at = selectedIds.value.indexOf(id)
  if (at >= 0) selectedIds.value.splice(at, 1)
  else selectedIds.value.push(id)
}

function toggleAll() {
  selectedIds.value = allSelected.value ? [] : selectableRows.value.map((i) => i._id)
}

function clearSelection() {
  selectedIds.value = []
}

// Si cambian los filtros, la selección vieja ya no aplica.
watch(
  () => props.items,
  () => {
    const visible = new Set(props.items.map((i) => i._id))
    selectedIds.value = selectedIds.value.filter((id) => visible.has(id))
  },
)

defineExpose({ clearSelection })

const emit = defineEmits<{
  bulk: [action: 'waive' | 'cancel' | 'defer', invoices: Invoice[]]
  pay: [invoice: Invoice]
  waive: [invoice: Invoice]
  cancel: [invoice: Invoice]
  defer: [invoice: Invoice]
  'undo-defer': [invoice: Invoice]
}>()

const { isMobile } = useBreakpoint()
const { formatMoney, formatDateShort, daysDiff } = useFormat()

const columns = [
  { key: 'select', label: '' },
  { key: 'clientName', label: 'Cliente' },
  { key: 'amount', label: 'Monto', align: 'right' },
  { key: 'dueDate', label: 'Vencimiento' },
  { key: 'late', label: 'Mora' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: '', align: 'right' },
]

const rows = computed(() => props.items)

/**
 * El id del cliente para enlazar a su ficha. `clientId` llega como string suelto
 * o como objeto expandido según el endpoint, así que hay que contemplar ambos.
 */
function clientIdOf(invoice: Invoice): string | null {
  const raw = invoice.clientId as string | Client
  if (!raw) return null
  return typeof raw === 'string' ? raw : (raw._id ?? null)
}

/** La imagen del espacio llega poblada cuando el backend expande el cliente. */
function clientImage(invoice: Invoice): string | null {
  const raw = invoice.clientId as string | Client
  return typeof raw === 'string' ? null : raw?.workspaceImageUrl ?? null
}

function lateDays(invoice: Invoice): number {
  const diff = daysDiff(invoice.dueDate)
  return diff !== null && diff < 0 ? Math.abs(diff) : 0
}

function isOpen(invoice: Invoice): boolean {
  return ['pending', 'partial', 'overdue'].includes(invoice.status)
}

function balance(invoice: Invoice): number {
  return Math.max(Number(invoice.amount) - Number(invoice.paidAmount || 0), 0)
}

function previousDueLabel(invoice: Invoice): string {
  const original = invoice.originalDueDate || lastDeferral(invoice)?.previousDueDate
  return original ? `antes: ${formatDateShort(original)}` : ''
}
</script>

<template>
  <div class="collections-table">
    <Transition name="fade-slide">
      <div v-if="selectedIds.length" class="bulk">
        <span class="bulk__count">
          <i class="fa-solid fa-check-double" aria-hidden="true" />
          {{ selectedIds.length }} seleccionado(s) · {{ formatMoney(selectedTotal) }} de saldo
        </span>
        <div class="bulk__actions">
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-calendar-plus"
            @click="emit('bulk', 'defer', selectedRows)">Aplazar</BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-hand-holding-heart"
            @click="emit('bulk', 'waive', selectedRows)">Condonar</BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-ban"
            @click="emit('bulk', 'cancel', selectedRows)">Anular</BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-xmark"
            @click="clearSelection">Quitar selección</BaseButton>
        </div>
      </div>
    </Transition>

    <div v-if="loading" class="collections-table__skeleton">
      <BaseSkeleton v-for="n in 6" :key="n" height="64px" />
    </div>

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-inbox"
      title="Sin cobros en este período"
      message="Genera los cobros del mes o cambia los filtros para ver resultados."
    />

    <TransitionGroup v-else-if="isMobile" name="list" tag="div" class="cards">
      <article v-for="invoice in rows" :key="invoice._id" class="card">
        <header class="card__head">
          <component
            :is="clientIdOf(invoice) ? 'RouterLink' : 'div'"
            v-bind="
              clientIdOf(invoice)
                ? { to: { name: 'ClientDetail', params: { id: clientIdOf(invoice) } } }
                : {}
            "
            class="card__id"
            :class="{ 'card__id--link': clientIdOf(invoice) }"
          >
            <BaseWorkspaceAvatar :src="clientImage(invoice)" :name="invoice.clientName" size="sm" />
            <div>
              <h3>
                {{ invoice.clientName }}
                <i
                  v-if="clientIdOf(invoice)"
                  class="client__go fa-solid fa-arrow-up-right-from-square"
                  aria-hidden="true"
                />
              </h3>
              <p v-if="invoice.splitLabel" class="card__split">{{ invoice.splitLabel }}</p>
            </div>
          </component>
          <div class="card__badges">
            <BaseBadge :variant="INVOICE_STATUS_TONE[invoice.status]" :icon="INVOICE_STATUS_ICONS[invoice.status]">
              {{ INVOICE_STATUS_LABELS[invoice.status] }}
            </BaseBadge>
            <BaseBadge v-if="isDeferred(invoice)" variant="info" icon="fa-solid fa-calendar-plus" size="sm">
              Prorrogado
            </BaseBadge>
            <BaseBadge v-if="invoice.isAdvance" variant="secondary" icon="fa-solid fa-forward" size="sm">
              Anticipado
            </BaseBadge>
          </div>
        </header>

        <div class="card__amounts">
          <span class="card__amount">{{ formatMoney(invoice.amount) }}</span>
          <span v-if="invoice.paidAmount > 0" class="card__balance">
            Saldo {{ formatMoney(balance(invoice)) }}
          </span>
        </div>

        <p class="card__due">
          <i class="fa-solid fa-calendar-check" aria-hidden="true" />
          Vence {{ formatDateShort(invoice.dueDate) }}
          <span v-if="lateDays(invoice) && isOpen(invoice)" class="card__late">
            · {{ lateDays(invoice) }} días de mora
          </span>
          <span v-if="previousDueLabel(invoice)" class="card__prev">· {{ previousDueLabel(invoice) }}</span>
        </p>

        <footer v-if="isOpen(invoice)" class="card__actions">
          <BaseButton size="sm" icon="fa-solid fa-hand-holding-dollar" @click="emit('pay', invoice)">
            Registrar pago
          </BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-calendar-plus" @click="emit('defer', invoice)">
            Aplazar cobro
          </BaseButton>
          <BaseButton
            v-if="isDeferred(invoice)"
            size="sm"
            variant="ghost"
            icon="fa-solid fa-clock-rotate-left"
            @click="emit('undo-defer', invoice)"
          >
            Deshacer prórroga
          </BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-hand-holding-heart" @click="emit('waive', invoice)">
            Condonar
          </BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-ban" @click="emit('cancel', invoice)">
            Anular
          </BaseButton>
        </footer>
      </article>
    </TransitionGroup>


    <BaseTable v-else :columns="columns" :rows="rows" row-key="_id">
      <template #head-select>
        <input
          class="check"
          type="checkbox"
          :checked="allSelected"
          :indeterminate="selectedIds.length > 0 && !allSelected"
          aria-label="Seleccionar todos los cobros abiertos"
          :disabled="!selectableRows.length"
          @change="toggleAll"
        />
      </template>

      <template #cell-select="{ row }">
        <input
          v-if="isSelectable(row as Invoice)"
          class="check"
          type="checkbox"
          :checked="selectedIds.includes((row as Invoice)._id)"
          :aria-label="`Seleccionar el cobro de ${(row as Invoice).clientName}`"
          @change="toggleRow((row as Invoice)._id)"
        />
      </template>

      <template #cell-clientName="{ row }">
        <component
          :is="clientIdOf(row as Invoice) ? 'RouterLink' : 'div'"
          v-bind="
            clientIdOf(row as Invoice)
              ? { to: { name: 'ClientDetail', params: { id: clientIdOf(row as Invoice) } } }
              : {}
          "
          class="client-cell"
          :class="{ 'client-cell--link': clientIdOf(row as Invoice) }"
        >
          <BaseWorkspaceAvatar
            :src="clientImage(row as Invoice)"
            :name="(row as Invoice).clientName"
            size="sm"
          />
          <div class="client-cell__id">
            <span class="client">
              {{ (row as Invoice).clientName }}
              <i
                v-if="clientIdOf(row as Invoice)"
                class="client__go fa-solid fa-arrow-up-right-from-square"
                aria-hidden="true"
              />
            </span>
            <span v-if="(row as Invoice).splitLabel" class="client__split">
              {{ (row as Invoice).splitLabel }}
            </span>
          </div>
        </component>
      </template>

      <template #cell-amount="{ row }">
        <strong>{{ formatMoney((row as Invoice).amount) }}</strong>
        <span v-if="(row as Invoice).paidAmount > 0" class="paid">
          Saldo {{ formatMoney(balance(row as Invoice)) }}
        </span>
      </template>

      <template #cell-dueDate="{ row }">
        {{ formatDateShort((row as Invoice).dueDate) }}
        <span
          v-if="previousDueLabel(row as Invoice)"
          class="prev"
          :title="`Prorrogado · ${previousDueLabel(row as Invoice)}`"
        >
          {{ previousDueLabel(row as Invoice) }}
        </span>
      </template>

      <template #cell-late="{ row }">
        <span v-if="lateDays(row as Invoice) && isOpen(row as Invoice)" class="late">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" /> {{ lateDays(row as Invoice) }} días
        </span>
        <span v-else class="muted">—</span>
      </template>

      <template #cell-status="{ row }">
        <div class="status-cell">
          <BaseBadge
            :variant="INVOICE_STATUS_TONE[(row as Invoice).status]"
            :icon="INVOICE_STATUS_ICONS[(row as Invoice).status]"
          >
            {{ INVOICE_STATUS_LABELS[(row as Invoice).status] }}
          </BaseBadge>
          <BaseBadge
            v-if="isDeferred(row as Invoice)"
            variant="info"
            icon="fa-solid fa-calendar-plus"
            size="sm"
          >
            Prorrogado
          </BaseBadge>
          <BaseBadge
            v-if="(row as Invoice).isAdvance"
            variant="secondary"
            icon="fa-solid fa-forward"
            size="sm"
          >
            Anticipado
          </BaseBadge>
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div v-if="isOpen(row as Invoice)" class="row-actions">
          <BaseButton size="sm" icon="fa-solid fa-hand-holding-dollar" @click="emit('pay', row as Invoice)">
            Registrar pago
          </BaseButton>
          <button type="button" title="Aplazar cobro" @click="emit('defer', row as Invoice)">
            <i class="fa-solid fa-calendar-plus" aria-hidden="true" />
          </button>
          <button
            v-if="isDeferred(row as Invoice)"
            type="button"
            title="Deshacer última prórroga"
            @click="emit('undo-defer', row as Invoice)"
          >
            <i class="fa-solid fa-clock-rotate-left" aria-hidden="true" />
          </button>
          <button type="button" title="Condonar" @click="emit('waive', row as Invoice)">
            <i class="fa-solid fa-hand-holding-heart" aria-hidden="true" />
          </button>
          <button type="button" class="danger" title="Anular" @click="emit('cancel', row as Invoice)">
            <i class="fa-solid fa-ban" aria-hidden="true" />
          </button>
        </div>
      </template>
    </BaseTable>
  </div>
</template>

<style scoped lang="scss">
// El nombre del cliente lleva a su ficha. Se usa RouterLink (no un @click) para
// que funcionen ctrl+click, abrir en pestaña nueva y la navegación por teclado.
.client-cell--link,
.card__id--link {
  color: inherit;
  text-decoration: none;
  border-radius: $radius-xs;
  transition: color $transition-fast;

  &:hover {
    color: $primary;

    .client__go { opacity: 1; }
  }

  &:focus-visible { @include focus-ring; }
}

.client__go {
  margin-left: 6px;
  font-size: 0.6em;
  opacity: 0;
  color: $primary;
  transition: opacity $transition-fast;
}

// En táctil no hay hover: el indicador se deja siempre visible.
@media (hover: none) {
  .client__go { opacity: 0.6; }
}

.bulk {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $primary;
  background: rgba($primary, 0.07);
}

.bulk__count {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 700;
  color: $primary;
}

.bulk__actions {
  @include flex(row, flex-start, center, $sp-1);
  flex-wrap: wrap;
}

.check {
  width: 16px;
  height: 16px;
  accent-color: $primary;
  cursor: pointer;

  &:disabled { cursor: not-allowed; opacity: 0.4; }
}

.collections-table__skeleton,
.cards {
  @include flex-col($sp-2);
}

.card {
  @include card($sp-4);
  @include card-hover;
  @include flex-col($sp-3);
}

.card__head {
  @include flex-between(flex-start, $sp-3);

  h3 {
    font-weight: 700;
    color: $primary-dark;
    font-size: $fs-md;
  }
}

.card__split {
  font-size: $fs-xs;
  color: $text-secondary;
}

.card__amounts {
  @include flex(row, flex-start, baseline, $sp-3);
}

.card__amount {
  font-size: $fs-xl;
  font-weight: 800;
  color: $primary;
}

.card__balance {
  font-size: $fs-xs;
  color: $alert-warning;
  font-weight: 600;
}

.card__due {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;
  flex-wrap: wrap;
}

.card__late {
  color: $alert-error;
  font-weight: 700;
}

.card__prev {
  color: $alert-info;
  font-weight: 600;
}

.card__badges {
  @include flex(row, flex-end, flex-end, $sp-1);
  flex-wrap: wrap;
}

.status-cell {
  @include flex(row, flex-start, center, $sp-1);
  flex-wrap: wrap;
}

.prev {
  display: block;
  font-size: $fs-xs;
  color: $alert-info;
  font-weight: 600;
}

.card__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  border-top: 1px solid $border-color;
  padding-top: $sp-3;
}

.client-cell {
  @include flex(row, flex-start, center, $sp-3);
}

.client-cell__id {
  @include flex-col(2px);
  min-width: 0;
}

.card__id {
  @include flex(row, flex-start, center, $sp-3);
  min-width: 0;
}

.client {
  display: block;
  font-weight: 700;
  color: $primary-dark;
}

.client__split {
  font-size: $fs-xs;
  color: $text-secondary;
}

.paid {
  display: block;
  font-size: $fs-xs;
  color: $alert-warning;
}

.late {
  @include flex(row, flex-start, center, $sp-1);
  color: $alert-error;
  font-weight: 700;
  font-size: $fs-xs;
}

.muted {
  color: $text-secondary;
}

.row-actions {
  @include flex(row, flex-end, center, $sp-2);

  button:not(.btn) {
    @include flex-center;
    @include pressable;
    width: 32px;
    height: 32px;
    border-radius: $radius-xs;
    border: 1px solid transparent;
    background: transparent;
    color: $text-secondary;
    cursor: pointer;

    &:hover {
      background: rgba($primary, 0.1);
      color: $primary;
    }

    &.danger:hover {
      background: $alert-error-bg;
      color: $alert-error;
    }
  }
}
</style>
