<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BaseButton } from '@/components/base'
import ReceiptPreviewModal from '@/components/payments/ReceiptPreviewModal.vue'
import SubmissionReviewModal from '@/components/payments/SubmissionReviewModal.vue'
import { useFormat } from '@/composables/useFormat'
import { useToast } from '@/composables/useToast'
import { apiErrorMessage } from '@/stores/clients'
import { useSubmissionsStore } from '@/stores/submissions'
import { useUserStore } from '@/stores/user'
import type { Payment, PaymentSubmission } from '@/types'

/**
 * Transferencias que los clientes suben desde su portal en métricas. Antes
 * vivían en su propia pantalla; ahora salen aquí arriba solo si hay alguna.
 */
const emit = defineEmits<{ reviewed: [] }>()

const store = useSubmissionsStore()
const userStore = useUserStore()
const toast = useToast()
const { formatMoney, formatDateTime } = useFormat()

// Mismo permiso que tenía la pantalla de Comprobantes.
const canReview = computed(() =>
  ['superadmin', 'admin', 'vendedor'].includes(userStore.user?.role ?? ''),
)
const pending = computed(() => store.items.filter((s) => s.status === 'pending'))

onMounted(async () => {
  if (!canReview.value) return
  store.filters.status = 'pending'
  try {
    await store.fetch(1)
  } catch (error) {
    toast.error('No se pudieron cargar los comprobantes', apiErrorMessage(error))
  }
})

function isLate(s: PaymentSubmission): boolean {
  return new Date(s.reviewDueAt).getTime() < Date.now()
}

const previewOpen = ref(false)
const previewed = ref<Payment | null>(null)

function preview(s: PaymentSubmission) {
  // ReceiptPreviewModal espera un Payment: se arma uno mínimo.
  previewed.value = {
    _id: s._id,
    clientId: typeof s.clientId === 'string' ? s.clientId : s.clientId._id,
    clientName: s.clientName,
    amount: s.netAmount,
    paidAt: s.createdAt,
    period: '',
    currency: s.currency,
    method: 'transferencia',
    receiptUrl: s.receiptUrl,
    invoiceId: '',
    createdAt: s.createdAt,
  } as Payment
  previewOpen.value = true
}

const reviewOpen = ref(false)
const reviewMode = ref<'approve' | 'reject'>('approve')
const target = ref<PaymentSubmission | null>(null)

function openReview(s: PaymentSubmission, mode: 'approve' | 'reject') {
  target.value = s
  reviewMode.value = mode
  reviewOpen.value = true
}

async function onApprove(payload: { invoiceId?: string; reviewNote?: string }) {
  if (!target.value) return
  try {
    const result = await store.approve(target.value._id, payload)
    reviewOpen.value = false
    toast.success('Comprobante aprobado', `Pago de ${formatMoney(result.payment.amount)} registrado para ${result.submission.clientName}.`)
    emit('reviewed')
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
  <section v-if="canReview && pending.length" class="pending" aria-label="Comprobantes por revisar">
    <h2 class="pending__title">
      <i class="fa-solid fa-file-circle-check" aria-hidden="true" />
      {{ pending.length }} comprobante{{ pending.length === 1 ? '' : 's' }} por revisar
    </h2>

    <ul class="pending__list">
      <li v-for="s in pending" :key="s._id" class="pending__row">
        <div class="pending__info">
          <strong>{{ s.clientName }} · {{ formatMoney(s.netAmount) }}</strong>
          <span :class="{ 'pending__late': isLate(s) }">
            <i v-if="isLate(s)" class="fa-solid fa-triangle-exclamation" aria-hidden="true" />
            Subido {{ formatDateTime(s.createdAt) }}{{ isLate(s) ? ' · pasó el plazo de 48 h' : '' }}
          </span>
        </div>
        <div class="pending__actions">
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-eye" @click="preview(s)">Ver</BaseButton>
          <BaseButton size="sm" variant="success" icon="fa-solid fa-circle-check" @click="openReview(s, 'approve')">
            Aprobar
          </BaseButton>
          <BaseButton size="sm" variant="ghost" icon="fa-solid fa-circle-xmark" @click="openReview(s, 'reject')">
            Rechazar
          </BaseButton>
        </div>
      </li>
    </ul>

    <ReceiptPreviewModal v-model="previewOpen" :payment="previewed" />
    <SubmissionReviewModal
      v-model="reviewOpen"
      :submission="target"
      :mode="reviewMode"
      :saving="store.saving"
      @approve="onApprove"
      @reject="onReject"
    />
  </section>
</template>

<style scoped lang="scss">
.pending {
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-md;
  border: 1px solid rgba($alert-warning, 0.35);
  background: rgba($alert-warning, 0.06);
}

.pending__title {
  @include flex(row, flex-start, center, $sp-2);
  margin: 0;
  font-size: $fs-sm;
  font-weight: 700;
}

.pending__list {
  @include flex-col($sp-2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.pending__row {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.pending__info {
  @include flex-col(2px);
  min-width: 0;

  span {
    font-size: $fs-xs;
    color: $text-secondary;
  }
}

.pending__late {
  color: $alert-error !important;
  font-weight: 600;
}

.pending__actions {
  @include flex(row, flex-end, center, $sp-1);
  flex-wrap: wrap;
}
</style>
