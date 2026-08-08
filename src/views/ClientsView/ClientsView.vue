<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BaseButton } from '@/components/base'
import ClientsFilters from './ClientsFilters.vue'
import ClientsStats from './ClientsStats.vue'
import ClientsTable from './ClientsTable.vue'
import ClientFormModal from './ClientFormModal.vue'
import ClientWorkspaceModal from './ClientWorkspaceModal.vue'
import ClientArchiveModal from './ClientArchiveModal.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useUserStore } from '@/stores/user'
import type { Client } from '@/types'

const store = useClientsStore()
const userStore = useUserStore()
const router = useRouter()
const toast = useToast()
const { confirm } = useConfirm()

const formOpen = ref(false)
const workspaceOpen = ref(false)
const archiveOpen = ref(false)
const selected = ref<Client | null>(null)

const canPurge = computed(() => userStore.isSuperadmin)

async function load() {
  try {
    await store.fetch(1)
  } catch (error) {
    toast.error('Error al cargar clientes', apiErrorMessage(error))
  }
}

onMounted(async () => {
  await Promise.all([load(), store.fetchStats()])
})

function openCreate() {
  selected.value = null
  formOpen.value = true
}

function openEdit(client: Client) {
  selected.value = client
  formOpen.value = true
}

function openWorkspace(client: Client) {
  selected.value = client
  workspaceOpen.value = true
}

function view(client: Client) {
  router.push({ name: 'ClientDetail', params: { id: client._id } })
}

async function onSaved() {
  await store.fetchStats()
}

async function toggle(client: Client) {
  const deactivating = client.isActive
  const ok = await confirm({
    title: deactivating ? 'Desactivar cliente' : 'Activar cliente',
    message: deactivating
      ? `${client.name} dejará de generar cobros nuevos. Su espacio de trabajo puede desactivarse si tiene mora.`
      : `${client.name} volverá a generar cobros automáticamente.`,
    confirmLabel: deactivating ? 'Desactivar' : 'Activar',
    variant: deactivating ? 'danger' : 'primary',
  })
  if (!ok) return

  try {
    await store.toggle(client._id, !client.isActive)
    toast.success(deactivating ? 'Cliente desactivado' : 'Cliente activado', client.name)
    await store.fetchStats()
  } catch (error) {
    toast.error('No se pudo cambiar el estado', apiErrorMessage(error))
  }
}

function openArchive(client: Client) {
  selected.value = client
  archiveOpen.value = true
}

async function onArchived() {
  await Promise.all([load(), store.fetchStats()])
}

async function reactivate(client: Client) {
  const ok = await confirm({
    title: 'Reactivar cliente',
    message: `${client.name} volverá a la lista de clientes activos y generará cobros de nuevo.`,
    confirmLabel: 'Reactivar',
    variant: 'primary',
    icon: 'fa-solid fa-rotate-left',
  })
  if (!ok) return

  try {
    await store.reactivate(client._id)
    toast.success('Cliente reactivado', client.name)
    await Promise.all([load(), store.fetchStats()])
  } catch (error) {
    toast.error('No se pudo reactivar', apiErrorMessage(error))
  }
}

/** Borrado real: solo superadmin, doble confirmación y solo si nunca tuvo pagos. */
async function purge(client: Client) {
  const first = await confirm({
    title: 'Borrar cliente definitivamente',
    message:
      'Esto NO es dar de baja. El registro se elimina de la base de datos y solo funciona si el cliente nunca tuvo pagos registrados. Si tuvo pagos, el borrado será rechazado.',
    confirmLabel: 'Entiendo, continuar',
    variant: 'danger',
    icon: 'fa-solid fa-triangle-exclamation',
  })
  if (!first) return

  const second = await confirm({
    title: `¿Borrar "${client.name}"?`,
    message: 'Última confirmación. No hay forma de recuperar este registro.',
    confirmLabel: 'Borrar definitivamente',
    variant: 'danger',
    icon: 'fa-solid fa-trash',
  })
  if (!second) return

  try {
    await store.purge(client._id)
    toast.success('Cliente borrado', client.name)
    await store.fetchStats()
  } catch (error) {
    toast.error('No se pudo borrar', apiErrorMessage(error))
  }
}
</script>

<template>
  <div class="clients">
    <header class="clients__header">
      <div class="clients__title">
        <h1><i class="fa-solid fa-users" aria-hidden="true" /> Clientes</h1>
        <p>{{ store.total }} clientes registrados</p>
      </div>
      <BaseButton icon="fa-solid fa-plus" @click="openCreate">Nuevo cliente</BaseButton>
    </header>

    <ClientsStats />

    <ClientsFilters @change="load" />

    <ClientsTable
      :items="store.items"
      :loading="store.loading"
      :can-purge="canPurge"
      @view="view"
      @edit="openEdit"
      @link="openWorkspace"
      @toggle="toggle"
      @archive="openArchive"
      @reactivate="reactivate"
      @purge="purge"
      @create="openCreate"
    />

    <ClientFormModal v-model="formOpen" :client="selected" @saved="onSaved" />
    <ClientWorkspaceModal v-model="workspaceOpen" :client="selected" @saved="onSaved" />
    <ClientArchiveModal v-model="archiveOpen" :client="selected" @archived="onArchived" />
  </div>
</template>

<style scoped lang="scss">
.clients {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

.clients__header {
  @include flex-col($sp-3);

  @include md {
    @include flex-between(flex-end, $sp-4);
  }
}

.clients__title {
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
</style>
