<script setup lang="ts">
import { computed } from 'vue'
import { BaseAvatar, BaseBadge, BaseButton, BaseEmptyState, BaseSkeleton, BaseTable } from '@/components/base'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useFormat } from '@/composables/useFormat'
import { ROLE_ICONS, ROLE_LABELS } from '@/stores/users'
import type { User } from '@/types'

const props = defineProps<{ items: User[]; loading: boolean }>()

const emit = defineEmits<{
  edit: [user: User]
  toggle: [user: User]
  remove: [user: User]
  create: []
}>()

const { isMobile } = useBreakpoint()
const { formatDateTime } = useFormat()

const columns = [
  { key: 'name', label: 'Usuario' },
  { key: 'role', label: 'Rol' },
  { key: 'notifications', label: 'Notificaciones' },
  { key: 'lastLoginAt', label: 'Último acceso' },
  { key: 'status', label: 'Estado' },
  { key: 'actions', label: '', align: 'right' },
]

const rows = computed(() => props.items)
</script>

<template>
  <div class="users-table">
    <div v-if="loading" class="users-table__skeleton">
      <BaseSkeleton v-for="n in 5" :key="n" height="62px" />
    </div>

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-user-slash"
      title="Sin usuarios"
      message="Todavía no hay usuarios registrados en el sistema."
    >
      <template #action>
        <BaseButton icon="fa-solid fa-user-plus" @click="emit('create')">Nuevo usuario</BaseButton>
      </template>
    </BaseEmptyState>

    <TransitionGroup v-else-if="isMobile" name="list" tag="div" class="cards">
      <article v-for="user in rows" :key="user._id" class="card">
        <header class="card__head">
          <BaseAvatar :name="user.name" :src="user.photoUrl" />
          <div class="card__id">
            <h3>{{ user.name }}</h3>
            <p>{{ user.email }}</p>
          </div>
          <BaseBadge :variant="user.isActive ? 'success' : 'danger'">
            {{ user.isActive ? 'Activo' : 'Inactivo' }}
          </BaseBadge>
        </header>

        <ul class="card__meta">
          <li><i :class="ROLE_ICONS[user.role]" aria-hidden="true" /> {{ ROLE_LABELS[user.role] }}</li>
          <li>
            <i class="fa-solid fa-envelope" aria-hidden="true" />
            {{ user.receivesNotifications ? 'Recibe notificaciones' : 'Sin notificaciones' }}
          </li>
          <li><i class="fa-solid fa-clock" aria-hidden="true" /> {{ formatDateTime(user.lastLoginAt) }}</li>
        </ul>

        <footer class="card__actions">
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-pen" @click="emit('edit', user)">Editar</BaseButton>
          <BaseButton
            size="sm"
            variant="ghost"
            :icon="user.isActive ? 'fa-solid fa-toggle-off' : 'fa-solid fa-toggle-on'"
            @click="emit('toggle', user)"
          >
            {{ user.isActive ? 'Desactivar' : 'Activar' }}
          </BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-trash" @click="emit('remove', user)">
            Eliminar
          </BaseButton>
        </footer>
      </article>
    </TransitionGroup>

    <BaseTable v-else :columns="columns" :rows="rows" row-key="_id">
      <template #cell-name="{ row }">
        <div class="user">
          <BaseAvatar :name="(row as User).name" :src="(row as User).photoUrl" size="sm" />
          <div>
            <span class="user__name">{{ (row as User).name }}</span>
            <span class="user__email">{{ (row as User).email }}</span>
          </div>
        </div>
      </template>

      <template #cell-role="{ row }">
        <BaseBadge variant="info" :icon="ROLE_ICONS[(row as User).role]">
          {{ ROLE_LABELS[(row as User).role] }}
        </BaseBadge>
      </template>

      <template #cell-notifications="{ row }">
        <i
          :class="(row as User).receivesNotifications ? 'fa-solid fa-bell on' : 'fa-solid fa-bell-slash off'"
          aria-hidden="true"
        />
      </template>

      <template #cell-lastLoginAt="{ row }">{{ formatDateTime((row as User).lastLoginAt) }}</template>

      <template #cell-status="{ row }">
        <BaseBadge :variant="(row as User).isActive ? 'success' : 'danger'">
          {{ (row as User).isActive ? 'Activo' : 'Inactivo' }}
        </BaseBadge>
      </template>

      <template #cell-actions="{ row }">
        <div class="row-actions">
          <button type="button" title="Editar" @click="emit('edit', row as User)">
            <i class="fa-solid fa-pen" aria-hidden="true" />
          </button>
          <button
            type="button"
            :title="(row as User).isActive ? 'Desactivar' : 'Activar'"
            @click="emit('toggle', row as User)"
          >
            <i :class="(row as User).isActive ? 'fa-solid fa-toggle-off' : 'fa-solid fa-toggle-on'" aria-hidden="true" />
          </button>
          <button type="button" class="danger" title="Eliminar" @click="emit('remove', row as User)">
            <i class="fa-solid fa-trash" aria-hidden="true" />
          </button>
        </div>
      </template>
    </BaseTable>
  </div>
</template>

<style scoped lang="scss">
.users-table__skeleton,
.cards {
  @include flex-col($sp-2);
}

.card {
  @include card($sp-4);
  @include flex-col($sp-3);
}

.card__head {
  @include flex(row, flex-start, center, $sp-3);
}

.card__id {
  flex: 1;
  min-width: 0;

  h3 {
    font-weight: 700;
    color: $primary-dark;
    @include truncate;
  }

  p {
    font-size: $fs-xs;
    color: $text-secondary;
    @include truncate;
  }
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

.user {
  @include flex(row, flex-start, center, $sp-3);
}

.user__name {
  display: block;
  font-weight: 700;
  color: $primary-dark;
}

.user__email {
  font-size: $fs-xs;
  color: $text-secondary;
}

.on {
  color: $alert-success;
}

.off {
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
  }
}
</style>
