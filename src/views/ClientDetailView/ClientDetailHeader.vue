<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseButton, BaseWorkspaceAvatar } from '@/components/base'
import { AccessOverrideBanner } from '@/components/access'
import { useFormat } from '@/composables/useFormat'
import { isOverrideActive } from '@/composables/useAccessOverride'
import { PAYMENT_METHOD_ICONS, PAYMENT_METHOD_LABELS } from '@/stores/clients'
import {
  archiveReasonIcon,
  archiveReasonLabel,
  archiveReasonTone,
  daysSince,
  lifetimeLabel,
} from '@/config/archiveReasons'
import type { BadgeVariant } from '@/components/base'
import type { Client } from '@/types'

const props = defineProps<{ client: Client }>()

const emit = defineEmits<{
  edit: []
  toggle: []
  link: []
  backfill: []
  archive: []
  reactivate: []
  back: []
  grant: []
  revoke: []
}>()

const { formatMoney, formatDate, dayLabel } = useFormat()

const lifetimeDays = computed(
  () => Number(props.client.lifetimeDays ?? 0) || daysSince(props.client.startDate),
)

const reasonVariant = computed(
  () => archiveReasonTone(props.client.archiveReason) as BadgeVariant,
)

const overrideActive = computed(() => isOverrideActive(props.client.accessOverride))

const canGrant = computed(
  () => Boolean(props.client.workspaceId && props.client.shouldBeClosed) && !overrideActive.value,
)

const avatarStatus = computed<'active' | 'inactive' | 'override'>(() => {
  if (overrideActive.value) return 'override'
  return props.client.isActive ? 'active' : 'inactive'
})
</script>

<template>
  <header class="head">
    <button type="button" class="head__back" @click="emit('back')">
      <i class="fa-solid fa-arrow-left" aria-hidden="true" /> Volver a clientes
    </button>

    <AccessOverrideBanner
      :override="client.accessOverride"
      :overdue-amount="client.overdueAmount"
      :max-days-overdue="client.maxDaysOverdue"
      @revoke="emit('revoke')"
    />

    <div class="head__main">
      <BaseWorkspaceAvatar
        :src="client.workspaceImageUrl"
        :name="client.name"
        size="xl"
        rounded="square"
        :status="avatarStatus"
      />

      <div class="head__id">
        <h1>{{ client.name }}</h1>
        <p v-if="client.legalName" class="head__legal">{{ client.legalName }}</p>

        <div class="head__badges">
          <BaseBadge
            v-if="client.isArchived"
            :variant="reasonVariant"
            :icon="archiveReasonIcon(client.archiveReason)"
          >
            Baja: {{ archiveReasonLabel(client.archiveReason) }}
          </BaseBadge>
          <BaseBadge v-else :variant="client.isActive ? 'success' : 'danger'" icon="fa-solid fa-circle">
            {{ client.isActive ? 'Cliente activo' : 'Cliente inactivo' }}
          </BaseBadge>
          <BaseBadge v-if="client.workspaceId" :variant="client.workspaceIsActive === false ? 'warning' : 'info'" icon="fa-solid fa-layer-group">
            {{ client.workspaceName }} · {{ client.workspaceIsActive === false ? 'espacio inactivo' : 'espacio activo' }}
          </BaseBadge>
          <BaseBadge v-else variant="neutral" icon="fa-solid fa-link-slash">Sin espacio vinculado</BaseBadge>
          <BaseBadge
            v-if="client.shouldBeClosed && !overrideActive"
            variant="danger"
            icon="fa-solid fa-triangle-exclamation"
            pulse
          >
            Debería estar cerrado
          </BaseBadge>
        </div>

        <div class="head__lifetime">
          <div class="lifetime">
            <span class="lifetime__label">Duración como cliente</span>
            <span class="lifetime__value">{{ lifetimeLabel(lifetimeDays) }}</span>
          </div>
          <div class="lifetime">
            <span class="lifetime__label">Total cobrado histórico</span>
            <span class="lifetime__value lifetime__value--money">
              {{ formatMoney(client.lifetimeRevenue ?? 0) }}
            </span>
          </div>
          <div v-if="client.isArchived" class="lifetime">
            <span class="lifetime__label">Fecha de baja</span>
            <span class="lifetime__value lifetime__value--loss">{{ formatDate(client.archivedAt) }}</span>
          </div>
        </div>
      </div>

      <div class="head__amount">
        <span class="head__amount-value">{{ formatMoney(client.amount) }}</span>
        <span class="head__amount-label">
          <i :class="PAYMENT_METHOD_ICONS[client.paymentMethod]" aria-hidden="true" />
          {{ PAYMENT_METHOD_LABELS[client.paymentMethod] }}
        </span>
        <span class="head__amount-label">
          <i class="fa-solid fa-calendar-day" aria-hidden="true" />
          {{ client.collectionDayLabel || dayLabel(client.collectionDay) }}
        </span>
        <span class="head__amount-label">
          <i class="fa-solid fa-flag" aria-hidden="true" /> Desde {{ formatDate(client.startDate) }}
        </span>
      </div>
    </div>

    <p v-if="client.isArchived && client.archiveNotes" class="head__archive-notes">
      <i class="fa-solid fa-quote-left" aria-hidden="true" /> {{ client.archiveNotes }}
    </p>

    <div class="head__actions">
      <BaseButton size="sm" icon="fa-solid fa-pen" @click="emit('edit')">Editar</BaseButton>
      <BaseButton
        v-if="!client.isArchived"
        size="sm"
        :variant="client.isActive ? 'outline' : 'success'"
        :icon="client.isActive ? 'fa-solid fa-toggle-off' : 'fa-solid fa-toggle-on'"
        @click="emit('toggle')"
      >
        {{ client.isActive ? 'Desactivar' : 'Activar' }}
      </BaseButton>
      <BaseButton size="sm" variant="outline" icon="fa-solid fa-link" @click="emit('link')">Vincular espacio</BaseButton>
      <BaseButton
        v-if="canGrant"
        size="sm"
        variant="danger"
        icon="fa-solid fa-unlock-keyhole"
        @click="emit('grant')"
      >
        Abrir por excepción
      </BaseButton>
      <BaseButton size="sm" variant="ghost" icon="fa-solid fa-clock-rotate-left" @click="emit('backfill')">
        Generar retroactivos
      </BaseButton>
      <BaseButton
        v-if="client.isArchived"
        size="sm"
        variant="success"
        icon="fa-solid fa-rotate-left"
        @click="emit('reactivate')"
      >
        Reactivar cliente
      </BaseButton>
      <BaseButton v-else size="sm" variant="danger" icon="fa-solid fa-box-archive" @click="emit('archive')">
        Dar de baja
      </BaseButton>
    </div>
  </header>
</template>

<style scoped lang="scss">
.head {
  @include card($sp-5);
  @include flex-col($sp-4);
}

.head__back {
  @include flex(row, flex-start, center, $sp-2);
  align-self: flex-start;
  border: none;
  background: none;
  color: $text-secondary;
  font-size: $fs-xs;
  font-weight: 600;
  cursor: pointer;
  transition: color $transition-base, transform $transition-base;

  &:hover {
    color: $primary;
    transform: translateX(-2px);
  }
}

.head__main {
  @include flex-col($sp-4);

  @include lg {
    @include flex(row, flex-start, center, $sp-5);
  }
}

.head__id {
  @include flex-col($sp-2);
  flex: 1;
  min-width: 0;

  h1 {
    font-size: $fs-xl;
    font-weight: 800;
    color: $primary-dark;
  }
}

.head__legal {
  font-size: $fs-xs;
  color: $text-secondary;
}

.head__badges {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.head__lifetime {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
  margin-top: $sp-1;
}

.lifetime {
  @include flex-col(2px);
  padding: $sp-2 $sp-3;
  border-radius: $radius-sm;
  background: $surface-alt;
  border: 1px solid $border-color;
  flex: 1 1 auto;
  min-width: 160px;
}

.lifetime__label {
  @include label-text;
}

.lifetime__value {
  font-size: $fs-sm;
  font-weight: 800;
  color: $primary-dark;

  &--money {
    color: $alert-success;
  }

  &--loss {
    color: $alert-error;
  }
}

.head__archive-notes {
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: $alert-error-bg;
  border-left: 3px solid $alert-error;
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.55;
  white-space: pre-line;

  i {
    color: $alert-error;
    margin-right: $sp-2;
  }
}

.head__amount {
  @include flex-col($sp-1);
  padding: $sp-3 $sp-4;
  border-radius: $radius-md;
  background: rgba($primary, 0.06);
  border: 1px solid rgba($primary, 0.18);
}

.head__amount-value {
  font-size: $fs-2xl;
  font-weight: 800;
  color: $primary;
  line-height: 1.1;
}

.head__amount-label {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  color: $text-secondary;

  i {
    width: 14px;
    color: $secondary;
  }
}

.head__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  border-top: 1px solid $border-color;
  padding-top: $sp-4;
}
</style>
