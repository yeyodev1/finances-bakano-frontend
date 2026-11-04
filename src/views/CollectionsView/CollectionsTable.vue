<script setup lang="ts">
import { computed } from 'vue'
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
import { isNewSale, serviceLabel } from '@/stores/clients'
import type { Client, Invoice } from '@/types'

const props = defineProps<{ items: Invoice[]; loading: boolean }>()


const emit = defineEmits<{
  pay: [invoice: Invoice]
  waive: [invoice: Invoice]
  cancel: [invoice: Invoice]
  defer: [invoice: Invoice]
  'undo-defer': [invoice: Invoice]
}>()

const { isMobile } = useBreakpoint()
const { formatMoney, formatDateShort, daysDiff } = useFormat()

const columns = [
  { key: 'clientName', label: 'Cliente' },
  { key: 'amount', label: 'Monto', align: 'right' },
  { key: 'dueDate', label: 'Vence' },
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

/** Dueño y servicio: una persona puede tener varios negocios, así se distinguen. */
function clientSubtitle(invoice: Invoice): string {
  const raw = invoice.clientId as string | Client
  if (typeof raw === 'string' || !raw) return invoice.splitLabel || ''
  return [raw.contactName, serviceLabel(raw.service), invoice.splitLabel].filter(Boolean).join(' · ')
}

function clientIsNew(invoice: Invoice): boolean {
  const raw = invoice.clientId as string | Client
  return typeof raw !== 'string' && isNewSale(raw)
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

/** Solo un pago parcial deja saldo que mostrar. */
function isPartial(invoice: Invoice): boolean {
  return invoice.paidAmount > 0 && balance(invoice) > 0
}

function balance(invoice: Invoice): number {
  return Math.max(Number(invoice.amount) - Number(invoice.paidAmount || 0), 0)
}

function previousDueLabel(invoice: Invoice): string {
  if (!isDeferred(invoice)) return ''
  const original = invoice.originalDueDate || lastDeferral(invoice)?.previousDueDate
  return original ? `antes: ${formatDateShort(original)}` : ''
}
</script>

<template>
  <div class="collections-table">
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
              <p v-if="clientSubtitle(invoice)" class="card__split">{{ clientSubtitle(invoice) }}</p>
            </div>
          </component>
          <div class="card__badges">
            <BaseBadge :variant="INVOICE_STATUS_TONE[invoice.status]" :icon="INVOICE_STATUS_ICONS[invoice.status]">
              {{ INVOICE_STATUS_LABELS[invoice.status] }}
            </BaseBadge>
            <BaseBadge v-if="isDeferred(invoice)" variant="info" icon="fa-solid fa-calendar-plus" size="sm">
              Aplazado
            </BaseBadge>
            <BaseBadge v-if="clientIsNew(invoice)" variant="success" icon="fa-solid fa-star" size="sm">
              Venta nueva
            </BaseBadge>
            <BaseBadge v-if="invoice.isAdvance" variant="secondary" icon="fa-solid fa-forward" size="sm">
              Anticipado
            </BaseBadge>
          </div>
        </header>

        <div class="card__amounts">
          <span class="card__amount">{{ formatMoney(invoice.amount) }}</span>
          <span v-if="isPartial(invoice)" class="card__balance">
            Falta {{ formatMoney(balance(invoice)) }}
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
            Aplazar
          </BaseButton>
          <BaseButton
            v-if="isDeferred(invoice)"
            size="sm"
            variant="ghost"
            icon="fa-solid fa-clock-rotate-left"
            @click="emit('undo-defer', invoice)"
          >
            Deshacer aplazo
          </BaseButton>
          <BaseButton size="sm" variant="ghost" @click="emit('cancel', invoice)">No cobrar</BaseButton>
        </footer>
      </article>
    </TransitionGroup>


    <BaseTable v-else :columns="columns" :rows="rows" row-key="_id">
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
            <span v-if="clientSubtitle(row as Invoice)" class="client__split">
              {{ clientSubtitle(row as Invoice) }}
            </span>
          </div>
        </component>
      </template>

      <template #cell-amount="{ row }">
        <strong>{{ formatMoney((row as Invoice).amount) }}</strong>
        <span v-if="isPartial(row as Invoice)" class="paid">
          Falta {{ formatMoney(balance(row as Invoice)) }}
        </span>
      </template>

      <template #cell-dueDate="{ row }">
        {{ formatDateShort((row as Invoice).dueDate) }}
        <span v-if="lateDays(row as Invoice) && isOpen(row as Invoice)" class="late">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" /> hace {{ lateDays(row as Invoice) }} días
        </span>
        <span
          v-if="previousDueLabel(row as Invoice)"
          class="prev"
          :title="`Aplazado · ${previousDueLabel(row as Invoice)}`"
        >
          {{ previousDueLabel(row as Invoice) }}
        </span>
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
            Aplazado
          </BaseBadge>
          <BaseBadge v-if="clientIsNew(row as Invoice)" variant="success" icon="fa-solid fa-star" size="sm">
            Venta nueva
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
          <BaseButton size="sm" @click="emit('pay', row as Invoice)">Registrar pago</BaseButton>
          <BaseButton size="sm" variant="ghost" @click="emit('defer', row as Invoice)">Aplazar</BaseButton>
          <BaseButton
            v-if="isDeferred(row as Invoice)"
            size="sm"
            variant="ghost"
            @click="emit('undo-defer', row as Invoice)"
          >
            Deshacer aplazo
          </BaseButton>
          <BaseButton size="sm" variant="ghost" @click="emit('cancel', row as Invoice)">
            No cobrar
          </BaseButton>
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
