<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BaseButton,
  BaseCard,
  BaseEmptyState,
  BaseSkeleton,
  BaseTabs,
} from '@/components/base'
import { BankCashflowChart } from '@/components/charts'
import BankAccountRail from './BankAccountRail.vue'
import BankCounterparties from './BankCounterparties.vue'
import BankCardsTable from './BankCardsTable.vue'
import BankStatementsTable from './BankStatementsTable.vue'
import BankSubscriptionDrawer from './BankSubscriptionDrawer.vue'
import BankSubscriptionsFilters from './BankSubscriptionsFilters.vue'
import BankSubscriptionsPanel from './BankSubscriptionsPanel.vue'
import BankTransactionDrawer from './BankTransactionDrawer.vue'
import BankTransactionsFilters from './BankTransactionsFilters.vue'
import BankTransactionsTable from './BankTransactionsTable.vue'
import { useBankStore } from '@/stores/bank'
import { useFormat } from '@/composables/useFormat'
import { useToast } from '@/composables/useToast'
import type { TabItem } from '@/components/base'
import type { BankAccount, BankSubscription, BankTransaction } from '@/types'

/**
 * Banco (Mercury) — solo lectura.
 *
 * Jerarquía de la pantalla: primero cuánta plata hay y dónde, después lo que exige una
 * decisión (suscripciones rebotando), y recién al final el detalle de la cuenta elegida.
 */

const store = useBankStore()
const toast = useToast()
const { formatMoney } = useFormat()

const tab = ref<string | number>('transactions')
const drawerOpen = ref(false)
const selectedTx = ref<BankTransaction | null>(null)
const subDrawerOpen = ref(false)
const selectedSub = ref<BankSubscription | null>(null)

const tabs = computed<TabItem[]>(() => [
  { value: 'transactions', label: 'Movimientos', icon: 'fa-solid fa-money-bill-transfer' },
  {
    value: 'subscriptions',
    label: 'Suscripciones',
    icon: 'fa-solid fa-arrows-rotate',
    badge: store.subscriptions?.totals.active || undefined,
  },
  { value: 'flow', label: 'Flujo', icon: 'fa-solid fa-chart-column' },
  {
    value: 'cards',
    label: 'Tarjetas',
    icon: 'fa-solid fa-credit-card',
    badge: store.cards.length || undefined,
  },
  { value: 'statements', label: 'Estados', icon: 'fa-solid fa-file-invoice' },
])

const held = computed(() => store.totalBalance - store.availableBalance)
const netMonth = computed(() => store.currentMonth?.net ?? 0)

const accountName = computed(() => {
  const account = store.account
  if (!account) return 'la cuenta'
  return (account.nickname || account.name || 'Cuenta').split('|')[0]?.trim() || 'Cuenta'
})

const rangeLabel = computed(() => {
  if (!store.transactions.length) return 'Sin movimientos'
  const from = (store.page - 1) * store.limit + 1
  return `Movimientos ${from}–${from + store.transactions.length - 1}`
})

const failingCount = computed(() => store.failingSubscriptions.length)

onMounted(async () => {
  const data = await store.loadOverview()
  if (!data) {
    await store.loadHealth()
    return
  }
  await Promise.all([
    store.loadTransactions(),
    store.loadCards(),
    store.loadStatements(),
    store.loadSubscriptions(),
  ])
})

async function selectAccount(account: BankAccount) {
  await store.selectAccount(account.id)
}

function openTransaction(tx: BankTransaction) {
  selectedTx.value = tx
  drawerOpen.value = true
}

function openSubscription(subscription: BankSubscription) {
  selectedSub.value = subscription
  subDrawerOpen.value = true
}

function goToFailingSubscriptions() {
  store.subscriptionFilters.status = 'failing'
  tab.value = 'subscriptions'
}

async function refresh() {
  await store.refreshAll()
  if (store.error) toast.error('No se pudo refrescar el banco', store.error)
  else toast.success('Banco actualizado', 'Datos releídos directamente desde Mercury.')
}
</script>

<template>
  <div class="bank">
    <!-- ── Cuánta plata hay y dónde ──────────────────────────── -->
    <section v-if="!store.notConfigured && !store.unreachable" class="hero">
      <header class="hero__top">
        <div>
          <p class="hero__label">Saldo total en Mercury</p>
          <p class="hero__total">
            <BaseSkeleton v-if="store.loadingOverview && !store.accounts.length" height="46px" width="220px" />
            <template v-else>{{ formatMoney(store.totalBalance) }}</template>
          </p>
          <p class="hero__detail">
            {{ formatMoney(store.availableBalance) }} disponible
            <template v-if="held > 0.005"> · {{ formatMoney(held) }} retenido</template>
            <template v-if="store.pendingCount">
              · {{ store.pendingCount }} movimientos por postear
            </template>
          </p>
        </div>

        <div class="hero__actions">
          <span class="hero__mode">
            <i class="fa-solid fa-eye" aria-hidden="true" /> Solo lectura
          </span>
          <BaseButton
            variant="outline"
            size="sm"
            icon="fa-solid fa-arrows-rotate"
            :loading="store.refreshing"
            @click="refresh"
          >
            Actualizar
          </BaseButton>
        </div>
      </header>

      <BankAccountRail
        :accounts="store.accounts"
        :selected-id="store.accountId"
        :loading="store.loadingOverview"
        @select="selectAccount"
      />
    </section>

    <!-- ── Lo que exige una decisión ─────────────────────────── -->
    <button v-if="failingCount" type="button" class="alarm" @click="goToFailingSubscriptions">
      <i class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
      <span class="alarm__text">
        <strong>
          {{ failingCount }}
          {{ failingCount === 1 ? 'suscripción con el cobro rechazado' : 'suscripciones con el cobro rechazado' }}
        </strong>
        {{ store.failingSubscriptions.map((s) => s.name).join(' · ') }}. Si no se arregla la
        tarjeta, esos servicios se cortan.
      </span>
      <span class="alarm__cta">Revisar <i class="fa-solid fa-arrow-right" aria-hidden="true" /></span>
    </button>

    <!-- ── Integración caída o sin configurar ────────────────── -->
    <BaseEmptyState
      v-if="store.notConfigured"
      icon="fa-solid fa-plug-circle-xmark"
      title="Integración con Mercury no configurada"
      :message="store.error || 'Falta definir MERCURY_API_TOKEN en el servidor de finanzas.'"
    />

    <BaseEmptyState
      v-else-if="store.unreachable"
      icon="fa-solid fa-shield-halved"
      title="Mercury rechazó la conexión"
      :message="store.health?.message || store.error || 'Revisa el token y el whitelist de IPs en Mercury.'"
    />

    <template v-else>
      <!-- ── Todo el detalle vive en pestañas: nada queda enterrado abajo ── -->
      <section class="detail">
        <header class="detail__head">
          <h2>{{ accountName }}</h2>
          <p v-if="store.account?.accountNumber">
            ··{{ store.account.accountNumber.slice(-4) }} ·
            {{ formatMoney(store.account.currentBalance) }} ·
            {{ store.pendingCount }} por postear
          </p>
        </header>

        <BaseTabs v-model="tab" :tabs="tabs" />

        <Transition name="fade-slide" mode="out-in">
          <div v-if="tab === 'flow'" key="flow" class="bank__panel">
            <div class="bank__grid">
              <BaseCard
                title="Entradas y salidas por mes"
                :subtitle="`Neto de este mes: ${formatMoney(netMonth)}`"
                icon="fa-solid fa-chart-column"
              >
                <BankCashflowChart :points="store.overview?.cashflow || []" />
              </BaseCard>

              <BaseCard
                title="A quién se le paga"
                subtitle="Contrapartes con más movimiento"
                icon="fa-solid fa-handshake"
              >
                <BankCounterparties
                  :items="store.overview?.topCounterparties || []"
                  :loading="store.loadingOverview"
                />
              </BaseCard>
            </div>
          </div>

          <div v-else-if="tab === 'subscriptions'" key="subscriptions" class="bank__panel">
            <BankSubscriptionsPanel
              :report="store.subscriptions"
              :items="store.filteredSubscriptions"
              :totals="store.filteredSubscriptionTotals"
              :loading="store.loadingSubscriptions"
              @open="openSubscription"
            >
              <template #filters>
                <BankSubscriptionsFilters
                  v-model="store.subscriptionFilters"
                  :counts="{ failing: failingCount }"
                  @reset="store.resetSubscriptionFilters()"
                />
              </template>
            </BankSubscriptionsPanel>
          </div>

          <div v-else-if="tab === 'cards'" key="cards" class="bank__panel">
            <BankCardsTable :items="store.cards" :loading="store.loadingCards" />
          </div>

          <div v-else-if="tab === 'statements'" key="statements" class="bank__panel">
            <BankStatementsTable :items="store.statements" :loading="store.loadingStatements" />
          </div>

          <div v-else key="transactions" class="bank__panel">
            <BankTransactionsFilters
              v-model="store.filters"
              @apply="store.applyFilters()"
              @reset="store.resetFilters()"
            />

            <BankTransactionsTable
              :items="store.transactions"
              :loading="store.loadingTransactions"
              @open="openTransaction"
            />

            <footer v-if="store.hasMoreTransactions || store.page > 1" class="pager">
              <span>{{ rangeLabel }}</span>
              <div class="pager__btns">
                <BaseButton
                  variant="ghost"
                  size="sm"
                  icon="fa-solid fa-chevron-left"
                  :disabled="store.page <= 1 || store.loadingTransactions"
                  @click="store.setPage(store.page - 1)"
                >
                  Anterior
                </BaseButton>
                <BaseButton
                  variant="ghost"
                  size="sm"
                  icon-right="fa-solid fa-chevron-right"
                  :disabled="!store.hasMoreTransactions || store.loadingTransactions"
                  @click="store.setPage(store.page + 1)"
                >
                  Siguiente
                </BaseButton>
              </div>
            </footer>
          </div>
        </Transition>
      </section>
    </template>

    <BankTransactionDrawer v-model="drawerOpen" :transaction="selectedTx" />
    <BankSubscriptionDrawer v-model="subDrawerOpen" :subscription="selectedSub" />
  </div>
</template>

<style scoped lang="scss">
.bank {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

// ── Hero ───────────────────────────────────────────────────────
.hero {
  @include flex-col($sp-5);
  padding: $sp-4;
  border-radius: $radius-lg;
  background: $primary-dark;
  color: $white;
  // El carrusel de cuentas sangra hasta el borde en móvil sin desbordar la página.
  overflow: hidden;

  @include md {
    padding: $sp-6;
  }
}

.hero__top {
  @include flex-col($sp-4);

  @include md {
    @include flex-between(flex-start, $sp-4);
    flex-wrap: wrap;
  }
}

.hero__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba($white, 0.5);
}

.hero__total {
  // Escala con el ancho: en 320px no se parte, en desktop llena.
  font-size: clamp(1.9rem, 7vw, 3rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  margin-top: $sp-2;
}

.hero__detail {
  font-size: $fs-xs;
  color: rgba($white, 0.65);
  margin-top: $sp-2;
  font-variant-numeric: tabular-nums;
}

.hero__actions {
  @include flex(row, flex-start, center, $sp-3);
  flex-wrap: wrap;
  flex-shrink: 0;

  :deep(.btn) {
    border-color: rgba($white, 0.25);
    color: $white;

    &:hover {
      background: rgba($white, 0.1);
      border-color: rgba($white, 0.4);
    }
  }
}

.hero__mode {
  @include flex(row, flex-start, center, $sp-2);
  padding: 4px $sp-3;
  border-radius: $radius-full;
  background: rgba($white, 0.1);
  color: rgba($white, 0.75);
  font-size: 0.68rem;
  font-weight: 600;
  white-space: nowrap;
}

// ── Alarma accionable ──────────────────────────────────────────
.alarm {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;
  width: 100%;
  text-align: left;
  padding: $sp-4;

  @include md {
    align-items: center;
    flex-wrap: nowrap;
  }
  border-radius: $radius-md;
  border: 1px solid rgba($alert-error, 0.3);
  background: $alert-error-bg;
  cursor: pointer;
  transition: border-color $transition-fast;

  &:hover {
    border-color: rgba($alert-error, 0.6);
  }

  > i {
    color: $alert-error;
    font-size: $fs-md;
    flex-shrink: 0;
  }
}

.alarm__text {
  flex: 1 1 240px;
  min-width: 0;
  font-size: $fs-xs;
  color: $text-secondary;
  line-height: 1.5;

  strong {
    display: block;
    color: $primary-dark;
    font-size: $fs-sm;
  }
}

.alarm__cta {
  @include flex(row, flex-start, center, $sp-2);
  flex: none;
  margin-left: auto;
  font-size: $fs-xs;
  font-weight: 700;
  color: $alert-error;
}

// ── Contenido ──────────────────────────────────────────────────
.bank__grid {
  @include flex(row, flex-start, stretch, $sp-3);
  flex-wrap: wrap;

  // El gráfico manda; las contrapartes acompañan. Bajan a una columna solas.
  > :first-child {
    flex: 1 1 420px;
    min-width: 0;
  }

  > :last-child {
    flex: 1 1 280px;
    min-width: 0;
  }
}

.detail {
  @include flex-col($sp-4);
}

.detail__head {
  h2 {
    font-size: $fs-md;
    font-weight: 700;
    color: $primary-dark;
  }

  p {
    font-size: $fs-xs;
    color: $text-secondary;
    margin-top: 2px;
    font-variant-numeric: tabular-nums;
  }
}

.bank__panel {
  @include flex-col($sp-4);
}

.pager {
  @include flex-between(center, $sp-3);
  font-size: $fs-xs;
  color: $text-secondary;
}

.pager__btns {
  @include flex(row, flex-start, center, $sp-2);
}
</style>
