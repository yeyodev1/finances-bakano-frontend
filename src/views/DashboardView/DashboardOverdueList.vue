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

const { formatMoney, formatDate } = useFormat()

function clientId(invoice: Invoice): string {
  const raw = invoice.clientId as string | Client
  return typeof raw === 'string' ? raw : raw?._id
}

function clientImage(invoice: Invoice): string | null {
  const raw = invoice.clientId as string | Client
  return typeof raw === 'string' ? null : raw?.workspaceImageUrl ?? null
}

function daysLate(invoice: Invoice): number {
  const due = new Date(invoice.dueDate).getTime()
  if (Number.isNaN(due)) return 0
  return Math.max(0, Math.floor((Date.now() - due) / 86_400_000))
}

type Tone = 'overdue' | 'pending' | 'partial'

function tone(days: number): Tone {
  if (days > 30) return 'overdue'
  if (days > 15) return 'pending'
  return 'partial'
}

const rows = computed(() =>
  [...props.invoices]
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, props.limit)
    .map((invoice) => ({
      invoice,
      days: daysLate(invoice),
      pending: Math.max(0, invoice.amount - (invoice.paidAmount || 0)),
      to: `/clientes/${clientId(invoice)}`,
    })),
)

const totalOverdue = computed(() =>
  props.invoices.reduce((acc, i) => acc + Math.max(0, i.amount - (i.paidAmount || 0)), 0),
)
</script>

<template>
  <BaseCard class="overdue">
    <template #header>
      <div class="overdue__head">
        <div>
          <h2>Vencidos</h2>
          <span>{{ invoices.length }} facturas · {{ formatMoney(totalOverdue) }}</span>
        </div>
        <RouterLink to="/cobros?status=overdue" class="overdue__link">
          Ver todos <i class="fa-solid fa-arrow-right" />
        </RouterLink>
      </div>
    </template>

    <div v-if="loading" class="overdue__skeletons">
      <BaseSkeleton v-for="n in 4" :key="n" height="56px" radius="10px" />
    </div>

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-circle-check"
      title="Sin vencidos"
      description="Todos los cobros están al día. Excelente."
    />

    <TransitionGroup v-else name="list" tag="ul" class="overdue__list">
      <li v-for="row in rows" :key="row.invoice._id" class="overdue__item">
        <RouterLink :to="row.to" class="overdue__row">
          <span class="overdue__bar" :data-tone="tone(row.days)" aria-hidden="true" />
          <BaseWorkspaceAvatar
            :src="clientImage(row.invoice)"
            :name="row.invoice.clientName"
            size="xs"
          />
          <span class="overdue__info">
            <strong class="overdue__client">{{ row.invoice.clientName }}</strong>
            <span class="overdue__meta">
              Vencía el {{ formatDate(row.invoice.dueDate) }}
              <template v-if="row.invoice.splitLabel"> · {{ row.invoice.splitLabel }}</template>
            </span>
          </span>
          <span class="overdue__right">
            <strong class="overdue__amount">{{ formatMoney(row.pending) }}</strong>
            <BaseBadge
              :variant="tone(row.days)"
              size="sm"
              :label="`${row.days} ${row.days === 1 ? 'día' : 'días'}`"
            />
          </span>
        </RouterLink>
      </li>
    </TransitionGroup>
  </BaseCard>
</template>

<style scoped lang="scss">
.overdue__head {
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

.overdue__link {
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

.overdue__skeletons,
.overdue__list {
  @include flex-col($sp-2);
  margin: 0;
  padding: 0;
  position: relative;
}

.overdue__row {
  @include flex(row, flex-start, center, $sp-3);
  position: relative;
  padding: $sp-3;
  padding-left: $sp-4;
  border-radius: $radius-sm;
  background: $surface-alt;
  overflow: hidden;
  transition: background $transition-fast, transform $transition-fast;

  &:hover {
    background: rgba($primary, 0.06);
    transform: translateX(3px);
  }
}

.overdue__bar {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;

  &[data-tone='danger'] {
    background: $alert-error;
  }
  &[data-tone='warning'] {
    background: $alert-warning;
  }
  &[data-tone='info'] {
    background: $alert-info;
  }
}

.overdue__info {
  @include flex-col(2px);
  flex: 1 1 auto;
  min-width: 0;
}

.overdue__client {
  @include truncate;
  font-size: $fs-sm;
  color: $primary-dark;
}

.overdue__meta {
  @include truncate;
  font-size: $fs-xs;
  color: $text-secondary;
}

.overdue__right {
  @include flex(column, center, flex-end, $sp-1);
  flex: 0 0 auto;
}

.overdue__amount {
  font-size: $fs-sm;
  color: $alert-error;
  white-space: nowrap;
}
</style>
