<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BaseBadge,
  BaseButton,
  BaseEmptyState,
  BaseMonthPicker,
  BasePagination,
  BaseSelect,
  BaseSkeleton,
  BaseStatCard,
  BaseTable,
} from '@/components/base'
import InvoicePickerModal from '@/views/PaymentsView/InvoicePickerModal.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useConfirm } from '@/composables/useConfirm'
import { useFormat } from '@/composables/useFormat'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useCrmConsumptionStore } from '@/stores/crmConsumption'
import { useUserStore } from '@/stores/user'
import type { CrmConsumption, CrmConsumptionSource, Invoice } from '@/types'

/**
 * Consumo del CRM (GoHighLevel) que Bakano provee: cargos de Stripe que no son
 * mensualidades ($25, $1…). Entran solos desde el webhook y la importación; acá
 * se ven por cliente con totales. Si uno era en realidad una mensualidad, se
 * reclasifica a su factura desde esta misma vista.
 */
const store = useCrmConsumptionStore()
const clients = useClientsStore()
const user = useUserStore()
const toast = useToast()
const { confirm } = useConfirm()
const { isMobile } = useBreakpoint()
const { formatMoney, formatDateShort } = useFormat()

const SOURCE_BADGE: Record<CrmConsumptionSource, { variant: 'info' | 'secondary'; icon: string; label: string }> = {
  stripe_webhook: { variant: 'info', icon: 'fa-solid fa-bolt', label: 'Webhook' },
  stripe_import: { variant: 'secondary', icon: 'fa-solid fa-cloud-arrow-down', label: 'Importación' },
}

async function load(page = 1) {
  try {
    await store.fetch(page)
  } catch (error) {
    toast.error('Error al cargar el consumo CRM', apiErrorMessage(error))
  }
}

onMounted(async () => {
  await Promise.all([load(), clients.fetchPicker().catch(() => undefined)])
})

// ── Filtros ─────────────────────────────────────────────────────
const clientFilter = computed({
  get: () => store.filters.clientId ?? '',
  set: (value: string | number) => {
    store.filters.clientId = value ? String(value) : null
    void load(1)
  },
})

const periodFilter = computed({
  get: () => store.filters.period ?? '',
  set: (value: string) => {
    store.filters.period = value || null
    void load(1)
  },
})

const clientOptions = computed(() => [
  { value: '', label: 'Todos los clientes' },
  ...clients.pickerOptions,
])

function filterByClient(clientId: string) {
  clientFilter.value = store.filters.clientId === clientId ? '' : clientId
}

function clearFilters() {
  store.filters.clientId = null
  store.filters.period = null
  void load(1)
}

const hasFilters = computed(() => Boolean(store.filters.clientId || store.filters.period))

const columns = [
  { key: 'paidAt', label: 'Fecha' },
  { key: 'clientName', label: 'Cliente' },
  { key: 'amount', label: 'Monto', align: 'right' },
  { key: 'description', label: 'Descripción' },
  { key: 'source', label: 'Origen' },
  { key: 'actions', label: '', align: 'right' },
]

// ── Reclasificar a factura ─────────────────────────────────────
const pickerOpen = ref(false)
const target = ref<CrmConsumption | null>(null)

function openApply(item: CrmConsumption) {
  target.value = item
  pickerOpen.value = true
}

async function onPicked(invoice: Invoice) {
  if (!target.value) return
  pickerOpen.value = false
  try {
    const result = await store.apply(target.value._id, invoice._id)
    toast.success('Cargo reclasificado', result.message)
  } catch (error) {
    toast.error('No se pudo aplicar a la factura', apiErrorMessage(error))
  }
}

async function onRemove(item: CrmConsumption) {
  const ok = await confirm({
    title: 'Eliminar consumo',
    message: `Se borra el registro de ${formatMoney(item.amount)} de ${item.clientName}. El cargo sigue existiendo en Stripe; solo desaparece de esta lista.`,
    confirmLabel: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return
  try {
    const result = await store.remove(item._id)
    toast.success('Consumo eliminado', result.message)
  } catch (error) {
    toast.error('No se pudo eliminar', apiErrorMessage(error))
  }
}
</script>

<template>
  <div class="crm">
    <header class="crm__header">
      <div class="crm__title">
        <h1><i class="fa-solid fa-plug-circle-bolt" aria-hidden="true" /> Consumo CRM</h1>
        <p>
          Lo que consume cada cliente en el GoHighLevel que provee Bakano: cargos de Stripe que no
          son mensualidades. Entran solos desde el webhook y la importación.
        </p>
      </div>
    </header>

    <div class="crm__stats">
      <BaseStatCard
        label="Consumo del mes"
        :value="formatMoney(store.totals.currentMonth)"
        icon="fa-solid fa-calendar-day"
        variant="primary"
        :loading="store.loading"
      />
      <BaseStatCard
        label="Total histórico"
        :value="formatMoney(store.totals.total)"
        icon="fa-solid fa-coins"
        variant="secondary"
        :loading="store.loading"
      />
      <BaseStatCard
        label="Clientes con consumo"
        :value="store.totals.byClient.length"
        icon="fa-solid fa-users"
        variant="info"
        :loading="store.loading"
      />
    </div>

    <section v-if="store.totals.byClient.length > 1" class="ranking" aria-label="Consumo por cliente">
      <button
        v-for="c in store.totals.byClient"
        :key="c.clientId"
        type="button"
        class="ranking__item"
        :class="{ 'ranking__item--active': store.filters.clientId === c.clientId }"
        @click="filterByClient(c.clientId)"
      >
        <span class="ranking__name">{{ c.clientName }}</span>
        <span class="ranking__total">{{ formatMoney(c.total) }}</span>
        <span class="ranking__count">{{ c.count }} cargo(s)</span>
      </button>
    </section>

    <div class="crm__filters">
      <BaseSelect v-model="clientFilter" :options="clientOptions" label="Cliente" searchable />
      <BaseMonthPicker v-model="periodFilter" label="Mes" />
      <BaseButton v-if="hasFilters" variant="ghost" size="sm" @click="clearFilters">
        <i class="fa-solid fa-xmark" aria-hidden="true" /> Limpiar
      </BaseButton>
    </div>

    <div v-if="store.loading" class="crm__skeleton">
      <BaseSkeleton v-for="n in 5" :key="n" height="56px" />
    </div>

    <BaseEmptyState
      v-else-if="store.isEmpty"
      icon="fa-solid fa-plug-circle-bolt"
      title="Sin consumo registrado"
      :message="
        hasFilters
          ? 'No hay cargos con estos filtros.'
          : 'Los cargos de Stripe que no calcen con una factura aparecerán acá solos (webhook e importación).'
      "
    />

    <div v-else-if="isMobile" class="cards">
      <article v-for="item in store.items" :key="item._id" class="card">
        <header class="card__head">
          <h3>{{ item.clientName }}</h3>
          <strong class="card__amount">{{ formatMoney(item.amount) }}</strong>
        </header>
        <ul class="card__meta">
          <li><span>Fecha</span> {{ formatDateShort(item.paidAt) }}</li>
          <li>
            <span>Origen</span>
            <BaseBadge
              size="sm"
              :variant="SOURCE_BADGE[item.source].variant"
              :icon="SOURCE_BADGE[item.source].icon"
              :label="SOURCE_BADGE[item.source].label"
            />
          </li>
          <li v-if="item.description"><span>Detalle</span> {{ item.description }}</li>
          <li v-if="item.receiptUrl">
            <span>Recibo</span>
            <a :href="item.receiptUrl" target="_blank" rel="noopener" class="link">
              <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> Ver
            </a>
          </li>
        </ul>
        <footer class="card__foot">
          <button type="button" class="apply" @click="openApply(item)">
            <i class="fa-solid fa-file-invoice" aria-hidden="true" /> Aplicar a factura
          </button>
          <button v-if="user.isSuperadmin" type="button" class="danger" @click="onRemove(item)">
            <i class="fa-solid fa-trash-can" aria-hidden="true" /> Eliminar
          </button>
        </footer>
      </article>
    </div>

    <BaseTable v-else :columns="columns" :rows="store.items" row-key="_id">
      <template #cell-paidAt="{ row }">
        {{ formatDateShort((row as CrmConsumption).paidAt) }}
      </template>

      <template #cell-clientName="{ row }">
        <span class="strong">{{ (row as CrmConsumption).clientName }}</span>
        <span class="sub">{{ (row as CrmConsumption).stripeChargeId }}</span>
      </template>

      <template #cell-amount="{ row }">
        <strong>{{ formatMoney((row as CrmConsumption).amount) }}</strong>
      </template>

      <template #cell-description="{ row }">
        <span v-if="(row as CrmConsumption).description">{{ (row as CrmConsumption).description }}</span>
        <span v-else class="sub">—</span>
        <a
          v-if="(row as CrmConsumption).receiptUrl"
          :href="(row as CrmConsumption).receiptUrl"
          target="_blank"
          rel="noopener"
          class="link"
        >
          <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> Recibo
        </a>
      </template>

      <template #cell-source="{ row }">
        <BaseBadge
          size="sm"
          :variant="SOURCE_BADGE[(row as CrmConsumption).source].variant"
          :icon="SOURCE_BADGE[(row as CrmConsumption).source].icon"
          :label="SOURCE_BADGE[(row as CrmConsumption).source].label"
        />
      </template>

      <template #cell-actions="{ row }">
        <div class="actions">
          <button type="button" class="apply" @click="openApply(row as CrmConsumption)">
            <i class="fa-solid fa-file-invoice" aria-hidden="true" /> Aplicar a factura
          </button>
          <button
            v-if="user.isSuperadmin"
            type="button"
            class="danger"
            @click="onRemove(row as CrmConsumption)"
          >
            <i class="fa-solid fa-trash-can" aria-hidden="true" /> Eliminar
          </button>
        </div>
      </template>
    </BaseTable>

    <BasePagination
      v-if="store.pages > 1"
      :page="store.page"
      :pages="store.pages"
      @update:page="load"
    />

    <!-- Reclasificar: elegir la factura del cliente a la que aplicar el cargo. -->
    <InvoicePickerModal
      v-if="target"
      v-model="pickerOpen"
      :client-id="target.clientId"
      :client-name="target.clientName"
      @picked="onPicked"
    />
  </div>
</template>

<style scoped lang="scss">
.crm {
  @include flex-col($sp-5);

  &__header {
    @include flex-between(flex-start, $sp-4);
    flex-wrap: wrap;
  }

  &__title {
    h1 {
      @include flex(row, flex-start, center, 10px);
      margin: 0;
      font-size: clamp($fs-lg, 4vw, $fs-2xl);
    }

    p {
      margin: 4px 0 0;
      color: rgba($primary-dark, 0.6);
      font-size: $fs-sm;
      max-width: 60ch;
    }
  }

  &__stats {
    @include flex(row, flex-start, stretch, $sp-3);
    flex-wrap: wrap;

    > * {
      flex: 1 1 200px;
    }
  }

  &__filters {
    @include flex(row, flex-start, flex-end, $sp-3);
    flex-wrap: wrap;

    > :first-child {
      flex: 1 1 220px;
      max-width: 320px;
    }
  }

  &__skeleton {
    @include flex-col($sp-3);
  }
}

.ranking {
  @include flex(row, flex-start, stretch, $sp-2);
  flex-wrap: nowrap;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding-bottom: 4px;
  @include scrollbar();

  &__item {
    @include flex-col(2px);
    align-items: flex-start;
    flex: 0 0 auto;
    scroll-snap-align: start;
    padding: $sp-2 $sp-3;
    border: 1px solid $border-color;
    border-radius: $radius-md;
    background: none;
    cursor: pointer;
    text-align: left;

    &--active {
      border-color: $primary;
      background: rgba($primary, 0.06);
    }
  }

  &__name {
    font-weight: 600;
    font-size: $fs-sm;
  }

  &__total {
    color: $primary;
    font-weight: 700;
  }

  &__count {
    font-size: $fs-xs;
    color: rgba($primary-dark, 0.55);
  }
}

.strong {
  display: block;
  font-weight: 600;
}

.sub {
  display: block;
  font-size: $fs-xs;
  color: rgba($primary-dark, 0.55);
}

.link,
.apply,
.danger {
  @include flex(row, flex-start, center, 6px);
  border: none;
  background: none;
  cursor: pointer;
  font-size: $fs-sm;
  padding: 4px 6px;
  border-radius: $radius-xs;
  text-decoration: none;
}

.link {
  color: $primary;
  display: inline-flex;
}

.apply {
  color: $alert-info;
  font-weight: 600;
}

.danger {
  color: $alert-error;
}

.actions {
  @include flex(row, flex-end, center, 4px);
  flex-wrap: wrap;
}

.cards {
  @include flex-col($sp-3);
}

.card {
  @include card($sp-4);
  @include flex-col($sp-3);

  &__head {
    @include flex-between(center, $sp-3);

    h3 {
      margin: 0;
      font-size: $fs-md;
    }
  }

  &__amount {
    color: $primary-dark;
  }

  &__meta {
    @include flex-col(6px);
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: $fs-sm;

    li {
      @include flex(row, space-between, center, 8px);

      span:first-child {
        color: rgba($primary-dark, 0.55);
      }
    }
  }

  &__foot {
    @include flex(row, flex-start, center, $sp-3);
    flex-wrap: wrap;
    padding-top: $sp-2;
    border-top: 1px solid $border-color;
  }
}
</style>
