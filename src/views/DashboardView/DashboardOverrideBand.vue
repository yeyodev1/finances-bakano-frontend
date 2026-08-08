<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { AccessOverrideBanner } from '@/components/access'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { apiErrorMessage } from '@/stores/clients'
import { useWorkspacesStore } from '@/stores/workspaces'
import type { Client } from '@/types'

const MAX_VISIBLE = 3

const store = useWorkspacesStore()
const router = useRouter()
const toast = useToast()
const { confirm } = useConfirm()

const items = computed<Client[]>(() => store.activeOverrides)
const visible = computed(() => items.value.slice(0, MAX_VISIBLE))
const rest = computed(() => Math.max(0, items.value.length - MAX_VISIBLE))

onMounted(() => {
  void store.loadOverrides()
})

function open(client: Client) {
  router.push({ name: 'ClientDetail', params: { id: client._id } })
}

async function revoke(client: Client) {
  const ok = await confirm({
    title: 'Cerrar acceso',
    message: `${client.name} volverá a quedar cerrado en la plataforma de métricas.`,
    confirmLabel: 'Cerrar acceso',
    variant: 'danger',
    icon: 'fa-solid fa-lock',
  })
  if (!ok) return

  try {
    await store.revokeAccess(client._id, true)
    toast.success('Acceso cerrado', `${client.name} quedó cerrado nuevamente.`)
  } catch (error) {
    toast.error('No se pudo cerrar el acceso', apiErrorMessage(error))
  }
}
</script>

<template>
  <section v-if="items.length" class="dob" aria-label="Accesos abiertos por excepción">
    <AccessOverrideBanner
      v-for="client in visible"
      :key="client._id"
      compact
      :override="client.accessOverride"
      :client-name="client.name"
      :overdue-amount="client.overdueAmount"
      :max-days-overdue="client.maxDaysOverdue"
      :loading="store.working"
      @revoke="revoke(client)"
      @open="open(client)"
    />

    <RouterLink v-if="rest" to="/espacios" class="dob__more">
      <i class="fa-solid fa-arrow-right" aria-hidden="true" />
      Ver {{ rest }} {{ rest === 1 ? 'excepción más' : 'excepciones más' }}
    </RouterLink>
  </section>
</template>

<style scoped lang="scss">
.dob {
  @include flex-col($sp-2);
  margin-bottom: $sp-4;
}

.dob__more {
  @include flex(row, flex-start, center, $sp-2);
  align-self: flex-start;
  font-size: $fs-xs;
  font-weight: 700;
  color: $alert-error;
  transition: gap $transition-fast;

  &:hover {
    gap: $sp-3;
  }
}
</style>
