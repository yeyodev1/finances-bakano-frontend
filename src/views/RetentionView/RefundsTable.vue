<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BaseBadge, BaseButton, BaseEmptyState, BaseTable } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { refundReasonIcon, refundReasonLabel, refundReasonTone } from '@/config/retention'
import type { BadgeVariant, TableColumn } from '@/components/base'
import type { Refund } from '@/types'

const props = withDefaults(
  defineProps<{ rows?: Refund[]; loading?: boolean; canDelete?: boolean }>(),
  { rows: () => [], loading: false, canDelete: false },
)

const emit = defineEmits<{ remove: [row: Refund] }>()

const router = useRouter()
const { formatMoney, formatDateShort, formatPeriodShort } = useFormat()

const columns: TableColumn[] = [
  { key: 'clientName', label: 'Cliente', sortable: true },
  { key: 'reason', label: 'Motivo' },
  { key: 'period', label: 'Período', hideOnMobile: true },
  { key: 'amount', label: 'Devuelto', align: 'right' },
  { key: 'refundedAt', label: 'Fecha', align: 'right', hideOnMobile: true },
  { key: 'actions', label: '', align: 'right' },
]

const rows = computed(() =>
  [...props.rows].sort(
    (a, b) => new Date(b.refundedAt).getTime() - new Date(a.refundedAt).getTime(),
  ),
)

function toneOf(row: Refund): BadgeVariant {
  return refundReasonTone(row.reason) as BadgeVariant
}

function clientIdOf(row: Refund): string {
  return typeof row.clientId === 'string' ? row.clientId : (row.clientId?._id ?? '')
}

function openClient(row: Refund) {
  const id = clientIdOf(row)
  if (id) router.push({ name: 'ClientDetail', params: { id } })
}
</script>

<template>
  <BaseTable
    :columns="columns"
    :rows="rows"
    :loading="loading"
    row-key="_id"
    empty-icon="fa-solid fa-rotate-left"
    empty-text="Ningún reembolso registrado"
  >
    <template #cell-clientName="{ row }">
      <button type="button" class="refunds__client" @click.stop="openClient(row)">
        <span class="refunds__name">{{ row.clientName }}</span>
        <span v-if="row.archivedClient" class="refunds__archived">
          <i class="fa-solid fa-box-archive" aria-hidden="true" /> Dado de baja
        </span>
      </button>
    </template>

    <template #cell-reason="{ row }">
      <BaseBadge
        :variant="toneOf(row)"
        :icon="refundReasonIcon(row.reason)"
        :label="refundReasonLabel(row.reason)"
      />
    </template>

    <template #cell-period="{ row }">
      {{ formatPeriodShort(row.period) }}
    </template>

    <template #cell-amount="{ row }">
      <span class="refunds__amount">-{{ formatMoney(row.amount) }}</span>
    </template>

    <template #cell-refundedAt="{ row }">
      {{ formatDateShort(row.refundedAt) }}
    </template>

    <template #cell-actions="{ row }">
      <div class="refunds__actions">
        <a
          v-if="row.receiptUrl"
          class="refunds__receipt"
          :href="row.receiptUrl"
          target="_blank"
          rel="noopener"
          title="Ver comprobante"
          @click.stop
        >
          <i class="fa-solid fa-paperclip" aria-hidden="true" />
          <span>Comprobante</span>
        </a>
        <BaseButton
          v-if="canDelete"
          size="sm"
          variant="ghost"
          icon="fa-solid fa-trash"
          title="Eliminar reembolso"
          @click.stop="emit('remove', row)"
        >
          Eliminar
        </BaseButton>
      </div>
    </template>

    <template #empty>
      <BaseEmptyState
        icon="fa-solid fa-rotate-left"
        title="Ningún reembolso"
        message="Cuando devuelvas dinero a un cliente, el movimiento queda registrado aquí."
      />
    </template>
  </BaseTable>
</template>

<style scoped lang="scss">
.refunds__client {
  @include flex-col(2px);
  align-items: flex-start;
  background: none;
  border: 0;
  padding: 0;
  text-align: left;
  cursor: pointer;

  &:hover .refunds__name {
    color: $primary;
    text-decoration: underline;
  }
}

.refunds__name {
  font-weight: 700;
  color: $primary-dark;
  transition: color $transition-fast;
}

.refunds__archived {
  @include flex(row, flex-start, center, $sp-1);
  font-size: $fs-xs;
  color: $alert-error;
}

.refunds__amount {
  font-weight: 800;
  color: $alert-error;
}

.refunds__actions {
  @include flex(row, flex-end, center, $sp-2);
  flex-wrap: wrap;
}

.refunds__receipt {
  @include flex(row, flex-start, center, $sp-1);
  font-size: $fs-xs;
  font-weight: 600;
  color: $text-secondary;
  text-decoration: none;

  &:hover {
    color: $primary;
    text-decoration: underline;
  }
}
</style>
