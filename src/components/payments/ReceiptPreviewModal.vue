<script setup lang="ts">
import { computed } from 'vue'
import { BaseButton, BaseModal } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import type { Payment } from '@/types'

const props = defineProps<{ modelValue: boolean; payment: Payment | null }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const { formatMoney, formatDateShort, formatPeriod } = useFormat()

const open = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const url = computed(() => props.payment?.receiptUrl || '')

/**
 * Cloudinary sirve los comprobantes sin extensión a veces, así que se mira
 * también el `resource_type` de la URL antes de rendirse.
 */
const isImage = computed(() =>
  /\.(png|jpe?g|webp|gif|avif|heic)(\?|$)/i.test(url.value) || /\/image\/upload\//.test(url.value)
)
const isPdf = computed(() => /\.pdf(\?|$)/i.test(url.value))

/** El id del cliente llega crudo en el listado; poblado solo en el detalle. */
const clientId = computed(() => {
  const raw = props.payment?.clientId
  if (!raw) return ''
  return typeof raw === 'string' ? raw : raw._id
})
</script>

<template>
  <BaseModal
    v-model="open"
    size="lg"
    icon="fa-solid fa-receipt"
    :title="payment ? `Comprobante · ${payment.clientName}` : 'Comprobante'"
    :subtitle="
      payment
        ? `${formatMoney(payment.amount)} · ${formatDateShort(payment.paidAt)} · ${formatPeriod(payment.period)}`
        : ''
    "
  >
    <div v-if="payment" class="rp">
      <div v-if="!url" class="rp__empty">
        <i class="fa-solid fa-file-circle-question" aria-hidden="true" />
        <p>Este pago no tiene comprobante cargado.</p>
        <small>Se registró sin adjuntar el respaldo.</small>
      </div>

      <img v-else-if="isImage" :src="url" :alt="`Comprobante de ${payment.clientName}`" class="rp__image" />

      <!-- El navegador rinde el PDF; si lo bloquea queda el botón de abrir. -->
      <object v-else-if="isPdf" :data="url" type="application/pdf" class="rp__pdf">
        <p class="rp__fallback">Tu navegador no puede mostrar el PDF aquí.</p>
      </object>

      <div v-else class="rp__empty">
        <i class="fa-solid fa-file-lines" aria-hidden="true" />
        <p>Formato que no se puede previsualizar.</p>
        <small>Ábrelo en una pestaña para verlo.</small>
      </div>

      <dl v-if="payment.reference || payment.notes || payment.registeredByName" class="rp__meta">
        <template v-if="payment.reference">
          <dt>Referencia</dt>
          <dd>{{ payment.reference }}</dd>
        </template>
        <template v-if="payment.registeredByName">
          <dt>Registró</dt>
          <dd>{{ payment.registeredByName }}</dd>
        </template>
        <template v-if="payment.notes">
          <dt>Notas</dt>
          <dd>{{ payment.notes }}</dd>
        </template>
      </dl>
    </div>

    <template #footer>
      <RouterLink v-if="clientId" :to="`/clientes/${clientId}`" class="rp__client" @click="open = false">
        <i class="fa-solid fa-user" aria-hidden="true" /> Ver ficha del cliente
      </RouterLink>
      <!-- BaseButton renderiza un <button>, así que abrir en pestaña va con <a>. -->
      <a v-if="url" :href="url" target="_blank" rel="noopener noreferrer" class="rp__open">
        <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" /> Abrir en pestaña
      </a>
      <BaseButton variant="primary" @click="open = false">Cerrar</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped lang="scss">
.rp {
  @include flex-col($sp-4);
}

.rp__image {
  width: 100%;
  max-height: 60vh;
  object-fit: contain;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
  background: $surface;
}

.rp__pdf {
  width: 100%;
  height: 60vh;
  border: 1px solid $border-color;
  border-radius: $radius-sm;
}

.rp__empty {
  @include flex-col($sp-2);
  align-items: center;
  padding: $sp-8 $sp-4;
  text-align: center;
  color: $text-secondary;
  background: $surface;
  border: 1px dashed $border-color;
  border-radius: $radius-sm;

  i { font-size: $fs-xl; color: $text-secondary; }
  p { font-weight: 600; color: $primary-dark; }
  small { font-size: $fs-xs; }
}

.rp__fallback {
  padding: $sp-4;
  font-size: $fs-xs;
  color: $text-secondary;
}

.rp__meta {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: $sp-2 $sp-3;
  padding-top: $sp-3;
  border-top: 1px solid $border-color;
  font-size: $fs-xs;

  dt { font-weight: 700; color: $text-secondary; }
  dd { color: $primary-dark; }
}

.rp__client,
.rp__open {
  @include flex(row, flex-start, center, $sp-2);
  color: $primary;
  font-size: $fs-xs;
  font-weight: 700;
  text-decoration: none;

  &:hover { text-decoration: underline; }
}

.rp__client { margin-right: auto; }
</style>
