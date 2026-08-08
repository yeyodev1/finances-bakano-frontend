<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseCard, BaseEmptyState, BaseSkeleton, BaseWorkspaceAvatar } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { Client, Invoice } from '@/types'

const props = withDefaults(
  defineProps<{
    invoices?: Invoice[]
    loading?: boolean
    limit?: number
  }>(),
  { invoices: () => [], loading: false, limit: 8 },
)

const { formatMoney } = useFormat()

const monthFmt = new Intl.DateTimeFormat('es-EC', { month: 'short' })

function monthAbbr(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : monthFmt.format(date).replace('.', '')
}

function dayNumber(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '–' : String(date.getDate())
}

function clientId(invoice: Invoice): string {
  const raw = invoice.clientId as string | Client
  return typeof raw === 'string' ? raw : raw?._id
}

function clientImage(invoice: Invoice): string | null {
  const raw = invoice.clientId as string | Client
  return typeof raw === 'string' ? null : raw?.workspaceImageUrl ?? null
}

function daysLeft(invoice: Invoice): number {
  const due = new Date(invoice.dueDate).getTime()
  if (Number.isNaN(due)) return 0
  return Math.max(0, Math.ceil((due - Date.now()) / 86_400_000))
}

function label(days: number): string {
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Mañana'
  return `En ${days} días`
}

type Tone = 'overdue' | 'pending' | 'active'

function tone(days: number): Tone {
  if (days <= 1) return 'overdue'
  if (days <= 5) return 'pending'
  return 'active'
}

const rows = computed(() =>
  [...props.invoices]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, props.limit)
    .map((invoice) => ({
      invoice,
      days: daysLeft(invoice),
      pending: Math.max(0, invoice.amount - (invoice.paidAmount || 0)),
      to: `/clientes/${clientId(invoice)}`,
    })),
)

const total = computed(() =>
  props.invoices.reduce((acc, i) => acc + Math.max(0, i.amount - (i.paidAmount || 0)), 0),
)
</script>

<template>
  <BaseCard class="upcoming">
    <template #header>
      <div class="upcoming__head">
        <div>
          <h2>Próximos cobros</h2>
          <span>15 días · {{ formatMoney(total) }}</span>
        </div>
        <RouterLink to="/cobros" class="upcoming__link">
          Ver cobros <i class="fa-solid fa-arrow-right" />
        </RouterLink>
      </div>
    </template>

    <div v-if="loading" class="upcoming__skeletons">
      <BaseSkeleton v-for="n in 4" :key="n" height="56px" radius="10px" />
    </div>

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-calendar-check"
      title="Nada por cobrar"
      description="No hay vencimientos en los próximos 15 días."
    />

    <TransitionGroup v-else name="list" tag="ul" class="upcoming__list">
      <li v-for="row in rows" :key="row.invoice._id">
        <RouterLink :to="row.to" class="upcoming__row">
          <span class="upcoming__day">
            <strong>{{ dayNumber(row.invoice.dueDate) }}</strong>
            <em>{{ monthAbbr(row.invoice.dueDate) }}</em>
          </span>
          <BaseWorkspaceAvatar
            :src="clientImage(row.invoice)"
            :name="row.invoice.clientName"
            size="xs"
          />
          <span class="upcoming__info">
            <strong class="upcoming__client">{{ row.invoice.clientName }}</strong>
            <span class="upcoming__meta">{{ label(row.days) }}</span>
          </span>
          <span class="upcoming__right">
            <strong class="upcoming__amount">{{ formatMoney(row.pending) }}</strong>
            <BaseBadge :variant="tone(row.days)" size="sm" :label="label(row.days)" />
          </span>
        </RouterLink>
      </li>
    </TransitionGroup>
  </BaseCard>
</template>

<style scoped lang="scss">
.upcoming__head {
  @include flex-between(center, $sp-3);
  width: 100%;

  h2 {
    font-size: $fs-md;
    font-weight: 800;
    margin: 0;
  }

  span {
    font-size: $fs-xs;
    color: $text-secondary;
  }
}

.upcoming__link {
  @include flex(row, flex-start, center, $sp-1);
  font-size: $fs-xs;
  font-weight: 700;
  color: $primary;
  white-space: nowrap;
  transition: gap $transition-fast;

  &:hover {
    gap: $sp-2;
  }
}

.upcoming__skeletons,
.upcoming__list {
  @include flex-col($sp-2);
  margin: 0;
  padding: 0;
  position: relative;
}

.upcoming__row {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-2 $sp-3;
  border-radius: $radius-sm;
  background: $surface-alt;
  transition: background $transition-fast, transform $transition-fast;

  &:hover {
    background: rgba($primary, 0.06);
    transform: translateX(3px);
  }
}

.upcoming__day {
  @include flex(column, center, center, 0);
  flex: 0 0 auto;
  width: 44px;
  padding: $sp-1 0;
  border-radius: $radius-xs;
  background: $white;
  border: 1px solid $border-color;

  strong {
    font-size: $fs-md;
    line-height: 1;
    color: $primary;
  }

  em {
    font-style: normal;
    font-size: 0.62rem;
    text-transform: uppercase;
    font-weight: 700;
    color: $text-secondary;
  }
}

.upcoming__info {
  @include flex-col(2px);
  flex: 1 1 auto;
  min-width: 0;
}

.upcoming__client {
  @include truncate;
  font-size: $fs-sm;
  color: $primary-dark;
}

.upcoming__meta {
  @include truncate;
  font-size: $fs-xs;
  color: $text-secondary;
}

.upcoming__right {
  @include flex(column, center, flex-end, $sp-1);
  flex: 0 0 auto;
}

.upcoming__amount {
  font-size: $fs-sm;
  color: $primary-dark;
  white-space: nowrap;
}
</style>
