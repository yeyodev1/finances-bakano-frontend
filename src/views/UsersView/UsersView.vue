<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseButton, BaseSearchInput, BaseSelect, BaseStatCard } from '@/components/base'
import UsersTable from './UsersTable.vue'
import UserFormModal from './UserFormModal.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/stores/clients'
import { ROLE_OPTIONS, useUsersStore } from '@/stores/users'
import type { SelectOption, User, UserRole } from '@/types'

const store = useUsersStore()
const toast = useToast()
const { confirm } = useConfirm()

const formOpen = ref(false)
const selected = ref<User | null>(null)

function onSearch(value: string) {
  store.filters.q = value
  load()
}

const roleOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: 'Todos los roles', icon: 'fa-solid fa-users' },
  ...ROLE_OPTIONS,
])

const role = computed<string | number | null>({
  get: () => store.filters.role ?? 'all',
  set: (value) => {
    store.filters.role = value === 'all' || value === null ? null : (value as UserRole)
    load()
  },
})

async function load() {
  try {
    await store.fetch()
  } catch (error) {
    toast.error('Error al cargar usuarios', apiErrorMessage(error))
  }
}

onMounted(load)

function openCreate() {
  selected.value = null
  formOpen.value = true
}

function openEdit(user: User) {
  selected.value = user
  formOpen.value = true
}

async function toggle(user: User) {
  const deactivating = user.isActive
  const ok = await confirm({
    title: deactivating ? 'Desactivar usuario' : 'Activar usuario',
    message: deactivating
      ? `${user.name} no podrá iniciar sesión hasta que lo vuelvas a activar.`
      : `${user.name} recuperará el acceso al sistema.`,
    confirmLabel: deactivating ? 'Desactivar' : 'Activar',
    variant: deactivating ? 'danger' : 'primary',
  })
  if (!ok) return

  try {
    await store.toggle(user._id, !user.isActive)
    toast.success(deactivating ? 'Usuario desactivado' : 'Usuario activado', user.name)
  } catch (error) {
    toast.error('No se pudo cambiar el estado', apiErrorMessage(error))
  }
}

async function remove(user: User) {
  const ok = await confirm({
    title: 'Eliminar usuario',
    message: `Se eliminará la cuenta de ${user.name} de forma permanente.`,
    confirmLabel: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return

  try {
    await store.remove(user._id)
    toast.success('Usuario eliminado', user.name)
  } catch (error) {
    toast.error('No se pudo eliminar el usuario', apiErrorMessage(error))
  }
}
</script>

<template>
  <div class="users">
    <header class="users__header">
      <div class="users__title">
        <h1><i class="fa-solid fa-user-shield" aria-hidden="true" /> Usuarios</h1>
        <p>{{ store.total }} cuentas registradas</p>
      </div>
      <BaseButton icon="fa-solid fa-user-plus" @click="openCreate">Nuevo usuario</BaseButton>
    </header>

    <div class="users__stats">
      <BaseStatCard label="Usuarios" :value="String(store.total)" icon="fa-solid fa-users" color="primary" />
      <BaseStatCard label="Activos" :value="String(store.activeCount)" icon="fa-solid fa-circle-check" color="success" />
      <BaseStatCard label="Con notificaciones" :value="String(store.notifiedCount)" icon="fa-solid fa-bell" color="info" />
    </div>

    <section class="users__filters">
      <BaseSearchInput
        :model-value="store.filters.q"
        placeholder="Buscar por nombre o email"
        @update:model-value="onSearch"
      />
      <BaseSelect v-model="role" :options="roleOptions" placeholder="Rol" />
    </section>

    <UsersTable
      :items="store.items"
      :loading="store.loading"
      @edit="openEdit"
      @toggle="toggle"
      @remove="remove"
      @create="openCreate"
    />

    <UserFormModal v-model="formOpen" :user="selected" @saved="load" />
  </div>
</template>

<style scoped lang="scss">
.users {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

.users__header {
  @include flex-col($sp-3);

  @include md {
    @include flex-between(flex-end, $sp-4);
  }
}

.users__title {
  h1 {
    @include flex(row, flex-start, center, $sp-3);
    font-size: $fs-xl;
    font-weight: 800;
    color: $primary-dark;

    i {
      color: $primary;
    }
  }

  p {
    font-size: $fs-xs;
    color: $text-secondary;
    margin-top: $sp-1;
  }
}

.users__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-3;

  @include lg {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.users__filters {
  @include flex-col($sp-3);
  @include card($sp-4);

  @include md {
    @include flex(row, flex-start, center, $sp-4);

    > * {
      flex: 1;
    }
  }
}
</style>
