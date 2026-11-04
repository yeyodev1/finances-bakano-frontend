<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseBadge, BaseWorkspaceAvatar } from '@/components/base'
import api from '@/services/api.service'
import { useFormat } from '@/composables/useFormat'
import { SERVICE_ICONS, isNewSale, serviceLabel } from '@/stores/clients'
import type { Client } from '@/types'

/** Clientes que entraron en los últimos 30 días: lo que suman al mes y quiénes son. */
const { formatMoney, formatDateShort } = useFormat()
const clients = ref<Client[]>([])

onMounted(async () => {
  try {
    // shortcut: mira los 50 más recientes; si se cierran más de 50 ventas en 30 días, filtrar en el backend.
    const page = await api.listClients({ sort: '-createdAt', limit: 50, archived: 'false' })
    clients.value = page.items.filter((c) => isNewSale(c))
  } catch {
    clients.value = []
  }
})

const monthly = computed(() =>
  clients.value.filter((c) => c.billingType === 'monthly').reduce((acc, c) => acc + Number(c.amount || 0), 0),
)
</script>

<template>
  <section v-if="clients.length" class="sales" aria-label="Ventas nuevas">
    <header class="sales__head">
      <h2>
        <i class="fa-solid fa-star" aria-hidden="true" />
        {{ clients.length }} venta{{ clients.length === 1 ? '' : 's' }} nueva{{ clients.length === 1 ? '' : 's' }} en los últimos 30 días
      </h2>
      <strong v-if="monthly" class="sales__total">+{{ formatMoney(monthly) }} al mes</strong>
    </header>

    <ul class="sales__list">
      <li v-for="c in clients" :key="c._id">
        <RouterLink :to="{ name: 'ClientDetail', params: { id: c._id } }" class="sales__row">
          <BaseWorkspaceAvatar :src="c.workspaceImageUrl" :name="c.name" size="sm" />
          <div class="sales__name">
            <strong>{{ c.name }}</strong>
            <span>{{ [c.contactName, `desde ${formatDateShort(c.startDate || c.createdAt)}`].filter(Boolean).join(' · ') }}</span>
          </div>
          <BaseBadge
            :variant="c.service ? 'secondary' : 'warning'"
            :icon="c.service ? SERVICE_ICONS[c.service] : 'fa-solid fa-circle-question'"
            size="sm"
          >
            {{ serviceLabel(c.service) }}
          </BaseBadge>
          <span class="sales__amount">
            {{ formatMoney(c.amount) }}<small v-if="c.billingType === 'monthly'">/mes</small>
          </span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped lang="scss">
.sales {
  @include flex-col($sp-3);
  margin-bottom: $sp-5;
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid rgba($alert-success, 0.35);
  background: rgba($alert-success, 0.06);
}

.sales__head {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;

  h2 {
    @include flex(row, flex-start, center, $sp-2);
    margin: 0;
    font-size: $fs-md;
    font-weight: 700;

    i {
      color: $alert-success;
    }
  }
}

.sales__total {
  color: $alert-success;
  font-size: $fs-md;
}

.sales__list {
  @include flex-col($sp-1);
  list-style: none;
  margin: 0;
  padding: 0;
}

.sales__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  align-items: center;
  gap: $sp-3;
  padding: $sp-2;
  border-radius: $radius-sm;
  color: inherit;
  text-decoration: none;

  &:hover {
    background: rgba($alert-success, 0.08);
  }

  &:focus-visible {
    @include focus-ring;
  }
}

.sales__name {
  @include flex-col(2px);
  min-width: 0;

  span {
    font-size: $fs-xs;
    color: $text-secondary;
  }
}

.sales__amount {
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  small {
    font-weight: 500;
    color: $text-secondary;
  }
}
</style>
