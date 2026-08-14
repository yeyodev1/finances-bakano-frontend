<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseButton, BaseEmptyState, BaseSelect, BaseTabs } from '@/components/base'
import RetentionKpis from './RetentionKpis.vue'
import GuaranteesTable from './GuaranteesTable.vue'
import RefundsTable from './RefundsTable.vue'
import GuaranteeOpenModal from './GuaranteeOpenModal.vue'
import GuaranteeExtendModal from './GuaranteeExtendModal.vue'
import GuaranteeCloseModal from './GuaranteeCloseModal.vue'
import RefundModal from './RefundModal.vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useFormat } from '@/composables/useFormat'
import { apiErrorMessage } from '@/stores/clients'
import { useRetentionStore } from '@/stores/retention'
import { useUserStore } from '@/stores/user'
import { GUARANTEE_STATUS_OPTIONS } from '@/config/retention'
import type { SelectOption } from '@/types'
import type { Guarantee, GuaranteeStatus, Refund } from '@/types'

const store = useRetentionStore()
const user = useUserStore()
const toast = useToast()
const { confirm } = useConfirm()
const { formatMoney } = useFormat()

const tab = ref<'guarantees' | 'refunds'>('guarantees')

const tabs = computed(() => [
  {
    value: 'guarantees',
    label: 'Garantías',
    icon: 'fa-solid fa-shield-halved',
    badge: store.guarantees.length || undefined,
  },
  {
    value: 'refunds',
    label: 'Reembolsos',
    icon: 'fa-solid fa-rotate-left',
    badge: store.refunds.length || undefined,
  },
])

const filterOptions = computed<SelectOption[]>(() => [
  { value: 'todas', label: 'Todas las garantías', icon: 'fa-solid fa-list' },
  { value: 'abiertas', label: 'Solo en curso', icon: 'fa-solid fa-hourglass-half' },
  ...GUARANTEE_STATUS_OPTIONS,
])

const filterModel = computed<string | number | null>({
  get: () => store.statusFilter ?? 'todas',
  set: (value) => {
    store.statusFilter =
      !value || value === 'todas' ? null : (value as GuaranteeStatus | 'abiertas')
  },
})

const openModal = ref(false)
const extendModal = ref(false)
const closeModal = ref(false)
const refundModal = ref(false)
const selected = ref<Guarantee | null>(null)

onMounted(() => {
  if (!store.loaded) void store.load().catch(() => undefined)
})

function onExtend(row: Guarantee) {
  selected.value = row
  extendModal.value = true
}

function onClose(row: Guarantee) {
  selected.value = row
  closeModal.value = true
}

async function onRemoveRefund(row: Refund) {
  const ok = await confirm({
    title: 'Eliminar el reembolso',
    message: `Se borrará la devolución de ${formatMoney(row.amount)} a ${row.clientName} y el cobro volverá a contarse completo. La baja del cliente, si la hubo, no se revierte.`,
    confirmText: 'Eliminar',
    variant: 'danger',
  })
  if (!ok) return

  try {
    const result = await store.removeRefund(row._id)
    toast.success('Reembolso eliminado', result.message)
  } catch (error) {
    toast.error('No se pudo eliminar el reembolso', apiErrorMessage(error))
  }
}

async function reload() {
  try {
    await store.refresh()
  } catch (error) {
    toast.error('No se pudo actualizar', apiErrorMessage(error))
  }
}
</script>

<template>
  <div class="ret">
    <header class="ret__header">
      <div class="ret__title">
        <h1><i class="fa-solid fa-shield-halved" aria-hidden="true" /> Garantías y reembolsos</h1>
        <p>Meses que regalamos para recuperar clientes, y plata que devolvemos cuando no funcionó</p>
      </div>

      <div class="ret__actions">
        <BaseButton variant="primary" icon="fa-solid fa-shield-halved" @click="openModal = true">
          Dar garantía
        </BaseButton>
        <BaseButton variant="danger" icon="fa-solid fa-rotate-left" @click="refundModal = true">
          Registrar reembolso
        </BaseButton>
        <BaseButton
          variant="ghost"
          icon="fa-solid fa-rotate"
          :loading="store.loading"
          @click="reload"
        >
          Actualizar
        </BaseButton>
      </div>
    </header>

    <BaseEmptyState
      v-if="store.error && !store.loading && !store.loaded"
      icon="fa-solid fa-plug-circle-exclamation"
      title="No se pudo cargar la retención"
      :message="store.error"
    >
      <template #action>
        <BaseButton icon="fa-solid fa-rotate" :loading="store.loading" @click="reload">
          Reintentar
        </BaseButton>
      </template>
    </BaseEmptyState>

    <template v-else>
      <RetentionKpis
        :guarantees="store.guaranteeSummary"
        :refunds="store.refundSummary"
        :loading="store.loading"
      />

      <section class="ret__cost">
        <i class="fa-solid fa-scale-balanced" aria-hidden="true" />
        <p>
          La política de garantía lleva
          <strong>{{ formatMoney(store.retentionCost) }}</strong>
          entre meses regalados y dinero devuelto, y recuperó
          <strong>{{ store.guaranteeSummary.recovered }}</strong>
          cliente(s) que iban a irse.
        </p>
      </section>

      <BaseTabs v-model="tab" :tabs="tabs" />

      <template v-if="tab === 'guarantees'">
        <div class="ret__filters">
          <BaseSelect
            v-model="filterModel"
            :options="filterOptions"
            label="Estado"
            icon="fa-solid fa-filter"
          />
        </div>

        <GuaranteesTable
          :rows="store.visibleGuarantees"
          :loading="store.loading"
          @extend="onExtend"
          @close="onClose"
        />
      </template>

      <RefundsTable
        v-else
        :rows="store.refunds"
        :loading="store.loading"
        :can-delete="user.isSuperadmin"
        @remove="onRemoveRefund"
      />
    </template>

    <GuaranteeOpenModal v-model="openModal" @opened="reload" />
    <RefundModal v-model="refundModal" @registered="reload" />
    <GuaranteeExtendModal v-model="extendModal" :guarantee="selected" @extended="reload" />
    <GuaranteeCloseModal v-model="closeModal" :guarantee="selected" @closed="reload" />
  </div>
</template>

<style scoped lang="scss">
.ret {
  @include flex-col($sp-5);
  padding-bottom: $sp-10;
}

.ret__header {
  @include flex-col($sp-3);

  @include md {
    @include flex-between(flex-end, $sp-4);
  }
}

.ret__title {
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

.ret__actions {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
}

.ret__cost {
  @include flex(row, flex-start, flex-start, $sp-3);
  padding: $sp-3 $sp-4;
  border-radius: $radius-md;
  border: 1px solid $border-color;
  background: $surface-alt;
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i {
    color: $primary;
    font-size: $fs-md;
    margin-top: 1px;
  }

  strong {
    color: $primary-dark;
  }
}

.ret__filters {
  @include flex(row, flex-start, flex-end, $sp-3);
  flex-wrap: wrap;

  > * {
    flex: 1 1 220px;
    min-width: 0;
    max-width: 320px;
  }
}
</style>
