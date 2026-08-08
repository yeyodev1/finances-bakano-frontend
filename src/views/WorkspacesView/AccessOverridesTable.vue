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
import { overrideDaysLeft, overrideExpiryLabel } from '@/composables/useAccessOverride'
import type { Client } from '@/types'

const props = withDefaults(
  defineProps<{ items: Client[]; loading?: boolean; unavailable?: boolean }>(),
  { loading: false, unavailable: false },
)

const emit = defineEmits<{ revoke: [client: Client]; open: [client: Client] }>()

const { isMobile } = useBreakpoint()
const { formatMoney, formatDateShort } = useFormat()

const rows = computed(() => props.items)

const columns = [
  { key: 'name', label: 'Cliente' },
  { key: 'reason', label: 'Motivo' },
  { key: 'grantedBy', label: 'Autorizado por' },
  { key: 'until', label: 'Vence' },
  { key: 'debt', label: 'Adeuda', align: 'right' },
  { key: 'actions', label: '', align: 'right' },
]

function expiry(client: Client): string {
  return overrideExpiryLabel(client.accessOverride)
}

function expiryTone(client: Client): 'danger' | 'warning' | 'info' {
  const days = overrideDaysLeft(client.accessOverride)
  if (days === null) return 'danger'
  return days <= 3 ? 'warning' : 'info'
}
</script>

<template>
  <div class="aot">
    <div v-if="loading" class="aot__skeleton">
      <BaseSkeleton v-for="n in 4" :key="n" height="62px" />
    </div>

    <BaseEmptyState
      v-else-if="unavailable"
      icon="fa-solid fa-plug-circle-xmark"
      title="Accesos por excepción no disponibles"
      message="El servicio todavía no responde a esta consulta. Vuelve a intentarlo en un momento."
    />

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-lock"
      title="Sin accesos por excepción"
      message="Ningún espacio moroso está abierto a propósito ahora mismo."
    />

    <TransitionGroup v-else-if="isMobile" name="list" tag="div" class="aot__cards">
      <article v-for="client in rows" :key="client._id" class="aot-card">
        <header class="aot-card__head">
          <BaseWorkspaceAvatar
            :src="client.workspaceImageUrl"
            :name="client.name"
            size="sm"
            status="override"
          />
          <div class="aot-card__id">
            <strong>{{ client.name }}</strong>
            <span v-if="client.workspaceName">{{ client.workspaceName }}</span>
          </div>
          <BaseBadge :variant="expiryTone(client)" size="sm">{{ expiry(client) }}</BaseBadge>
        </header>

        <p v-if="client.accessOverride?.reason" class="aot-card__reason">
          <i class="fa-solid fa-quote-left" aria-hidden="true" /> {{ client.accessOverride.reason }}
        </p>

        <ul class="aot-card__meta">
          <li v-if="client.accessOverride?.grantedByName">
            <i class="fa-solid fa-user-shield" aria-hidden="true" /> {{ client.accessOverride.grantedByName }}
          </li>
          <li v-if="client.accessOverride?.grantedAt">
            <i class="fa-solid fa-calendar-day" aria-hidden="true" />
            {{ formatDateShort(client.accessOverride.grantedAt) }}
          </li>
          <li>
            <i class="fa-solid fa-sack-dollar" aria-hidden="true" /> {{ formatMoney(client.overdueAmount ?? 0) }}
          </li>
          <li v-if="client.maxDaysOverdue">
            <i class="fa-solid fa-clock" aria-hidden="true" /> {{ client.maxDaysOverdue }} días
          </li>
        </ul>

        <footer class="aot-card__actions">
          <BaseButton size="sm" variant="danger" icon="fa-solid fa-lock" @click="emit('revoke', client)">
            Cerrar acceso
          </BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-eye" @click="emit('open', client)">
            Ver ficha
          </BaseButton>
        </footer>
      </article>
    </TransitionGroup>

    <BaseTable v-else :columns="columns" :rows="rows" row-key="_id">
      <template #cell-name="{ row }">
        <div class="aot__client">
          <BaseWorkspaceAvatar
            :src="(row as Client).workspaceImageUrl"
            :name="(row as Client).name"
            size="sm"
            status="override"
          />
          <div class="aot__client-id">
            <strong>{{ (row as Client).name }}</strong>
            <span v-if="(row as Client).workspaceName">{{ (row as Client).workspaceName }}</span>
          </div>
        </div>
      </template>

      <template #cell-reason="{ row }">
        <span class="aot__reason">{{ (row as Client).accessOverride?.reason || '—' }}</span>
      </template>

      <template #cell-grantedBy="{ row }">
        <span class="aot__by">{{ (row as Client).accessOverride?.grantedByName || '—' }}</span>
        <span class="aot__since">
          Desde {{ formatDateShort((row as Client).accessOverride?.grantedAt) }}
        </span>
      </template>

      <template #cell-until="{ row }">
        <BaseBadge :variant="expiryTone(row as Client)" size="sm">{{ expiry(row as Client) }}</BaseBadge>
      </template>

      <template #cell-debt="{ row }">
        <strong class="aot__debt">{{ formatMoney((row as Client).overdueAmount ?? 0) }}</strong>
        <span v-if="(row as Client).maxDaysOverdue" class="aot__days">
          {{ (row as Client).maxDaysOverdue }} días de mora
        </span>
      </template>

      <template #cell-actions="{ row }">
        <div class="aot__actions">
          <BaseButton size="sm" variant="danger" icon="fa-solid fa-lock" @click="emit('revoke', row as Client)">
            Cerrar acceso
          </BaseButton>
          <button type="button" title="Ver ficha" @click="emit('open', row as Client)">
            <i class="fa-solid fa-eye" aria-hidden="true" />
          </button>
        </div>
      </template>
    </BaseTable>
  </div>
</template>

<style scoped lang="scss">
.aot__skeleton,
.aot__cards {
  @include flex-col($sp-2);
}

.aot__client {
  @include flex(row, flex-start, center, $sp-3);
}

.aot__client-id {
  @include flex-col(2px);
  min-width: 0;

  strong {
    color: $primary-dark;
    @include truncate;
  }

  span {
    font-size: $fs-xs;
    color: $text-secondary;
    @include truncate;
  }
}

.aot__reason {
  display: block;
  max-width: 260px;
  font-size: $fs-xs;
  color: $text-secondary;
  @include truncate(2);
}

.aot__by {
  display: block;
  font-weight: 600;
  color: $primary-dark;
  font-size: $fs-sm;
}

.aot__since,
.aot__days {
  display: block;
  font-size: $fs-xs;
  color: $text-secondary;
}

.aot__debt {
  color: $alert-error;
}

.aot__actions {
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
  }
}

.aot-card {
  @include card($sp-4);
  @include flex-col($sp-3);
  border-left: 3px solid $alert-warning;
}

.aot-card__head {
  @include flex(row, flex-start, center, $sp-3);
}

.aot-card__id {
  @include flex-col(2px);
  flex: 1 1 auto;
  min-width: 0;

  strong {
    color: $primary-dark;
    @include truncate;
  }

  span {
    font-size: $fs-xs;
    color: $text-secondary;
    @include truncate;
  }
}

.aot-card__reason {
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.5;

  i {
    color: $alert-error;
    margin-right: $sp-1;
  }
}

.aot-card__meta {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  list-style: none;
  font-size: $fs-xs;
  color: $text-secondary;

  li {
    @include flex(row, flex-start, center, $sp-1);
  }

  i {
    color: $alert-warning;
  }
}

.aot-card__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  border-top: 1px solid $border-color;
  padding-top: $sp-3;
}
</style>
