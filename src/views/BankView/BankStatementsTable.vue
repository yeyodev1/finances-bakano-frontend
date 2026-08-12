<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton, BaseTable } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { TableColumn } from '@/components/base'
import type { BankStatement } from '@/types'

const props = withDefaults(
  defineProps<{
    items?: BankStatement[]
    loading?: boolean
  }>(),
  { items: () => [], loading: false },
)

const { formatMoney, formatDateShort } = useFormat()

const columns: TableColumn[] = [
  { key: 'period', label: 'Período' },
  { key: 'endingBalance', label: 'Saldo de cierre', align: 'right' },
  { key: 'actions', label: '', align: 'right', width: '140px' },
]

const rows = computed(() =>
  props.items.map((statement) => ({
    ...statement,
    period: `${formatDateShort(statement.startDate)} — ${formatDateShort(statement.endDate)}`,
  })),
)

/** El `downloadUrl` viene firmado por Mercury y caduca: se abre, no se guarda. */
function download(url?: string) {
  if (url) window.open(url, '_blank', 'noopener')
}
</script>

<template>
  <BaseTable
    :columns="columns"
    :rows="rows"
    :loading="props.loading"
    row-key="id"
    empty-icon="fa-solid fa-file-invoice"
    empty-text="Aún no hay estados de cuenta disponibles"
  >
    <template #cell-period="{ row }">
      <div class="bstmt__period">
        <i class="fa-solid fa-file-pdf" aria-hidden="true" />
        <strong>{{ row.period }}</strong>
      </div>
    </template>

    <template #cell-endingBalance="{ row }">
      <span class="bstmt__amount">{{ formatMoney(row.endingBalance) }}</span>
    </template>

    <template #cell-actions="{ row }">
      <BaseButton
        variant="ghost"
        size="sm"
        icon="fa-solid fa-download"
        :disabled="!row.downloadUrl"
        @click.stop="download(row.downloadUrl)"
      >
        PDF
      </BaseButton>
    </template>
  </BaseTable>
</template>

<style scoped lang="scss">
.bstmt__period {
  @include flex(row, flex-start, center, $sp-2);

  i {
    color: $primary;
    opacity: 0.75;
  }

  strong {
    font-size: $fs-sm;
    font-weight: 600;
    color: $primary-dark;
  }
}

.bstmt__amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: $primary-dark;
}
</style>
