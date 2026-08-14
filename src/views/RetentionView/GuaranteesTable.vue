<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BaseBadge, BaseButton, BaseEmptyState, BaseTable } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import {
  guaranteeStatusIcon,
  guaranteeStatusLabel,
  guaranteeStatusShort,
  guaranteeStatusTone,
  isGuaranteeOpen,
  periodChip,
} from '@/config/retention'
import type { BadgeVariant, TableColumn } from '@/components/base'
import type { Guarantee } from '@/types'

const props = withDefaults(
  defineProps<{ rows?: Guarantee[]; loading?: boolean }>(),
  { rows: () => [], loading: false },
)

const emit = defineEmits<{ extend: [row: Guarantee]; close: [row: Guarantee] }>()

const router = useRouter()
const { formatMoney, formatDateShort } = useFormat()

const columns: TableColumn[] = [
  { key: 'clientName', label: 'Cliente', sortable: true },
  { key: 'status', label: 'Estado' },
  { key: 'months', label: 'Meses regalados' },
  { key: 'waived', label: 'Sin cobrar', align: 'right' },
  { key: 'openedAt', label: 'Desde', align: 'right', hideOnMobile: true },
  { key: 'actions', label: '', align: 'right' },
]

const rows = computed(() =>
  [...props.rows].sort((a, b) => {
    // Las abiertas primero: son las que exigen una decisión.
    const openDiff = Number(isGuaranteeOpen(b.status)) - Number(isGuaranteeOpen(a.status))
    if (openDiff) return openDiff
    return new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime()
  }),
)

function waivedOf(row: Guarantee): number {
  return row.cycles.reduce((total, cycle) => total + Number(cycle.waivedAmount || 0), 0)
}

function periodsOf(row: Guarantee): string {
  if (!row.cycles.length) return '—'
  return row.cycles.map((cycle) => periodChip(cycle.period)).join(' · ')
}

function toneOf(row: Guarantee): BadgeVariant {
  return guaranteeStatusTone(row.status) as BadgeVariant
}

function canExtend(row: Guarantee): boolean {
  return isGuaranteeOpen(row.status) && row.cycles.length < row.maxCycles
}

function clientIdOf(row: Guarantee): string {
  return typeof row.clientId === 'string' ? row.clientId : (row.clientId?._id ?? '')
}

function openClient(row: Guarantee) {
  const id = clientIdOf(row)
  if (id) router.push({ name: 'ClientDetail', params: { id } })
}

function rowClass(row: Guarantee): string {
  return isGuaranteeOpen(row.status) ? '' : 'guarantees__row--closed'
}
</script>

<template>
  <BaseTable
    :columns="columns"
    :rows="rows"
    :loading="loading"
    row-key="_id"
    :row-class="rowClass"
    empty-icon="fa-solid fa-shield-halved"
    empty-text="Ninguna garantía registrada"
  >
    <template #cell-clientName="{ row }">
      <button type="button" class="guarantees__client" @click.stop="openClient(row)">
        <span class="guarantees__name">{{ row.clientName }}</span>
        <span class="guarantees__trigger">
          Sin resultados en {{ periodChip(row.triggerPeriod) }}
        </span>
      </button>
    </template>

    <template #cell-status="{ row }">
      <BaseBadge
        :variant="toneOf(row)"
        :icon="guaranteeStatusIcon(row.status)"
        :label="guaranteeStatusShort(row.status)"
        :title="guaranteeStatusLabel(row.status)"
      />
    </template>

    <template #cell-months="{ row }">
      <span class="guarantees__periods">
        {{ periodsOf(row) }}
        <span class="guarantees__cycles">{{ row.cycles.length }}/{{ row.maxCycles }}</span>
      </span>
    </template>

    <template #cell-waived="{ row }">
      <span class="guarantees__waived">-{{ formatMoney(waivedOf(row)) }}</span>
    </template>

    <template #cell-openedAt="{ row }">
      {{ formatDateShort(row.openedAt) }}
    </template>

    <template #cell-actions="{ row }">
      <div class="guarantees__actions">
        <BaseButton
          v-if="canExtend(row)"
          size="sm"
          variant="outline"
          icon="fa-solid fa-hourglass-half"
          @click.stop="emit('extend', row)"
        >
          Extender
        </BaseButton>
        <BaseButton
          v-if="isGuaranteeOpen(row.status)"
          size="sm"
          variant="primary"
          icon="fa-solid fa-flag-checkered"
          @click.stop="emit('close', row)"
        >
          Cerrar
        </BaseButton>
        <span v-else class="guarantees__closed">
          <i class="fa-solid fa-lock" aria-hidden="true" />
          Cerrada {{ formatDateShort(row.closedAt) }}
        </span>
      </div>
    </template>

    <template #empty>
      <BaseEmptyState
        icon="fa-solid fa-shield-halved"
        title="Ninguna garantía abierta"
        message="Cuando un cliente no vea resultados, ábrele el mes de garantía desde aquí."
      />
    </template>
  </BaseTable>
</template>

<style scoped lang="scss">
.guarantees__client {
  @include flex-col(2px);
  align-items: flex-start;
  background: none;
  border: 0;
  padding: 0;
  text-align: left;
  cursor: pointer;

  &:hover .guarantees__name {
    color: $primary;
    text-decoration: underline;
  }
}

.guarantees__name {
  font-weight: 700;
  color: $primary-dark;
  transition: color $transition-fast;
}

.guarantees__trigger {
  font-size: $fs-xs;
  color: $text-secondary;
}

.guarantees__periods {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  font-size: $fs-xs;
  color: $text-secondary;
}

.guarantees__cycles {
  padding: 1px $sp-2;
  border-radius: $radius-full;
  border: 1px solid $border-color;
  font-weight: 700;
  color: $primary-dark;
}

.guarantees__waived {
  font-weight: 700;
  color: $alert-warning;
}

.guarantees__actions {
  @include flex(row, flex-end, center, $sp-2);
  flex-wrap: wrap;
}

.guarantees__closed {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;
}

// Lo cerrado se atenúa, pero sigue legible: el histórico se consulta.
:deep(.guarantees__row--closed) {
  opacity: 0.72;
}
</style>
