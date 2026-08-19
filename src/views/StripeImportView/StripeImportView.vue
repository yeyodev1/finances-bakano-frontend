<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BaseBadge,
  BaseButton,
  BaseEmptyState,
  BaseModal,
  BaseSelect,
  BaseSkeleton,
  BaseTable,
} from '@/components/base'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useConfirm } from '@/composables/useConfirm'
import { useFormat } from '@/composables/useFormat'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage, useClientsStore } from '@/stores/clients'
import { useStripeImportStore } from '@/stores/submissions'
import type { StripeCustomerRow } from '@/types'

/**
 * Vinculación 1 a 1 de customers de Stripe con clientes de finanzas. La máquina
 * sugiere por similitud de nombre (mismo criterio que la vinculación de
 * espacios); el humano confirma. Con el vínculo hecho, "Importar cobros" trae
 * los cargos históricos y el webhook registra los futuros solo.
 */
const store = useStripeImportStore()
const clients = useClientsStore()
const toast = useToast()
const { confirm } = useConfirm()
const { isMobile } = useBreakpoint()
const { formatMoney, formatDateShort, formatPeriod } = useFormat()

async function load() {
  try {
    await store.fetch()
    if (store.configured) await clients.fetchPicker()
  } catch (error) {
    toast.error('Error al consultar Stripe', apiErrorMessage(error))
  }
}

onMounted(load)

const columns = [
  { key: 'name', label: 'Customer en Stripe' },
  { key: 'created', label: 'Cliente desde' },
  { key: 'link', label: 'Cliente en Finanzas' },
  { key: 'actions', label: '', align: 'right' },
]

/** Selección manual por fila cuando la sugerencia no alcanza. */
const manualSelection = ref<Record<string, string>>({})

function bestSuggestion(row: StripeCustomerRow) {
  return row.suggestions[0] || null
}

async function linkTo(row: StripeCustomerRow, clientId: string, clientName: string) {
  const ok = await confirm({
    title: 'Vincular con Stripe',
    message: `${clientName} quedará vinculado al customer ${row.name} (${row.stripeCustomerId}). Los pagos futuros de ese customer se registrarán solos.`,
    confirmLabel: 'Vincular',
  })
  if (!ok) return

  try {
    const result = await store.link(clientId, row.stripeCustomerId)
    toast.success('Cliente vinculado', result.message)
  } catch (error) {
    toast.error('No se pudo vincular', apiErrorMessage(error))
  }
}

function linkManual(row: StripeCustomerRow) {
  const clientId = manualSelection.value[row.stripeCustomerId]
  if (!clientId) return
  const option = clients.picker.find((c) => c._id === clientId)
  void linkTo(row, clientId, option?.name || 'El cliente')
}

async function unlink(row: StripeCustomerRow) {
  if (!row.linkedClientId) return
  const ok = await confirm({
    title: 'Desvincular este perfil de Stripe',
    message: `Se quitará el perfil ${row.stripeCustomerId} de ${row.linkedClientName}. Si el cliente tiene otros perfiles vinculados, esos se conservan.`,
    confirmLabel: 'Desvincular perfil',
    variant: 'danger',
  })
  if (!ok) return

  try {
    const result = await store.unlink(row.linkedClientId, row.stripeCustomerId)
    toast.success('Cliente desvinculado', result.message)
  } catch (error) {
    toast.error('No se pudo desvincular', apiErrorMessage(error))
  }
}

// Importación de cargos históricos con resumen en modal.
const summaryOpen = ref(false)

async function importCharges(row: StripeCustomerRow) {
  if (!row.linkedClientId) return
  try {
    await store.importCharges(row.linkedClientId)
    summaryOpen.value = true
  } catch (error) {
    toast.error('No se pudieron importar los cobros', apiErrorMessage(error))
  }
}

const summary = computed(() => store.lastImport)
</script>

<template>
  <div class="stripe-view">
    <header class="stripe-view__header">
      <div class="stripe-view__title">
        <h1><i class="fa-brands fa-stripe-s" aria-hidden="true" /> Stripe</h1>
        <p>Vincula cada customer de Stripe con su cliente e importa los cobros con tarjeta</p>
      </div>
      <BaseButton
        variant="ghost"
        icon="fa-solid fa-rotate"
        :loading="store.loading"
        @click="load"
      >
        Actualizar
      </BaseButton>
    </header>

    <div v-if="store.loading" class="stripe-view__skeleton">
      <BaseSkeleton v-for="n in 5" :key="n" height="60px" />
    </div>

    <BaseEmptyState
      v-else-if="store.configured === false"
      icon="fa-brands fa-stripe-s"
      title="Stripe no está configurado"
      message="Falta la clave STRIPE_SECRET_KEY en el servidor. Configúrala y vuelve a entrar."
    />

    <BaseEmptyState
      v-else-if="!store.customers.length"
      icon="fa-brands fa-stripe-s"
      title="Sin customers en Stripe"
      message="La cuenta de Stripe no tiene customers todavía."
    />

    <div v-else-if="isMobile" class="cards">
      <article v-for="row in store.customers" :key="row.stripeCustomerId" class="card">
        <header class="card__head">
          <div>
            <h3>{{ row.name }}</h3>
            <span class="sub">{{ row.email || row.stripeCustomerId }}</span>
          </div>
          <BaseBadge
            v-if="row.linkedClientName"
            variant="success"
            icon="fa-solid fa-link"
            :label="row.linkedClientName"
          />
        </header>

        <div v-if="!row.linkedClientId" class="card__linker">
          <BaseButton
            v-if="bestSuggestion(row)"
            variant="primary"
            size="sm"
            icon="fa-solid fa-wand-magic-sparkles"
            :loading="store.saving"
            @click="linkTo(row, bestSuggestion(row)!.clientId, bestSuggestion(row)!.clientName)"
          >
            Vincular con {{ bestSuggestion(row)!.clientName }}
            ({{ Math.round(bestSuggestion(row)!.score * 100) }}%)
          </BaseButton>
          <div class="manual">
            <BaseSelect
              :model-value="manualSelection[row.stripeCustomerId] ?? ''"
              :options="clients.pickerOptions"
              placeholder="Elegir cliente…"
              searchable
              @update:model-value="manualSelection[row.stripeCustomerId] = String($event)"
            />
            <BaseButton
              variant="ghost"
              size="sm"
              icon="fa-solid fa-link"
              :disabled="!manualSelection[row.stripeCustomerId]"
              @click="linkManual(row)"
            >
              Vincular
            </BaseButton>
          </div>
        </div>

        <footer v-else class="card__foot">
          <BaseButton
            variant="success"
            size="sm"
            icon="fa-solid fa-cloud-arrow-down"
            :loading="store.importing === row.linkedClientId"
            @click="importCharges(row)"
          >
            Importar cobros
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="sm"
            icon="fa-solid fa-link-slash"
            @click="unlink(row)"
          >
            Desvincular
          </BaseButton>
        </footer>
      </article>
    </div>

    <BaseTable v-else :columns="columns" :rows="store.customers" row-key="stripeCustomerId">
      <template #cell-name="{ row }">
        <span class="strong">{{ (row as StripeCustomerRow).name }}</span>
        <span class="sub">{{ (row as StripeCustomerRow).email || (row as StripeCustomerRow).stripeCustomerId }}</span>
      </template>

      <template #cell-created="{ row }">
        {{ formatDateShort((row as StripeCustomerRow).created) }}
      </template>

      <template #cell-link="{ row }">
        <BaseBadge
          v-if="(row as StripeCustomerRow).linkedClientName"
          variant="success"
          icon="fa-solid fa-link"
          :label="(row as StripeCustomerRow).linkedClientName!"
        />
        <div v-else class="linker">
          <BaseButton
            v-if="bestSuggestion(row as StripeCustomerRow)"
            variant="primary"
            size="sm"
            icon="fa-solid fa-wand-magic-sparkles"
            :loading="store.saving"
            @click="
              linkTo(
                row as StripeCustomerRow,
                bestSuggestion(row as StripeCustomerRow)!.clientId,
                bestSuggestion(row as StripeCustomerRow)!.clientName,
              )
            "
          >
            {{ bestSuggestion(row as StripeCustomerRow)!.clientName }}
            ({{ Math.round(bestSuggestion(row as StripeCustomerRow)!.score * 100) }}%)
          </BaseButton>
          <div class="manual">
            <BaseSelect
              :model-value="manualSelection[(row as StripeCustomerRow).stripeCustomerId] ?? ''"
              :options="clients.pickerOptions"
              placeholder="Elegir cliente…"
              searchable
              @update:model-value="
                manualSelection[(row as StripeCustomerRow).stripeCustomerId] = String($event)
              "
            />
            <BaseButton
              variant="ghost"
              size="sm"
              icon="fa-solid fa-link"
              :disabled="!manualSelection[(row as StripeCustomerRow).stripeCustomerId]"
              @click="linkManual(row as StripeCustomerRow)"
            >
              Vincular
            </BaseButton>
          </div>
        </div>
      </template>

      <template #cell-actions="{ row }">
        <div v-if="(row as StripeCustomerRow).linkedClientId" class="actions">
          <BaseButton
            variant="success"
            size="sm"
            icon="fa-solid fa-cloud-arrow-down"
            :loading="store.importing === (row as StripeCustomerRow).linkedClientId"
            @click="importCharges(row as StripeCustomerRow)"
          >
            Importar cobros
          </BaseButton>
          <BaseButton
            variant="ghost"
            size="sm"
            icon="fa-solid fa-link-slash"
            @click="unlink(row as StripeCustomerRow)"
          >
            Desvincular
          </BaseButton>
        </div>
      </template>
    </BaseTable>

    <BaseModal
      v-model="summaryOpen"
      size="md"
      icon="fa-solid fa-cloud-arrow-down"
      title="Importación de cobros"
      :subtitle="summary?.clientName || ''"
    >
      <div v-if="summary" class="summary">
        <p class="summary__message">{{ summary.message }}</p>

        <section v-if="summary.imported.length">
          <h4><i class="fa-solid fa-circle-check" aria-hidden="true" /> Importados</h4>
          <ul>
            <li v-for="item in summary.imported" :key="item.stripeChargeId">
              {{ formatMoney(item.amount) }} → {{ formatPeriod(item.period) }}
              <small>{{ item.stripeChargeId }}</small>
            </li>
          </ul>
        </section>

        <section v-if="summary.crmSaved.length" class="summary__crm">
          <h4><i class="fa-solid fa-plug-circle-bolt" aria-hidden="true" /> Guardados como consumo CRM</h4>
          <ul>
            <li v-for="item in summary.crmSaved" :key="item.stripeChargeId">
              {{ formatMoney(item.amount) }} · {{ formatDateShort(item.paidAt) }}
              <small>{{ item.description || 'Cargo sin factura que calce: consumo del GoHighLevel' }}</small>
            </li>
          </ul>
          <p class="summary__note">
            Revísalos en la sección <strong>Consumo CRM</strong>; desde ahí se pueden aplicar a una
            factura si alguno era mensualidad.
          </p>
        </section>

        <p v-if="summary.skipped.length" class="summary__skipped">
          {{ summary.skipped.length }} cargo(s) ya estaban importados y se saltaron.
        </p>
      </div>

      <template #footer>
        <BaseButton variant="primary" @click="summaryOpen = false">Entendido</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped lang="scss">
.stripe-view {
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
    }
  }

  &__skeleton {
    @include flex-col($sp-3);
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

.linker,
.manual {
  @include flex(row, flex-start, center, 8px);
  flex-wrap: wrap;
}

.linker {
  @include flex-col(8px);
  align-items: flex-start;
}

.actions {
  @include flex(row, flex-end, center, 6px);
  flex-wrap: wrap;
}

.cards {
  @include flex-col($sp-3);
}

.card {
  @include card($sp-4);
  @include flex-col($sp-3);

  &__head {
    @include flex-between(flex-start, $sp-3);

    h3 {
      margin: 0;
      font-size: $fs-md;
    }
  }

  &__linker {
    @include flex-col($sp-2);
  }

  &__foot {
    @include flex(row, flex-start, center, $sp-3);
    flex-wrap: wrap;
    padding-top: $sp-2;
    border-top: 1px solid $border-color;
  }
}

.summary {
  @include flex-col($sp-3);

  &__message {
    margin: 0;
    font-weight: 600;
  }

  section {
    h4 {
      @include flex(row, flex-start, center, 8px);
      margin: 0 0 $sp-2;
      font-size: $fs-sm;
    }

    ul {
      @include flex-col(4px);
      list-style: none;
      margin: 0;
      padding: 0;
      font-size: $fs-sm;

      li small {
        display: block;
        color: rgba($primary-dark, 0.55);
      }
    }
  }

  &__crm h4 i {
    color: $alert-info;
  }

  &__note {
    margin: $sp-2 0 0;
    font-size: $fs-xs;
    color: rgba($primary-dark, 0.65);
  }

  &__skipped {
    margin: 0;
    font-size: $fs-xs;
    color: rgba($primary-dark, 0.55);
  }
}
</style>
