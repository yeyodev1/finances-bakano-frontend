<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseButton, BaseWorkspaceAvatar } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { isOverrideActive } from '@/composables/useAccessOverride'
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS } from '@/stores/clients'
import { archiveReasonIcon, archiveReasonLabel, archiveReasonTone } from '@/config/archiveReasons'
import type { BadgeVariant } from '@/components/base'
import type { Client } from '@/types'

const props = withDefaults(
  defineProps<{ client: Client; canPurge?: boolean }>(),
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
}>()

const { formatMoney, formatDateShort, dayLabel } = useFormat()

const reasonVariant = computed(() => archiveReasonTone(props.client.archiveReason) as BadgeVariant)

const collectionText = computed(
  () => props.client.collectionDayLabel || dayLabel(props.client.collectionDay),
)

const overrideActive = computed(() => isOverrideActive(props.client.accessOverride))

const avatarStatus = computed<'active' | 'inactive' | 'override'>(() => {
  if (overrideActive.value) return 'override'
  return props.client.isActive ? 'active' : 'inactive'
})
</script>

<template>
  <article class="card" :class="{ 'card--archived': client.isArchived }" @click="emit('view', client)">
    <header class="card__head">
      <BaseWorkspaceAvatar
        :src="client.workspaceImageUrl"
        :name="client.name"
        size="md"
        :status="avatarStatus"
      />
      <div class="card__id">
        <h3 class="card__name">{{ client.name }}</h3>
        <p v-if="client.contactName" class="card__contact">
          <i class="fa-solid fa-user" aria-hidden="true" /> {{ client.contactName }}
        </p>
      </div>
      <BaseBadge
        v-if="client.isArchived"
        :variant="reasonVariant"
        :icon="archiveReasonIcon(client.archiveReason)"
      >
        {{ archiveReasonLabel(client.archiveReason) }}
      </BaseBadge>
      <BaseBadge v-else :variant="client.isActive ? 'success' : 'danger'">
        {{ client.isActive ? 'Activo' : 'Inactivo' }}
      </BaseBadge>
    </header>

    <p v-if="client.isArchived" class="card__archived">
      <i class="fa-solid fa-box-archive" aria-hidden="true" />
      Dado de baja el {{ formatDateShort(client.archivedAt) }}
    </p>

    <p class="card__amount">{{ formatMoney(client.amount) }}</p>

    <ul class="card__meta">
      <li><i class="fa-solid fa-file-export" aria-hidden="true" /> Emisión: {{ dayLabel(client.issueDay) }}</li>
      <li><i class="fa-solid fa-hand-holding-dollar" aria-hidden="true" /> Cobro: {{ collectionText }}</li>
      <li>
        <i :class="PAYMENT_METHOD_ICONS[client.paymentMethod]" aria-hidden="true" />
        {{ PAYMENT_METHOD_LABELS[client.paymentMethod] }}
      </li>
      <li>
        <i class="fa-solid fa-layer-group" aria-hidden="true" />
        {{ client.workspaceName || 'Sin espacio' }}
      </li>
    </ul>

    <footer class="card__actions" @click.stop>
      <BaseButton size="sm" variant="ghost" icon="fa-solid fa-eye" @click="emit('view', client)">Ficha</BaseButton>
      <BaseButton size="sm" variant="ghost" icon="fa-solid fa-pen" @click="emit('edit', client)">Editar</BaseButton>
      <BaseButton size="sm" variant="ghost" icon="fa-solid fa-link" @click="emit('link', client)">Espacio</BaseButton>
      <BaseButton
        v-if="!client.isArchived"
        size="sm"
        :variant="client.isActive ? 'ghost' : 'success'"
        :icon="client.isActive ? 'fa-solid fa-toggle-off' : 'fa-solid fa-toggle-on'"
        @click="emit('toggle', client)"
      >
        {{ client.isActive ? 'Desactivar' : 'Activar' }}
      </BaseButton>
      <BaseButton
        v-if="client.isArchived"
        size="sm"
        variant="success"
        icon="fa-solid fa-rotate-left"
        @click="emit('reactivate', client)"
      >
        Reactivar
      </BaseButton>
      <BaseButton
        v-else
        size="sm"
        variant="ghost"
        icon="fa-solid fa-box-archive"
        class="danger-action"
        @click="emit('archive', client)"
      >
        Dar de baja
      </BaseButton>
      <BaseButton
        v-if="canPurge"
        size="sm"
        variant="ghost"
        icon="fa-solid fa-trash"
        class="danger-action"
        @click="emit('purge', client)"
      >
        Borrar
      </BaseButton>
    </footer>
  </article>
</template>

<style scoped lang="scss">
.card {
  @include card($sp-4);
  @include card-hover;
  @include flex-col($sp-3);
  cursor: pointer;
  transition: opacity $transition-base, filter $transition-base;

  &--archived {
    opacity: 0.62;
    filter: grayscale(0.35);

    &:hover {
      opacity: 1;
      filter: none;
    }
  }
}

.card__head {
  @include flex(row, flex-start, flex-start, $sp-3);
}

.card__id {
  flex: 1 1 auto;
  min-width: 0;
}

.card__name {
  font-size: $fs-md;
  font-weight: 700;
  color: $primary-dark;
}

.card__contact {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-top: $sp-1;
}

.card__archived {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 600;
  color: $alert-error;
}

.card__amount {
  font-size: $fs-xl;
  font-weight: 800;
  color: $primary;
}

.card__meta {
  @include flex-col($sp-2);
  list-style: none;
  font-size: $fs-xs;
  color: $text-secondary;

  i {
    width: 16px;
    color: $secondary;
  }
}

.card__actions {
  @include flex(row, flex-start, center, $sp-1);
  flex-wrap: wrap;
  border-top: 1px solid $border-color;
  padding-top: $sp-2;
}

.danger-action {
  color: $alert-error;
}
</style>
