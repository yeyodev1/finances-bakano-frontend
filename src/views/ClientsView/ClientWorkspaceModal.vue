<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  BaseBadge,
  BaseButton,
  BaseEmptyState,
  BaseModal,
  BaseSearchInput,
  BaseSkeleton,
  BaseWorkspaceAvatar,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useWorkspacesStore, type WorkspaceSuggestion } from '@/stores/workspaces'
import type { Client } from '@/types'

const props = defineProps<{ modelValue: boolean; client: Client | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [client: Client] }>()

const clientsStore = useClientsStore()
const workspacesStore = useWorkspacesStore()
const toast = useToast()
const { confirm } = useConfirm()

const search = ref('')
const linking = ref<string | null>(null)

watch(
  () => props.modelValue,
  async (open) => {
    if (!open || !props.client) return
    search.value = ''
    try {
      await Promise.all([workspacesStore.fetchSuggestions(props.client._id), workspacesStore.fetch()])
    } catch (error) {
      toast.error('No se pudieron cargar los espacios', apiErrorMessage(error))
    }
  },
)

async function reload() {
  if (!props.client) return
  try {
    await Promise.all([
      workspacesStore.fetchSuggestions(props.client._id),
      workspacesStore.fetch(),
    ])
  } catch (error) {
    toast.error('No se pudieron cargar los espacios', apiErrorMessage(error))
  }
}

const suggestions = computed<WorkspaceSuggestion[]>(() => workspacesStore.suggestions)

/**
 * Sin espacios cargados el problema casi nunca es la búsqueda: es que el
 * backend de métricas (:8100) no está levantado. Antes la lista salía vacía sin
 * decir por qué y no había forma de saberlo desde la interfaz.
 */
const metricsDown = computed(
  () => !workspacesStore.loading && workspacesStore.items.length === 0,
)

const searching = computed(() => search.value.trim().length > 0)

const allResults = computed<WorkspaceSuggestion[]>(() => {
  const term = search.value.trim().toLowerCase()
  return workspacesStore.items
    .filter((w) => {
      if (!term) return true
      // Se buscan todas las señas del espacio, no solo su nombre: el usuario
      // suele acordarse del dueño o de la página antes que del nombre exacto.
      const haystack = [
        w.name,
        w.adminName,
        w.adminEmail,
        w.pageName,
        w.instagramAccountName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return term.split(/\s+/).every((word) => haystack.includes(word))
    })
    .slice(0, 40)
    .map((w) => ({
      workspaceId: w._id,
      workspaceName: w.name,
      isActive: w.isActive,
      adminName: w.adminName,
      adminEmail: w.adminEmail,
      imageUrl: w.imageUrl || w.logoUrl || w.pictureUrl || null,
      score: 0,
    }))
})

function matchPercent(score: number): string {
  const pct = score <= 1 ? score * 100 : score
  return `${Math.round(pct)}%`
}

async function link(item: WorkspaceSuggestion) {
  if (!props.client) return
  const ok = await confirm({
    title: 'Vincular espacio de trabajo',
    message: `Se vinculará "${item.workspaceName}" al cliente ${props.client.name}. Las desactivaciones por mora afectarán este espacio.`,
    confirmLabel: 'Vincular',
    variant: 'primary',
  })
  if (!ok) return

  linking.value = item.workspaceId
  try {
    const updated = await clientsStore.link(props.client._id, item.workspaceId, item.workspaceName)
    toast.success('Espacio vinculado', `${item.workspaceName} quedó asociado a ${updated.name}.`)
    emit('saved', updated)
    emit('update:modelValue', false)
  } catch (error) {
    toast.error('No se pudo vincular', apiErrorMessage(error))
  } finally {
    linking.value = null
  }
}

async function unlink() {
  if (!props.client?.workspaceId) return
  const ok = await confirm({
    title: 'Desvincular espacio',
    message: 'El cliente dejará de estar asociado a este espacio de trabajo.',
    confirmLabel: 'Desvincular',
  })
  if (!ok) return

  try {
    const updated = await clientsStore.unlink(props.client._id)
    toast.success('Espacio desvinculado')
    emit('saved', updated)
  } catch (error) {
    toast.error('No se pudo desvincular', apiErrorMessage(error))
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Vincular espacio de trabajo"
    size="md"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="ws">
      <div v-if="client?.workspaceId" class="ws__current">
        <div class="ws__current-id">
          <BaseWorkspaceAvatar
            :src="client.workspaceImageUrl"
            :name="client.workspaceName || client.name"
            size="md"
            rounded="square"
            :status="client.workspaceIsActive === false ? 'inactive' : 'active'"
          />
          <div>
            <p class="ws__label">Espacio actual</p>
            <p class="ws__name">{{ client.workspaceName }}</p>
          </div>
        </div>
        <div class="ws__current-actions">
          <BaseBadge :variant="client.workspaceIsActive === false ? 'danger' : 'success'">
            {{ client.workspaceIsActive === false ? 'Inactivo' : 'Activo' }}
          </BaseBadge>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-link-slash" @click="unlink">Desvincular</BaseButton>
        </div>
      </div>

      <section class="ws__block">
        <p class="ws__label"><i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Sugerencias por nombre</p>

        <div v-if="workspacesStore.loadingSuggestions" class="ws__list">
          <BaseSkeleton v-for="n in 3" :key="n" height="58px" />
        </div>

        <TransitionGroup v-else-if="suggestions.length" name="list" tag="div" class="ws__list">
          <button
            v-for="item in suggestions"
            :key="item.workspaceId"
            type="button"
            class="ws-item"
            :disabled="linking === item.workspaceId"
            @click="link(item)"
          >
            <BaseWorkspaceAvatar
              :src="item.imageUrl"
              :name="item.workspaceName"
              size="sm"
              rounded="square"
              :status="item.isActive ? 'active' : 'inactive'"
            />
            <div class="ws-item__main">
              <span class="ws-item__name">{{ item.workspaceName }}</span>
              <span v-if="item.adminEmail" class="ws-item__sub">{{ item.adminEmail }}</span>
            </div>
            <div class="ws-item__meta">
              <BaseBadge :variant="item.isActive ? 'success' : 'danger'">
                {{ item.isActive ? 'Activo' : 'Inactivo' }}
              </BaseBadge>
              <span class="ws-item__score">{{ matchPercent(item.score) }} coincidencia</span>
            </div>
          </button>
        </TransitionGroup>

        <p v-else-if="metricsDown" class="ws__muted">
          Sin conexión con métricas, no hay espacios que sugerir.
        </p>
        <p v-else class="ws__muted">No encontramos coincidencias por nombre.</p>
      </section>

      <section class="ws__block">
        <p class="ws__label"><i class="fa-solid fa-magnifying-glass" aria-hidden="true" /> Buscar en todos los espacios</p>
        <BaseSearchInput
          v-model="search"
          placeholder="Nombre del espacio, del admin o su correo"
        />

        <p v-if="searching && allResults.length" class="ws__muted">
          {{ allResults.length }} de {{ workspacesStore.items.length }} espacios coinciden.
        </p>

        <div v-if="workspacesStore.loading" class="ws__list">
          <BaseSkeleton v-for="n in 3" :key="n" height="58px" />
        </div>

        <BaseEmptyState
          v-else-if="metricsDown"
          icon="fa-solid fa-plug-circle-exclamation"
          title="El servicio de métricas no responde"
          message="Los espacios de trabajo viven en el backend de métricas. Levántalo en el puerto 8100 y vuelve a abrir esta ventana."
        >
          <template #action>
            <BaseButton
              icon="fa-solid fa-rotate"
              :loading="workspacesStore.loading"
              @click="reload"
            >
              Reintentar
            </BaseButton>
          </template>
        </BaseEmptyState>

        <BaseEmptyState
          v-else-if="!allResults.length"
          icon="fa-solid fa-magnifying-glass-minus"
          title="Sin coincidencias"
          :message="`Ningún espacio coincide con «${search}». Prueba con parte del nombre o el correo del admin.`"
        />

        <TransitionGroup v-else name="list" tag="div" class="ws__list ws__list--scroll">
          <button
            v-for="item in allResults"
            :key="item.workspaceId"
            type="button"
            class="ws-item"
            :disabled="linking === item.workspaceId"
            @click="link(item)"
          >
            <BaseWorkspaceAvatar
              :src="item.imageUrl"
              :name="item.workspaceName"
              size="sm"
              rounded="square"
              :status="item.isActive ? 'active' : 'inactive'"
            />
            <div class="ws-item__main">
              <span class="ws-item__name">{{ item.workspaceName }}</span>
              <span v-if="item.adminName || item.adminEmail" class="ws-item__sub">
                {{ [item.adminName, item.adminEmail].filter(Boolean).join(' · ') }}
              </span>
            </div>
            <BaseBadge :variant="item.isActive ? 'success' : 'danger'">
              {{ item.isActive ? 'Activo' : 'Inactivo' }}
            </BaseBadge>
          </button>
        </TransitionGroup>
      </section>
    </div>

    <template #footer>
      <BaseButton variant="ghost" icon="fa-solid fa-xmark" @click="emit('update:modelValue', false)">Cerrar</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.ws {
  @include flex-col($sp-5);
}

.ws__current {
  @include flex-between(center, $sp-3);
  flex-wrap: wrap;
  padding: $sp-4;
  border-radius: $radius-md;
  background: rgba($secondary, 0.08);
  border: 1px solid rgba($secondary, 0.24);
}

.ws__current-id {
  @include flex(row, flex-start, center, $sp-3);
  min-width: 0;
}

.ws__current-actions {
  @include flex(row, flex-end, center, $sp-2);
}

.ws__block {
  @include flex-col($sp-3);
}

.ws__label {
  @include label-text;

  i {
    margin-right: $sp-2;
    color: $secondary;
  }
}

.ws__name {
  font-weight: 700;
  color: $primary-dark;
  font-size: $fs-md;
}

.ws__muted {
  font-size: $fs-xs;
  color: $text-secondary;
}

.ws__list {
  @include flex-col($sp-2);

  &--scroll {
    max-height: 260px;
    overflow-y: auto;
    @include scrollbar;
  }
}

.ws-item {
  @include flex-between(center, $sp-3);
  @include pressable;
  width: 100%;
  padding: $sp-3;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: $surface;
  cursor: pointer;
  text-align: left;
  transition: border-color $transition-base, box-shadow $transition-base;

  &:hover:not(:disabled) {
    border-color: rgba($primary, 0.4);
    box-shadow: $shadow-sm;
  }

  &:disabled {
    opacity: 0.6;
    cursor: progress;
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.ws-item__main {
  @include flex-col(2px);
  flex: 1 1 auto;
  min-width: 0;
}

.ws-item__name {
  font-weight: 600;
  color: $primary-dark;
  @include truncate;
}

.ws-item__sub {
  font-size: $fs-xs;
  color: $text-secondary;
  @include truncate;
}

.ws-item__meta {
  @include flex(row, flex-end, center, $sp-2);
  flex: none;
}

.ws-item__score {
  font-size: $fs-xs;
  font-weight: 800;
  color: $primary;
}
</style>
