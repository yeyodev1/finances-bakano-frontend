<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BaseBadge,
  BaseButton,
  BaseEmptyState,
  BaseMonthPicker,
  BasePagination,
  BaseSearchInput,
  BaseSelect,
  BaseSkeleton,
  BaseStatCard,
  BaseWorkspaceAvatar,
} from '@/components/base'
import { useToast } from '@/composables/useToast'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { api } from '@/services/api.service'
import type { BadgeVariant } from '@/components/base'
import type { BillingSummary, EInvoiceRow, SelectOption } from '@/types'

/**
 * Facturas electrónicas emitidas.
 *
 * El listado sale de nuestra base y no de Dátil porque su API **no tiene
 * endpoint de listado**: solo consulta por id. Además así cada factura llega ya
 * ligada a su cliente y a lo cobrado, que es lo que permite conciliar.
 */
const toast = useToast()
const { formatMoney, formatPeriod, formatDate } = useFormat()

const rows = ref<EInvoiceRow[]>([])
const summary = ref<BillingSummary | null>(null)
const loading = ref(true)
const working = ref<string | null>(null)
const page = ref(1)
const pages = ref(1)
const total = ref(0)
const LIMIT = 50

const filters = ref({ q: '', estado: 'all', cobro: 'all', period: '' })

const ESTADO_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Todos los estados', icon: 'fa-solid fa-list' },
  { value: 'AUTORIZADO', label: 'Autorizada', icon: 'fa-solid fa-circle-check' },
  { value: 'RECIBIDO', label: 'Recibida por el SRI', icon: 'fa-solid fa-paper-plane' },
  { value: 'NO AUTORIZADO', label: 'No autorizada', icon: 'fa-solid fa-circle-xmark' },
  { value: 'ERROR', label: 'Con error', icon: 'fa-solid fa-triangle-exclamation' },
]

/** El cruce factura ↔ dinero es lo que de verdad hay que perseguir. */
const COBRO_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'Facturadas: todas', icon: 'fa-solid fa-list' },
  { value: 'pendiente', label: 'Facturadas sin cobrar', icon: 'fa-solid fa-hourglass-half' },
  { value: 'pagada', label: 'Facturadas y cobradas', icon: 'fa-solid fa-circle-check' },
]

const estadoModel = computed<string | number | null>({
  get: () => filters.value.estado,
  set: (v) => {
    filters.value.estado = String(v ?? 'all')
    void load(1)
  },
})

const cobroModel = computed<string | number | null>({
  get: () => filters.value.cobro,
  set: (v) => {
    filters.value.cobro = String(v ?? 'all')
    void load(1)
  },
})

async function load(target = page.value) {
  loading.value = true
  try {
    const [list, sum] = await Promise.all([
      api.listEInvoices({
        q: filters.value.q.trim() || undefined,
        estado: filters.value.estado === 'all' ? undefined : filters.value.estado,
        cobro: filters.value.cobro === 'all' ? undefined : filters.value.cobro,
        period: filters.value.period || undefined,
        page: target,
        limit: LIMIT,
      }),
      api.billingSummary(filters.value.period || undefined),
    ])
    rows.value = list.items
    total.value = list.total
    page.value = list.page
    pages.value = list.pages
    summary.value = sum
  } catch (error) {
    toast.error('No se pudieron cargar las facturas', apiErrorMessage(error))
  } finally {
    loading.value = false
  }
}

onMounted(() => load(1))

async function refreshOne(row: EInvoiceRow) {
  working.value = row.invoiceId
  try {
    await api.refreshEInvoice(row.invoiceId)
    toast.success('Estado actualizado', row.clientName)
    await load()
  } catch (error) {
    toast.error('No se pudo actualizar', apiErrorMessage(error))
  } finally {
    working.value = null
  }
}

const ESTADO_TONE: Record<string, BadgeVariant> = {
  AUTORIZADO: 'success',
  RECIBIDO: 'info',
  ENVIADO: 'info',
  'NO AUTORIZADO': 'danger',
  DEVUELTO: 'danger',
  ERROR: 'danger',
}

function tone(estado?: string): BadgeVariant {
  return ESTADO_TONE[estado ?? ''] ?? 'neutral'
}
</script>

<template>
  <div class="fx">
    <header class="fx__header">
      <div class="fx__title">
        <h1><i class="fa-solid fa-file-invoice-dollar" aria-hidden="true" /> Facturas</h1>
        <p>Comprobantes electrónicos emitidos al SRI</p>
      </div>
      <BaseButton variant="ghost" icon="fa-solid fa-rotate" :loading="loading" @click="load()">
        Actualizar
      </BaseButton>
    </header>

    <!-- Aviso honesto: sin configurar, esta pantalla no puede hacer nada -->
    <p v-if="summary && !summary.configurada" class="fx__warn">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      La facturación electrónica no está configurada. Falta:
      <strong>{{ summary.faltaConfigurar.join(', ') }}</strong>
    </p>

    <p v-else-if="summary && summary.ambiente === 1" class="fx__warn fx__warn--info">
      <i class="fa-solid fa-flask" aria-hidden="true" />
      Ambiente de <strong>pruebas</strong>: los comprobantes emitidos no tienen validez fiscal.
    </p>

    <div v-if="summary" class="fx__stats">
      <BaseStatCard
        label="Facturado"
        :value="formatMoney(summary.facturado)"
        icon="fa-solid fa-file-invoice"
        color="primary"
      />
      <BaseStatCard
        label="Facturado sin cobrar"
        :value="formatMoney(summary.facturadoSinCobrar)"
        icon="fa-solid fa-hourglass-half"
        color="warning"
        hint="Se emitió la factura pero el dinero no ha entrado"
      />
      <BaseStatCard
        label="Cobrado sin facturar"
        :value="formatMoney(summary.cobradoSinFacturar)"
        icon="fa-solid fa-triangle-exclamation"
        color="danger"
        hint="Entró el dinero y falta emitir la factura"
      />
      <BaseStatCard
        label="Sin facturar"
        :value="formatMoney(summary.sinFacturar)"
        icon="fa-solid fa-receipt"
        color="info"
        :hint="`${summary.pendienteAutorizacion} esperando autorización`"
      />
    </div>

    <div class="fx__filters">
      <BaseSearchInput v-model="filters.q" placeholder="Buscar cliente…" @search="load(1)" />
      <BaseSelect v-model="estadoModel" :options="ESTADO_OPTIONS" label="Estado en el SRI" />
      <BaseSelect v-model="cobroModel" :options="COBRO_OPTIONS" label="Cruce con el cobro" />
      <BaseMonthPicker v-model="filters.period" label="Período" @update:model-value="load(1)" />
    </div>

    <div v-if="loading && !rows.length" class="fx__skeleton">
      <BaseSkeleton v-for="n in 5" :key="n" height="76px" />
    </div>

    <BaseEmptyState
      v-else-if="!rows.length"
      icon="fa-solid fa-file-invoice-dollar"
      title="Sin facturas emitidas"
      message="Cuando emitas la factura de un cobro aparecerá aquí, con su estado en el SRI y si ya entró el dinero."
    />

    <TransitionGroup v-else name="list" tag="ul" class="rows">
      <li v-for="row in rows" :key="row.invoiceId" class="row">
        <RouterLink
          class="row__client"
          :to="{ name: 'ClientDetail', params: { id: row.clientId } }"
        >
          <BaseWorkspaceAvatar :src="row.clientImage" :name="row.clientName" size="sm" rounded="square" />
          <div class="row__id">
            <span class="row__name">{{ row.clientName }}</span>
            <span class="row__meta">
              {{ row.einvoice.numero || 'sin número' }} · {{ formatPeriod(row.period) }}
              <template v-if="row.taxId"> · {{ row.taxId }}</template>
            </span>
          </div>
        </RouterLink>

        <div class="row__amounts">
          <span class="row__amount">{{ formatMoney(row.amount) }}</span>
          <span v-if="row.einvoice.emitidaAt" class="row__date">
            emitida {{ formatDate(row.einvoice.emitidaAt) }}
          </span>
        </div>

        <div class="row__badges">
          <BaseBadge :variant="tone(row.einvoice.estado)">
            {{ row.einvoice.estado || 'Sin estado' }}
          </BaseBadge>
          <!-- El cruce con el dinero se dice con texto, no solo con color -->
          <BaseBadge :variant="row.conciliada ? 'success' : 'warning'">
            <template v-if="row.conciliada">Cobrada</template>
            <template v-else>Falta cobrar {{ formatMoney(row.saldo) }}</template>
          </BaseBadge>
        </div>

        <div class="row__actions">
          <a
            v-if="row.einvoice.urlPdf"
            class="row__link"
            :href="row.einvoice.urlPdf"
            target="_blank"
            rel="noopener"
          >
            <i class="fa-solid fa-file-pdf" aria-hidden="true" /> PDF
          </a>
          <a
            v-if="row.einvoice.urlXml"
            class="row__link"
            :href="row.einvoice.urlXml"
            target="_blank"
            rel="noopener"
          >
            <i class="fa-solid fa-file-code" aria-hidden="true" /> XML
          </a>
          <BaseButton
            size="sm"
            variant="ghost"
            icon="fa-solid fa-rotate"
            :loading="working === row.invoiceId"
            @click="refreshOne(row)"
          >
            Estado
          </BaseButton>
        </div>

        <p v-if="row.einvoice.error" class="row__error">
          <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          {{ row.einvoice.error }}
        </p>
      </li>
    </TransitionGroup>

    <BasePagination
      :page="page"
      :pages="pages"
      :total="total"
      :limit="LIMIT"
      :disabled="loading"
      item-label="facturas"
      @update:page="load"
    />
  </div>
</template>

<style scoped lang="scss">
.fx { @include flex-col($sp-5); padding-bottom: $sp-10; }

.fx__header {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.fx__title {
  h1 {
    @include flex(row, flex-start, center, $sp-3);
    font-size: $fs-xl;
    font-weight: 800;
    color: $primary-dark;
    i { color: $primary; }
  }
  p { font-size: $fs-xs; color: $text-secondary; margin-top: $sp-1; }
}

.fx__warn {
  @include flex(row, flex-start, center, $sp-2);
  padding: $sp-3 $sp-4;
  border-radius: $radius-sm;
  background: rgba($alert-error, 0.07);
  border: 1px solid rgba($alert-error, 0.25);
  font-size: $fs-xs;
  color: $text-secondary;
  i { color: $alert-error; }
  strong { color: $primary-dark; }

  &--info {
    background: $alert-info-bg;
    border-color: rgba($alert-info, 0.25);
    i { color: $alert-info; }
  }
}

.fx__stats {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;
  > * { flex: 1 1 210px; min-width: 0; }
}

.fx__filters {
  @include flex(row, flex-start, flex-end, $sp-3);
  flex-wrap: wrap;
  > * { flex: 1 1 200px; min-width: 0; }
}

.fx__skeleton { @include flex-col($sp-2); }

.rows { @include flex-col($sp-2); }

.row {
  @include flex(row, flex-start, center, $sp-4);
  flex-wrap: wrap;
  padding: $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
  background: $surface;
}

.row__client {
  @include flex(row, flex-start, center, $sp-3);
  flex: 1 1 220px;
  min-width: 0;
  color: inherit;
  text-decoration: none;

  &:hover .row__name { color: $primary; }
  &:focus-visible { @include focus-ring; }
}

.row__id { @include flex-col(2px); min-width: 0; }
.row__name { font-weight: 700; color: $primary-dark; @include truncate; }
.row__meta { font-size: $fs-xs; color: $text-secondary; @include truncate; }

.row__amounts { @include flex-col(2px); flex: 0 1 auto; text-align: right; }
.row__amount { font-weight: 800; color: $primary-dark; }
.row__date { font-size: 0.66rem; color: $text-secondary; }

.row__badges { @include flex(row, flex-start, center, $sp-2); flex-wrap: wrap; }

.row__actions { @include flex(row, flex-start, center, $sp-2); flex-wrap: wrap; }

.row__link {
  @include flex(row, flex-start, center, $sp-1);
  font-size: $fs-xs;
  font-weight: 600;
  color: $primary;
  text-decoration: none;
  &:hover { text-decoration: underline; }
  &:focus-visible { @include focus-ring; }
}

.row__error {
  flex: 1 1 100%;
  @include flex(row, flex-start, flex-start, $sp-2);
  font-size: $fs-xs;
  color: $alert-error;
  i { margin-top: 2px; }
}
</style>
