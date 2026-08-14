<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { BaseEmptyState, BaseSkeleton, BaseTabs } from '@/components/base'
import ClientDetailHeader from './ClientDetailHeader.vue'
import ClientInvoicesTab from './ClientInvoicesTab.vue'
import ClientPaymentsTab from './ClientPaymentsTab.vue'
import ClientInfoTab from './ClientInfoTab.vue'
import ClientLifecycleTab from './ClientLifecycleTab.vue'
import ClientReactivateModal from './ClientReactivateModal.vue'
import ClientBackfillModal from './ClientBackfillModal.vue'
import ClientFormModal from '../ClientsView/ClientFormModal.vue'
import ClientWorkspaceModal from '../ClientsView/ClientWorkspaceModal.vue'
import ClientArchiveModal from '../ClientsView/ClientArchiveModal.vue'
import AccessGrantModal from '../WorkspacesView/AccessGrantModal.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useWorkspacesStore } from '@/stores/workspaces'

const route = useRoute()
const router = useRouter()
const store = useClientsStore()
const workspaces = useWorkspacesStore()
const toast = useToast()
const { confirm } = useConfirm()

const clientId = computed(() => String(route.params.id || ''))
const client = computed(() => store.current)

const tab = ref('invoices')
const formOpen = ref(false)
const workspaceOpen = ref(false)
const backfillOpen = ref(false)
const archiveOpen = ref(false)
const reactivateOpen = ref(false)
const grantOpen = ref(false)
const notFound = ref(false)

const tabs = computed(() => [
  { value: 'invoices', label: 'Cobros', icon: 'fa-solid fa-file-invoice-dollar' },
  { value: 'payments', label: 'Pagos', icon: 'fa-solid fa-receipt' },
  {
    value: 'lifecycle',
    label: 'Historial',
    icon: 'fa-solid fa-timeline',
    badge: client.value?.lifecycleHistory?.length || undefined,
  },
  { value: 'info', label: 'Información', icon: 'fa-solid fa-circle-info' },
])

async function load() {
  notFound.value = false
  try {
    await store.fetchOne(clientId.value)
  } catch (error) {
    notFound.value = true
    toast.error('No se pudo cargar el cliente', apiErrorMessage(error))
  }
}

onMounted(load)

function back() {
  router.push({ name: 'Clients' })
}

async function toggle() {
  const current = client.value
  if (!current) return
  const deactivating = current.isActive
  const ok = await confirm({
    title: deactivating ? 'Desactivar cliente' : 'Activar cliente',
    message: deactivating
      ? `${current.name} dejará de generar cobros nuevos.`
      : `${current.name} volverá a generar cobros automáticamente.`,
    confirmLabel: deactivating ? 'Desactivar' : 'Activar',
    variant: deactivating ? 'danger' : 'primary',
  })
  if (!ok) return

  try {
    await store.toggle(current._id, !current.isActive)
    toast.success(deactivating ? 'Cliente desactivado' : 'Cliente activado', current.name)
  } catch (error) {
    toast.error('No se pudo cambiar el estado', apiErrorMessage(error))
  }
}

async function grantAccess(payload: { reason: string; until: string | null }) {
  const current = client.value
  if (!current) return
  try {
    await workspaces.grantAccess(current._id, payload)
    toast.warning(
      'Acceso abierto por excepción',
      `${current.name} mantiene su espacio abierto aunque debería estar cerrado.`,
    )
    grantOpen.value = false
    await load()
  } catch (error) {
    toast.error('No se pudo abrir el acceso', apiErrorMessage(error))
  }
}

async function revokeAccess() {
  const current = client.value
  if (!current) return
  const ok = await confirm({
    title: 'Cerrar acceso',
    message: `${current.name} volverá a quedar cerrado en la plataforma de métricas.`,
    confirmLabel: 'Cerrar acceso',
    variant: 'danger',
    icon: 'fa-solid fa-lock',
  })
  if (!ok) return

  try {
    await workspaces.revokeAccess(current._id, true)
    toast.success('Acceso cerrado', `${current.name} quedó cerrado nuevamente.`)
    await load()
  } catch (error) {
    toast.error('No se pudo cerrar el acceso', apiErrorMessage(error))
  }
}
</script>

<template>
  <div class="detail">
    <div v-if="store.loading && !client" class="detail__skeleton">
      <BaseSkeleton height="220px" />
      <BaseSkeleton height="52px" />
      <BaseSkeleton height="320px" />
    </div>

    <BaseEmptyState
      v-else-if="notFound || !client"
      icon="fa-solid fa-user-slash"
      title="Cliente no encontrado"
      message="El cliente que buscas no existe o fue eliminado."
    />

    <template v-else>
      <ClientDetailHeader
        :client="client"
        @back="back"
        @edit="formOpen = true"
        @toggle="toggle"
        @link="workspaceOpen = true"
        @backfill="backfillOpen = true"
        @archive="archiveOpen = true"
        @reactivate="reactivateOpen = true"
        @grant="grantOpen = true"
        @revoke="revokeAccess"
      />

      <BaseTabs v-model="tab" :tabs="tabs" />

      <Transition name="fade-slide" mode="out-in">
        <ClientInvoicesTab
          v-if="tab === 'invoices'"
          :key="`inv-${clientId}`"
          :client-id="clientId"
          :client-name="client.name"
          @paid="load"
        />
        <ClientPaymentsTab v-else-if="tab === 'payments'" :key="`pay-${clientId}`" :client-id="clientId" />
        <ClientLifecycleTab
          v-else-if="tab === 'lifecycle'"
          :key="`life-${clientId}`"
          :client="client"
          @refresh="load"
        />
        <ClientInfoTab v-else :key="`info-${clientId}`" :client="client" />
      </Transition>

      <ClientFormModal v-model="formOpen" :client="client" @saved="load" />
      <ClientWorkspaceModal v-model="workspaceOpen" :client="client" @saved="load" />
      <ClientBackfillModal v-model="backfillOpen" :client="client" @done="load" />
      <ClientArchiveModal v-model="archiveOpen" :client="client" @archived="load" />
      <ClientReactivateModal v-model="reactivateOpen" :client="client" @done="load" />
      <AccessGrantModal
        v-model="grantOpen"
        :client-name="client.name"
        :workspace-name="client.workspaceName || ''"
        :overdue-amount="client.overdueAmount ?? 0"
        :max-days-overdue="client.maxDaysOverdue ?? 0"
        :loading="workspaces.working"
        @confirm="grantAccess"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.detail {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

.detail__skeleton {
  @include flex-col($sp-4);
}
</style>
