<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  BaseBadge,
  BaseEmptyState,
  BasePagination,
  BaseSkeleton,
  BaseTable,
  BaseTabs,
} from '@/components/base'
import type { TabItem } from '@/components/base'
import ReceiptPreviewModal from '@/components/payments/ReceiptPreviewModal.vue'
import SubmissionReviewModal from './SubmissionReviewModal.vue'
import { useBreakpoint } from '@/composables/useBreakpoint'
import { useFormat } from '@/composables/useFormat'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage } from '@/stores/clients'
import { useSubmissionsStore } from '@/stores/submissions'
import type { Payment, PaymentSubmission, SubmissionStatus } from '@/types'

/**
 * Cola de verificación de transferencias subidas por clientes desde el portal.
 * El compromiso con el cliente son 48 horas laborables: lo vencido y aún
 * pendiente se marca en rojo con icono, nunca solo con color.
 */
const store = useSubmissionsStore()
const toast = useToast()
const { isMobile } = useBreakpoint()
const { formatMoney, formatDateTime } = useFormat()

const STATUS_BADGE: Record<SubmissionStatus, { variant: 'pending' | 'paid' | 'cancelled'; icon: string; label: string }> = {
  pending: { variant: 'pending', icon: 'fa-solid fa-hourglass-half', label: 'En verificación' },
  approved: { variant: 'paid', icon: 'fa-solid fa-circle-check', label: 'Aprobado' },
  rejected: { variant: 'cancelled', icon: 'fa-solid fa-circle-xmark', label: 'Rechazado' },
}

const tabs: TabItem[] = [
  { value: 'pending', label: 'Pendientes', icon: 'fa-solid fa-hourglass-half' },
  { value: 'approved', label: 'Aprobados', icon: 'fa-solid fa-circle-check' },
  { value: 'rejected', label: 'Rechazados', icon: 'fa-solid fa-circle-xmark' },
  { value: 'all', label: 'Todos', icon: 'fa-solid fa-list' },
]

const activeTab = computed({
  get: () => store.filters.status ?? 'all',
  set: (value: string | number) => {
    store.filters.status = value === 'all' ? null : (value as SubmissionStatus)
    void load(1)
  },
})

async function load(page = 1) {
  try {
    await store.fetch(page)
  } catch (error) {
    toast.error('Error al cargar comprobantes', apiErrorMessage(error))
  }
}

onMounted(() => load())

const columns = [
  { key: 'clientName', label: 'Cliente' },
  { key: 'amounts', label: 'Bruto / Fee / Neto', align: 'right' },
  { key: 'createdAt', label: 'Subido' },
  { key: 'reviewDueAt', label: 'Límite (48h laborables)' },
  { key: 'status', label: 'Estado' },
  { key: 'receipt', label: 'Comprobante' },
  { key: 'actions', label: '', align: 'right' },
]

function isOverdue(submission: PaymentSubmission): boolean {
  return submission.status === 'pending' && new Date(submission.reviewDueAt).getTime() < Date.now()
}

// Previsualización: ReceiptPreviewModal espera un Payment, así que se arma uno
// mínimo con los datos del comprobante.
const previewOpen = ref(false)
const previewed = ref<Payment | null>(null)

function preview(submission: PaymentSubmission) {
  previewed.value = {
    _id: submission._id,
    clientId: typeof submission.clientId === 'string' ? submission.clientId : submission.clientId._id,
    clientName: submission.clientName,
    amount: submission.netAmount,
    paidAt: submission.createdAt,
    period: '',
    currency: submission.currency,
    method: 'transferencia',
    receiptUrl: submission.receiptUrl,
    invoiceId: '',
    createdAt: submission.createdAt,
  } as Payment
  previewOpen.value = true
}

// Revisión (aprobar / rechazar)
const reviewOpen = ref(false)
const reviewMode = ref<'approve' | 'reject'>('approve')
const target = ref<PaymentSubmission | null>(null)

function openReview(submission: PaymentSubmission, mode: 'approve' | 'reject') {
  target.value = submission
  reviewMode.value = mode
  reviewOpen.value = true
}

async function onApprove(payload: { invoiceId?: string; reviewNote?: string }) {
  if (!target.value) return
  try {
    const result = await store.approve(target.value._id, payload)
    reviewOpen.value = false
    toast.success(
      'Comprobante aprobado',
      `Pago de ${formatMoney(result.payment.amount)} registrado para ${result.submission.clientName}.`,
    )
  } catch (error) {
    toast.error('No se pudo aprobar', apiErrorMessage(error))
  }
}

async function onReject(payload: { reviewNote: string }) {
  if (!target.value) return
  try {
    await store.reject(target.value._id, payload)
    reviewOpen.value = false
    toast.success('Comprobante rechazado', 'El cliente verá el motivo en su portal.')
  } catch (error) {
    toast.error('No se pudo rechazar', apiErrorMessage(error))
  }
}
</script>

<template>
  <div class="submissions">
    <header class="submissions__header">
      <div class="submissions__title">
        <h1><i class="fa-solid fa-file-circle-check" aria-hidden="true" /> Comprobantes</h1>
        <p>Transferencias subidas por clientes, pendientes de verificación manual</p>
      </div>
    </header>

    <BaseTabs v-model="activeTab" :tabs="tabs" />

    <div v-if="store.loading" class="submissions__skeleton">
      <BaseSkeleton v-for="n in 5" :key="n" height="60px" />
    </div>

    <BaseEmptyState
      v-else-if="store.isEmpty"
      icon="fa-solid fa-file-circle-check"
      title="Sin comprobantes"
      message="No hay comprobantes en este estado. Los que suban los clientes desde su portal aparecerán acá."
    />

    <div v-else-if="isMobile" class="cards">
      <article v-for="s in store.items" :key="s._id" class="card">
        <header class="card__head">
          <h3>{{ s.clientName }}</h3>
          <BaseBadge
            :variant="STATUS_BADGE[s.status].variant"
            :icon="STATUS_BADGE[s.status].icon"
            :label="STATUS_BADGE[s.status].label"
          />
        </header>
        <ul class="card__meta">
          <li>
            <span>Enviado</span> <strong>{{ formatMoney(s.grossAmount) }}</strong>
          </li>
          <li>
            <span>Fee</span> <strong>−{{ formatMoney(s.feeAmount) }}</strong>
          </li>
          <li class="card__net">
            <span>Neto</span> <strong>{{ formatMoney(s.netAmount) }}</strong>
          </li>
          <li>
            <span>Subido</span> {{ formatDateTime(s.createdAt) }}
          </li>
          <li :class="{ 'card__overdue': isOverdue(s) }">
            <span>Límite</span>
            <i v-if="isOverdue(s)" class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            {{ formatDateTime(s.reviewDueAt) }}
          </li>
          <li v-if="s.reviewNote"><span>Nota</span> {{ s.reviewNote }}</li>
        </ul>
        <footer class="card__foot">
          <button type="button" class="link" @click="preview(s)">
            <i class="fa-solid fa-eye" aria-hidden="true" /> Comprobante
          </button>
          <template v-if="s.status === 'pending'">
            <button type="button" class="approve" @click="openReview(s, 'approve')">
              <i class="fa-solid fa-circle-check" aria-hidden="true" /> Aprobar
            </button>
            <button type="button" class="danger" @click="openReview(s, 'reject')">
              <i class="fa-solid fa-circle-xmark" aria-hidden="true" /> Rechazar
            </button>
          </template>
        </footer>
      </article>
    </div>

    <BaseTable v-else :columns="columns" :rows="store.items" row-key="_id">
      <template #cell-clientName="{ row }">
        <span class="strong">{{ (row as PaymentSubmission).clientName }}</span>
        <span v-if="(row as PaymentSubmission).submittedByName" class="sub">
          Subió {{ (row as PaymentSubmission).submittedByName }}
        </span>
      </template>

      <template #cell-amounts="{ row }">
        <div class="amounts">
          <span>{{ formatMoney((row as PaymentSubmission).grossAmount) }}</span>
          <span class="amounts__fee">−{{ formatMoney((row as PaymentSubmission).feeAmount) }}</span>
          <strong>{{ formatMoney((row as PaymentSubmission).netAmount) }}</strong>
        </div>
      </template>

      <template #cell-createdAt="{ row }">
        {{ formatDateTime((row as PaymentSubmission).createdAt) }}
      </template>

      <template #cell-reviewDueAt="{ row }">
        <span :class="{ overdue: isOverdue(row as PaymentSubmission) }">
          <i
            v-if="isOverdue(row as PaymentSubmission)"
            class="fa-solid fa-triangle-exclamation"
            aria-hidden="true"
          />
          {{ formatDateTime((row as PaymentSubmission).reviewDueAt) }}
          <small v-if="isOverdue(row as PaymentSubmission)">SLA vencido</small>
        </span>
      </template>

      <template #cell-status="{ row }">
        <BaseBadge
          :variant="STATUS_BADGE[(row as PaymentSubmission).status].variant"
          :icon="STATUS_BADGE[(row as PaymentSubmission).status].icon"
          :label="STATUS_BADGE[(row as PaymentSubmission).status].label"
        />
      </template>

      <template #cell-receipt="{ row }">
        <button type="button" class="link" @click="preview(row as PaymentSubmission)">
          <i class="fa-solid fa-eye" aria-hidden="true" /> Ver
        </button>
      </template>

      <template #cell-actions="{ row }">
        <div v-if="(row as PaymentSubmission).status === 'pending'" class="actions">
          <button type="button" class="approve" @click="openReview(row as PaymentSubmission, 'approve')">
            <i class="fa-solid fa-circle-check" aria-hidden="true" /> Aprobar
          </button>
          <button type="button" class="danger" @click="openReview(row as PaymentSubmission, 'reject')">
            <i class="fa-solid fa-circle-xmark" aria-hidden="true" /> Rechazar
          </button>
        </div>
        <span v-else class="sub">{{ (row as PaymentSubmission).reviewedByName || '' }}</span>
      </template>
    </BaseTable>

    <BasePagination
      v-if="store.pages > 1"
      :page="store.page"
      :pages="store.pages"
      @update:page="load"
    />

    <ReceiptPreviewModal v-model="previewOpen" :payment="previewed" />

    <SubmissionReviewModal
      v-model="reviewOpen"
      :submission="target"
      :mode="reviewMode"
      :saving="store.saving"
      @approve="onApprove"
      @reject="onReject"
    />
  </div>
</template>

<style scoped lang="scss">
.submissions {
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

.amounts {
  @include flex-col(2px);
  align-items: flex-end;
  font-size: $fs-sm;

  &__fee {
    color: $alert-error;
    font-size: $fs-xs;
  }
}

.overdue {
  color: $alert-error;
  font-weight: 600;

  small {
    display: block;
    font-weight: 500;
  }
}

.link,
.approve,
.danger {
  @include flex(row, flex-start, center, 6px);
  border: none;
  background: none;
  cursor: pointer;
  font-size: $fs-sm;
  padding: 4px 6px;
  border-radius: $radius-xs;
}

.link {
  color: $primary;
}

.approve {
  color: $alert-success;
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

  &__net strong {
    color: $primary-dark;
  }

  &__overdue {
    color: $alert-error;
    font-weight: 600;
  }

  &__foot {
    @include flex(row, flex-start, center, $sp-3);
    flex-wrap: wrap;
    padding-top: $sp-2;
    border-top: 1px solid $border-color;
  }
}
</style>
