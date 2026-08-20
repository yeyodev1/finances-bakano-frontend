<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { BaseButton, BaseEmptyState } from '@/components/base'
import DashboardHeader from './DashboardHeader.vue'
import DashboardKpis from './DashboardKpis.vue'
import DashboardCharts from './DashboardCharts.vue'
import DashboardOverdueList from './DashboardOverdueList.vue'
import DashboardUpcomingList from './DashboardUpcomingList.vue'
import DashboardOverrideBand from './DashboardOverrideBand.vue'
import DashboardDelinquency from './DashboardDelinquency.vue'
import { useDashboardStore } from '@/stores/dashboard'

const dashboard = useDashboardStore()

const showEmpty = computed(
  () => !dashboard.loading && !dashboard.error && dashboard.summary === null,
)

onMounted(() => {
  if (!dashboard.lastLoadedAt) void dashboard.load()
})
</script>

<template>
  <div class="dashboard">
    <DashboardHeader />

    <DashboardOverrideBand />

    <Transition name="fade">
      <div v-if="dashboard.error" class="dashboard__error" role="alert">
        <i class="fa-solid fa-circle-exclamation" />
        <span>{{ dashboard.error }}</span>
        <BaseButton variant="ghost" size="sm" @click="dashboard.refresh()">Reintentar</BaseButton>
      </div>
    </Transition>

    <BaseEmptyState
      v-if="showEmpty"
      icon="fa-solid fa-chart-pie"
      title="Todavía no hay datos"
      description="Genera los cobros del mes para empezar a ver tus métricas."
    />

    <template v-else>
      <DashboardKpis
        :summary="dashboard.summary"
        :delinquency="dashboard.delinquency"
        :loading="dashboard.loading"
      />

      <DashboardDelinquency
        :report="dashboard.delinquency"
        :loading="dashboard.loading && !dashboard.lastLoadedAt"
      />

      <DashboardCharts
        :revenue="dashboard.revenue"
        :status-breakdown="dashboard.statusBreakdown"
        :method-breakdown="dashboard.methodBreakdown"
        :top-clients="dashboard.topClients"
        :aging="dashboard.aging"
        :loading="dashboard.loading && !dashboard.lastLoadedAt"
      />

      <section class="dashboard__lists">
        <DashboardOverdueList
          class="dashboard__list"
          :invoices="dashboard.overdue"
          :loading="dashboard.loading && !dashboard.lastLoadedAt"
        />
        <DashboardUpcomingList
          class="dashboard__list"
          :invoices="dashboard.upcoming"
          :loading="dashboard.loading && !dashboard.lastLoadedAt"
        />
      </section>
    </template>
  </div>
</template>

<style scoped lang="scss">
.dashboard {
  @include flex-col(0);
  width: 100%;
}

.dashboard__error {
  @include flex(row, flex-start, center, $sp-3);
  padding: $sp-3 $sp-4;
  margin-bottom: $sp-4;
  border-radius: $radius-sm;
  background: $alert-error-bg;
  border: 1px solid rgba($alert-error, 0.25);
  color: $alert-error;
  font-size: $fs-sm;
  font-weight: 600;

  span {
    flex: 1 1 auto;
    min-width: 0;
  }
}

.dashboard__lists {
  @include flex(row, flex-start, stretch, $sp-4);
  flex-wrap: wrap;
}

.dashboard__list {
  flex: 1 1 100%;
  min-width: 0;

  @include lg {
    flex: 1 1 calc(50% - #{$sp-4});
  }
}
</style>
