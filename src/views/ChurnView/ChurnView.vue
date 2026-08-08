<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { BaseButton, BaseEmptyState } from '@/components/base'
import ChurnKpis from './ChurnKpis.vue'
import ChurnReasonsPanel from './ChurnReasonsPanel.vue'
import ChurnRecentList from './ChurnRecentList.vue'
import { useChurnStore } from '@/stores/churn'

const store = useChurnStore()
const router = useRouter()

const showUnavailable = computed(() => store.unavailable && !store.loading)

onMounted(() => {
  if (!store.loaded) void store.load()
})

function goToArchived() {
  router.push({ name: 'Clients' })
}
</script>

<template>
  <div class="churn">
    <header class="churn__header">
      <div class="churn__title">
        <h1><i class="fa-solid fa-user-slash" aria-hidden="true" /> Bajas</h1>
        <p>Por qué se van los clientes y cuánto cuesta cada motivo</p>
      </div>

      <div class="churn__actions">
        <BaseButton variant="outline" icon="fa-solid fa-users" @click="goToArchived">
          Ver clientes
        </BaseButton>
        <BaseButton variant="ghost" icon="fa-solid fa-rotate" :loading="store.loading" @click="store.refresh()">
          Actualizar
        </BaseButton>
      </div>
    </header>

    <BaseEmptyState
      v-if="showUnavailable"
      icon="fa-solid fa-plug-circle-exclamation"
      title="Reporte de bajas no disponible"
      message="El servicio de bajas todavía no responde. Vuelve a intentarlo en unos minutos."
    >
      <template #action>
        <BaseButton icon="fa-solid fa-rotate" :loading="store.loading" @click="store.refresh()">
          Reintentar
        </BaseButton>
      </template>
    </BaseEmptyState>

    <template v-else>
      <ChurnKpis :totals="store.report.totals" :loading="store.loading" />

      <ChurnReasonsPanel :rows="store.report.byReason" :loading="store.loading" />

      <ChurnRecentList :items="store.report.recent" :loading="store.loading" />
    </template>
  </div>
</template>

<style scoped lang="scss">
.churn {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

.churn__header {
  @include flex-col($sp-3);

  @include md {
    @include flex-between(flex-end, $sp-4);
  }
}

.churn__title {
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

.churn__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}
</style>
