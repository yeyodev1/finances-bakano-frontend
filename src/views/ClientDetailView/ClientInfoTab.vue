<script setup lang="ts">
import { computed } from 'vue'
import { BaseBadge, BaseCard } from '@/components/base'
import { useFormat } from '@/composables/useFormat'
import { BILLING_TYPE_LABELS, PAYMENT_METHOD_LABELS } from '@/stores/clients'
import type { Client } from '@/types'

const props = defineProps<{ client: Client }>()

const { formatMoney, formatDate, formatDateTime, dayLabel } = useFormat()

interface Row {
  label: string
  value: string
  icon: string
}

const contact = computed<Row[]>(() => [
  { label: 'Contacto', value: props.client.contactName || '—', icon: 'fa-solid fa-user' },
  { label: 'Email', value: props.client.contactEmail || '—', icon: 'fa-solid fa-envelope' },
  { label: 'Teléfono', value: props.client.contactPhone || '—', icon: 'fa-solid fa-phone' },
  { label: 'Razón social', value: props.client.legalName || '—', icon: 'fa-solid fa-building' },
])

const billing = computed<Row[]>(() => [
  { label: 'Monto mensual', value: formatMoney(props.client.amount), icon: 'fa-solid fa-sack-dollar' },
  { label: 'Moneda', value: props.client.currency || 'USD', icon: 'fa-solid fa-dollar-sign' },
  { label: 'Método de pago', value: PAYMENT_METHOD_LABELS[props.client.paymentMethod], icon: 'fa-solid fa-wallet' },
  { label: 'Tipo de facturación', value: BILLING_TYPE_LABELS[props.client.billingType], icon: 'fa-solid fa-file-invoice' },
  { label: 'Día de emisión', value: dayLabel(props.client.issueDay), icon: 'fa-solid fa-file-export' },
  {
    label: 'Día de cobro',
    value: props.client.collectionDayLabel || dayLabel(props.client.collectionDay),
    icon: 'fa-solid fa-hand-holding-dollar',
  },
])

const rules = computed<Row[]>(() => [
  {
    label: 'Auto-desactivación',
    value: props.client.autoDeactivate ? 'Activada' : 'Desactivada',
    icon: 'fa-solid fa-power-off',
  },
  {
    label: 'Días de gracia',
    value: props.client.graceDays === null || props.client.graceDays === undefined ? 'Global' : String(props.client.graceDays),
    icon: 'fa-solid fa-hourglass-half',
  },
  { label: 'Fecha de inicio', value: formatDate(props.client.startDate), icon: 'fa-solid fa-flag' },
  { label: 'Fecha de fin', value: props.client.endDate ? formatDate(props.client.endDate) : '—', icon: 'fa-solid fa-flag-checkered' },
  {
    label: 'Desactivado el',
    value: props.client.deactivatedAt ? formatDateTime(props.client.deactivatedAt) : '—',
    icon: 'fa-solid fa-ban',
  },
  { label: 'Actualizado', value: formatDateTime(props.client.updatedAt), icon: 'fa-solid fa-clock-rotate-left' },
])
</script>

<template>
  <div class="info">
    <BaseCard title="Contacto">
      <ul class="rows">
        <li v-for="row in contact" :key="row.label">
          <span class="rows__label"><i :class="row.icon" aria-hidden="true" /> {{ row.label }}</span>
          <span class="rows__value">{{ row.value }}</span>
        </li>
      </ul>
    </BaseCard>

    <BaseCard title="Facturación">
      <ul class="rows">
        <li v-for="row in billing" :key="row.label">
          <span class="rows__label"><i :class="row.icon" aria-hidden="true" /> {{ row.label }}</span>
          <span class="rows__value">{{ row.value }}</span>
        </li>
      </ul>

      <div v-if="client.splits?.length" class="splits">
        <p class="splits__title"><i class="fa-solid fa-scissors" aria-hidden="true" /> Cobros divididos</p>
        <ul>
          <li v-for="(split, index) in client.splits" :key="index">
            <span>{{ split.label || `Parte ${index + 1}` }}</span>
            <span>{{ formatMoney(split.amount) }} · {{ dayLabel(split.day) }}</span>
          </li>
        </ul>
      </div>
    </BaseCard>

    <BaseCard title="Reglas y fechas">
      <ul class="rows">
        <li v-for="row in rules" :key="row.label">
          <span class="rows__label"><i :class="row.icon" aria-hidden="true" /> {{ row.label }}</span>
          <span class="rows__value">{{ row.value }}</span>
        </li>
      </ul>
      <p v-if="client.deactivationReason" class="reason">
        <i class="fa-solid fa-circle-info" aria-hidden="true" /> {{ client.deactivationReason }}
      </p>
    </BaseCard>

    <BaseCard title="Etiquetas y notas">
      <div v-if="client.tags?.length" class="tags">
        <BaseBadge v-for="tag in client.tags" :key="tag" variant="neutral" icon="fa-solid fa-tag">{{ tag }}</BaseBadge>
      </div>
      <p v-else class="muted">Sin etiquetas.</p>

      <p class="notes">{{ client.notes || 'Sin notas registradas.' }}</p>
    </BaseCard>
  </div>
</template>

<style scoped lang="scss">
.info {
  display: grid;
  grid-template-columns: 1fr;
  gap: $sp-4;

  @include lg {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.rows {
  @include flex-col($sp-2);
  list-style: none;

  li {
    @include flex-between(center, $sp-3);
    padding: $sp-2 0;
    border-bottom: 1px dashed $border-color;
    font-size: $fs-sm;

    &:last-child {
      border-bottom: none;
    }
  }
}

.rows__label {
  @include flex(row, flex-start, center, $sp-2);
  color: $text-secondary;
  font-size: $fs-xs;

  i {
    width: 16px;
    color: $secondary;
  }
}

.rows__value {
  font-weight: 600;
  color: $primary-dark;
  text-align: right;
}

.splits {
  margin-top: $sp-4;
  padding-top: $sp-3;
  border-top: 1px solid $border-color;

  ul {
    @include flex-col($sp-2);
    list-style: none;
    margin-top: $sp-2;
  }

  li {
    @include flex-between(center, $sp-3);
    font-size: $fs-xs;
    color: $text-secondary;
  }
}

.splits__title {
  @include label-text;

  i {
    margin-right: $sp-2;
    color: $secondary;
  }
}

.tags {
  @include flex(row, flex-start, center, $sp-2);
  flex-wrap: wrap;
  margin-bottom: $sp-3;
}

.notes {
  font-size: $fs-sm;
  line-height: 1.6;
  color: $primary-dark;
  white-space: pre-line;
}

.muted {
  font-size: $fs-xs;
  color: $text-secondary;
  margin-bottom: $sp-3;
}

.reason {
  margin-top: $sp-3;
  padding: $sp-3;
  border-radius: $radius-sm;
  background: $alert-warning-bg;
  color: darken($alert-warning, 18);
  font-size: $fs-xs;
}
</style>
