<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BaseButton,
  BaseEmptyState,
  BaseSkeleton,
  BaseStatCard,
  BaseTabs,
} from '@/components/base'
import WorkspaceCard from './WorkspaceCard.vue'
import WorkspacesFilters from './WorkspacesFilters.vue'
import WorkspaceToggleModal from './WorkspaceToggleModal.vue'
import WorkspaceImageViewer from './WorkspaceImageViewer.vue'
import AccessGrantModal from './AccessGrantModal.vue'
import AccessOverridesTable from './AccessOverridesTable.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/stores/clients'
import { useWorkspacesStore } from '@/stores/workspaces'
import type { TabItem } from '@/components/base'
import type { Client, Workspace } from '@/types'

const store = useWorkspacesStore()
const toast = useToast()
const { confirm } = useConfirm()
const router = useRouter()

const tab = ref<string | number>('spaces')
const toggleOpen = ref(false)
const galleryOpen = ref(false)
const grantOpen = ref(false)
const selected = ref<Workspace | null>(null)

const tabs = computed<TabItem[]>(() => [
  { value: 'spaces', label: 'Espacios', icon: 'fa-solid fa-layer-group', badge: store.total || undefined },
  {
    value: 'overrides',
    label: 'Accesos abiertos',
    icon: 'fa-solid fa-unlock-keyhole',
    badge: store.activeOverrides.length || undefined,
  },
])

async function load() {
  try {
    await store.fetch()
  } catch (error) {
    toast.error('No se pudieron cargar los espacios', apiErrorMessage(error))
  }
  await store.loadOverrides()
}

onMounted(load)

function openToggle(workspace: Workspace) {
  selected.value = workspace
  toggleOpen.value = true
}

function openGallery(workspace: Workspace) {
  selected.value = workspace
  galleryOpen.value = true
}

function openGrant(workspace: Workspace) {
  selected.value = workspace
  grantOpen.value = true
}

function openClient(workspace: Workspace) {
  if (!workspace.client) return
  router.push({ name: 'ClientDetail', params: { id: workspace.client._id } })
}

function openClientById(client: Client) {
  router.push({ name: 'ClientDetail', params: { id: client._id } })
}

async function applyToggle(reason: string) {
  const workspace = selected.value
  if (!workspace) return
  const next = !workspace.isActive
  try {
    await store.setActive(workspace._id, next, reason)
    toast.success(
      next ? 'Espacio activado' : 'Espacio desactivado',
      `${workspace.name} ${next ? 'recuperó' : 'perdió'} el acceso en la plataforma de métricas.`,
    )
    toggleOpen.value = false
  } catch (error) {
    toast.error('No se pudo cambiar el estado', apiErrorMessage(error))
  }
}

async function applyGrant(payload: { reason: string; until: string | null }) {
  const workspace = selected.value
  if (!workspace?.client) return
  try {
    await store.grantAccess(workspace.client._id, payload)
    await store.loadOverrides()
    toast.warning(
      'Acceso abierto por excepción',
      `${workspace.name} queda abierto aunque debería estar cerrado.`,
    )
    grantOpen.value = false
  } catch (error) {
    toast.error('No se pudo abrir el acceso', apiErrorMessage(error))
  }
}

async function revokeFromCard(workspace: Workspace) {
  if (!workspace.client) return
  await revoke(workspace.client._id, workspace.name)
}

async function revokeFromTable(client: Client) {
  await revoke(client._id, client.workspaceName || client.name)
}

async function revoke(clientId: string, label: string) {
  const ok = await confirm({
    title: 'Cerrar acceso',
    message: `${label} volverá a quedar cerrado en la plataforma de métricas y se dará por terminada la excepción.`,
    confirmLabel: 'Cerrar acceso',
    variant: 'danger',
    icon: 'fa-solid fa-lock',
  })
  if (!ok) return

  try {
    await store.revokeAccess(clientId, true)
    await store.loadOverrides()
    toast.success('Acceso cerrado', `${label} quedó cerrado nuevamente.`)
  } catch (error) {
    toast.error('No se pudo cerrar el acceso', apiErrorMessage(error))
  }
}

async function syncImages() {
  try {
    const result = await store.syncImages()
    toast.success(
      'Imágenes actualizadas',
      `${result?.updated ?? 0} espacios actualizados de ${result?.total ?? 0}.`,
    )
  } catch (error) {
    toast.error('No se pudieron actualizar las imágenes', apiErrorMessage(error))
  }
}
</script>

<template>
  <div class="workspaces">
    <header class="workspaces__header">
      <div class="workspaces__title">
        <h1><i class="fa-solid fa-layer-group" aria-hidden="true" /> Espacios de trabajo</h1>
        <p>Estado real de los espacios en la plataforma de métricas</p>
      </div>

      <BaseButton
        variant="outline"
        icon="fa-solid fa-arrows-rotate"
        :loading="store.syncingImages"
        @click="syncImages"
      >
        Actualizar imágenes
      </BaseButton>
    </header>

    <div v-if="!store.notConfigured" class="workspaces__stats">
      <BaseStatCard label="Espacios" :value="String(store.total)" icon="fa-solid fa-layer-group" color="primary" />
      <BaseStatCard label="Activos" :value="String(store.activeCount)" icon="fa-solid fa-circle-check" color="success" />
      <BaseStatCard label="Con imagen" :value="String(store.withImageCount)" icon="fa-solid fa-image" color="info" />
      <BaseStatCard
        label="Deberían estar cerrados"
        :value="String(store.shouldBeClosedCount)"
        icon="fa-solid fa-triangle-exclamation"
        color="danger"
      />
      <BaseStatCard
        label="Accesos por excepción"
        :value="String(store.overrideCount)"
        icon="fa-solid fa-unlock-keyhole"
        color="warning"
      />
    </div>

    <BaseTabs v-if="!store.notConfigured" v-model="tab" :tabs="tabs" />

    <BaseEmptyState
      v-if="store.notConfigured"
      icon="fa-solid fa-plug-circle-xmark"
      title="Integración de métricas no configurada"
      :message="store.error || 'Falta configurar METRICS_API_URL o FINANCE_API_KEY en el servidor para poder listar los espacios de trabajo.'"
    />

    <Transition v-else name="fade-slide" mode="out-in">
      <section v-if="tab === 'overrides'" key="overrides" class="workspaces__panel">
        <AccessOverridesTable
          :items="store.activeOverrides"
          :loading="store.loadingOverrides"
          :unavailable="store.overridesUnavailable"
          @revoke="revokeFromTable"
          @open="openClientById"
        />
      </section>

      <section v-else key="spaces" class="workspaces__panel">
        <WorkspacesFilters v-model="store.filters" />

        <div v-if="store.loading" class="workspaces__grid">
          <BaseSkeleton v-for="n in 6" :key="n" height="220px" />
        </div>

        <BaseEmptyState
          v-else-if="!store.filtered.length"
          icon="fa-solid fa-layer-group"
          title="Sin espacios"
          message="No hay espacios que coincidan con los filtros aplicados."
        />

        <TransitionGroup v-else name="list" tag="div" class="workspaces__grid">
          <WorkspaceCard
            v-for="workspace in store.filtered"
            :key="workspace._id"
            :workspace="workspace"
            @toggle="openToggle"
            @open="openClient"
            @gallery="openGallery"
            @grant="openGrant"
            @revoke="revokeFromCard"
          />
        </TransitionGroup>
      </section>
    </Transition>

    <WorkspaceToggleModal
      v-model="toggleOpen"
      :workspace="selected"
      :loading="store.working"
      @confirm="applyToggle"
    />

    <WorkspaceImageViewer v-model="galleryOpen" :workspace="selected" />

    <AccessGrantModal
      v-model="grantOpen"
      :client-name="selected?.client?.name || ''"
      :workspace-name="selected?.name || ''"
      :overdue-amount="selected?.overdueAmount ?? 0"
      :max-days-overdue="selected?.maxDaysOverdue ?? 0"
      :loading="store.working"
      @confirm="applyGrant"
    />
  </div>
</template>

<style scoped lang="scss">
.workspaces {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

.workspaces__header {
  @include flex-col($sp-3);

  @include md {
    @include flex-between(flex-end, $sp-4);
  }
}

.workspaces__title {
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

.workspaces__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: $sp-3;

  @include lg {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.workspaces__panel {
  @include flex-col($sp-4);
}

.workspaces__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-3;

  @include md {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include xl {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
