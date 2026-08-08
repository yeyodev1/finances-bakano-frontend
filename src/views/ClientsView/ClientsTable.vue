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
import ClientMobileCard from './ClientMobileCard.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useFormat } from '@/composables/useFormat'
import { isOverrideActive } from '@/composables/useAccessOverride'
import { BILLING_TYPE_LABELS, PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS } from '@/stores/clients'
import { archiveReasonIcon, archiveReasonLabel, archiveReasonTone } from '@/config/archiveReasons'
import type { BadgeVariant } from '@/components/base'
import type { Client } from '@/types'

const props = withDefaults(
  defineProps<{
    items: Client[]
    loading: boolean
    canPurge?: boolean
  }>(),
  { canPurge: false },
)

const emit = defineEmits<{
  view: [client: Client]
  edit: [client: Client]
  toggle: [client: Client]
  archive: [client: Client]
  reactivate: [client: Client]
  purge: [client: Client]
  link: [client: Client]
  create: []
}>()

const { isMobile } = useBreakpoint()
const { formatMoney, formatDateShort, dayLabel } = useFormat()

function reasonVariant(client: Client): BadgeVariant {
  return archiveReasonTone(client.archiveReason) as BadgeVariant
}

function avatarStatus(client: Client): 'active' | 'inactive' | 'override' {
  if (isOverrideActive(client.accessOverride)) return 'override'
  return client.isActive ? 'active' : 'inactive'
}

function rowClass(row: unknown): string {
  return (row as Client).isArchived ? 'row--archived' : ''
}

const columns = [
  { key: 'name', label: 'Cliente' },
  { key: 'amount', label: 'Monto', align: 'right' },
  { key: 'issueDay', label: 'Emisión' },
  { key: 'collectionDay', label: 'Cobro' },
  { key: 'paymentMethod', label: 'Método' },
  { key: 'workspace', label: 'Espacio' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: '', align: 'right' },
]

const rows = computed(() => props.items)

function collectionText(client: Client): string {
  if (client.collectionDayLabel) return client.collectionDayLabel
  return dayLabel(client.collectionDay)
}
</script>

<template>
  <div class="clients-table">
    <div v-if="loading" class="clients-table__skeleton">
      <BaseSkeleton v-for="n in 6" :key="n" height="62px" />
    </div>

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-users-slash"
      title="Sin clientes"
      message="No hay clientes que coincidan con los filtros aplicados."
    >
      <template #action>
        <BaseButton icon="fa-solid fa-plus" @click="emit('create')">Nuevo cliente</BaseButton>
      </template>
    </BaseEmptyState>

    <TransitionGroup v-else-if="isMobile" name="list" tag="div" class="cards">
      <ClientMobileCard
        v-for="client in rows"
        :key="client._id"
        :client="client"
        :can-purge="canPurge"
        @view="emit('view', $event)"
        @edit="emit('edit', $event)"
        @link="emit('link', $event)"
        @toggle="emit('toggle', $event)"
        @archive="emit('archive', $event)"
        @reactivate="emit('reactivate', $event)"
        @purge="emit('purge', $event)"
      />
    </TransitionGroup>

    <BaseTable v-else :columns="columns" :rows="rows" row-key="_id" :row-class="rowClass">
      <template #cell-name="{ row }">
        <button type="button" class="link-name" @click="emit('view', row as Client)">
          <BaseWorkspaceAvatar
            :src="(row as Client).workspaceImageUrl"
            :name="(row as Client).name"
            size="sm"
            :status="avatarStatus(row as Client)"
          />
          <span class="link-name__id">
            <span class="link-name__text">{{ (row as Client).name }}</span>
            <span v-if="(row as Client).contactEmail" class="link-name__sub">
              {{ (row as Client).contactEmail }}
            </span>
          </span>
        </button>
      </template>

      <template #cell-amount="{ row }">
        <strong class="amount">{{ formatMoney((row as Client).amount) }}</strong>
        <span v-if="(row as Client).splits?.length" class="splits">
          <i class="fa-solid fa-scissors" aria-hidden="true" /> {{ (row as Client).splits.length }} partes
        </span>
      </template>

      <template #cell-issueDay="{ row }">{{ dayLabel((row as Client).issueDay) }}</template>

      <template #cell-collectionDay="{ row }">{{ collectionText(row as Client) }}</template>

      <template #cell-paymentMethod="{ row }">
        <span class="method">
          <i :class="PAYMENT_METHOD_ICONS[(row as Client).paymentMethod]" aria-hidden="true" />
          {{ PAYMENT_METHOD_LABELS[(row as Client).paymentMethod] }}
        </span>
        <span class="billing">{{ BILLING_TYPE_LABELS[(row as Client).billingType] }}</span>
      </template>

      <template #cell-workspace="{ row }">
        <BaseBadge v-if="(row as Client).workspaceId" :variant="(row as Client).workspaceIsActive === false ? 'warning' : 'info'" icon="fa-solid fa-layer-group">
          {{ (row as Client).workspaceName }}
        </BaseBadge>
        <span v-else class="muted"><i class="fa-solid fa-link-slash" aria-hidden="true" /> Sin vincular</span>
      </template>

      <template #cell-status="{ row }">
        <BaseBadge
          v-if="(row as Client).isArchived"
          :variant="reasonVariant(row as Client)"
          :icon="archiveReasonIcon((row as Client).archiveReason)"
        >
          {{ archiveReasonLabel((row as Client).archiveReason) }}
        </BaseBadge>
        <BaseBadge v-else :variant="(row as Client).isActive ? 'success' : 'danger'">
          {{ (row as Client).isActive ? 'Activo' : 'Inactivo' }}
        </BaseBadge>
        <span v-if="(row as Client).isArchived" class="archived-at">
          Baja: {{ formatDateShort((row as Client).archivedAt) }}
        </span>
      </template>

      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button type="button" title="Ver ficha" @click="emit('view', row as Client)">
            <i class="fa-solid fa-eye" aria-hidden="true" />
          </button>
          <button type="button" title="Editar" @click="emit('edit', row as Client)">
            <i class="fa-solid fa-pen" aria-hidden="true" />
          </button>
          <button type="button" title="Vincular espacio" @click="emit('link', row as Client)">
            <i class="fa-solid fa-link" aria-hidden="true" />
          </button>
          <button
            v-if="!(row as Client).isArchived"
            type="button"
            :title="(row as Client).isActive ? 'Desactivar' : 'Activar'"
            @click="emit('toggle', row as Client)"
          >
            <i :class="(row as Client).isActive ? 'fa-solid fa-toggle-off' : 'fa-solid fa-toggle-on'" aria-hidden="true" />
          </button>
          <button
            v-if="(row as Client).isArchived"
            type="button"
            class="success"
            title="Reactivar cliente"
            @click="emit('reactivate', row as Client)"
          >
            <i class="fa-solid fa-rotate-left" aria-hidden="true" />
          </button>
          <button
            v-else
            type="button"
            class="danger"
            title="Dar de baja"
            @click="emit('archive', row as Client)"
          >
            <i class="fa-solid fa-box-archive" aria-hidden="true" />
          </button>
          <button
            v-if="canPurge"
            type="button"
            class="danger"
            title="Borrar definitivamente (solo superadmin)"
            @click="emit('purge', row as Client)"
          >
            <i class="fa-solid fa-trash" aria-hidden="true" />
          </button>
        </div>
      </template>
    </BaseTable>
  </div>
</template>

<style scoped lang="scss">
.clients-table__skeleton {
  @include flex-col($sp-2);
}

.cards {
  @include flex-col($sp-3);
}

.archived-at {
  display: block;
  margin-top: 2px;
  font-size: $fs-xs;
  color: $text-secondary;
}

:deep(.row--archived) {
  opacity: 0.6;
  filter: grayscale(0.35);
  transition: opacity $transition-base, filter $transition-base;

  &:hover {
    opacity: 1;
    filter: none;
  }
}

.link-name {
  @include flex(row, flex-start, center, $sp-3);
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
  padding: 0;

  &:hover .link-name__text {
    color: $primary;
  }
}

.link-name__id {
  @include flex-col(2px);
  min-width: 0;
}

.link-name__text {
  font-weight: 700;
  color: $primary-dark;
  transition: color $transition-base;
}

.link-name__sub {
  font-size: $fs-xs;
  color: $text-secondary;
}

.amount {
  font-weight: 700;
  color: $primary-dark;
}

.splits {
  display: block;
  font-size: $fs-xs;
  color: $text-secondary;
}

.method {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-sm;

  i {
    color: $secondary;
  }
}

.billing {
  font-size: $fs-xs;
  color: $text-secondary;
}

.muted {
  font-size: $fs-xs;
  color: $text-secondary;
}

.row-actions {
  @include flex(row, flex-end, center, $sp-1);

  button {
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

    &.success:hover {
      background: $alert-success-bg;
      color: $alert-success;
    }

    &:focus-visible {
      @include focus-ring;
    }
  }
}
</style>
