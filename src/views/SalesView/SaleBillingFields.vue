<script setup lang="ts">
import { computed } from 'vue'
import { BaseDatePicker, BaseInput, BaseSwitch, BaseTextarea } from '@/components/base'
import type { SaleBilling } from '@/types'

/**
 * Datos de facturación del acuerdo. Van con la venta y no con el cliente porque
 * quien cobra casi nunca es quien vendió, y necesita el RUC y la razón social a
 * mano sin salir a buscarlos.
 */
const props = defineProps<{ modelValue: SaleBilling }>()
const emit = defineEmits<{ 'update:modelValue': [value: SaleBilling] }>()

function set<K extends keyof SaleBilling>(key: K, value: SaleBilling[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const needsInvoice = computed({
  get: () => props.modelValue.needsInvoice,
  set: (value: boolean) => set('needsInvoice', value),
})
</script>

<template>
  <section class="billing">
    <header class="billing__head">
      <h3 class="billing__title">
        <i class="fa-solid fa-file-invoice" aria-hidden="true" /> Datos de factura
      </h3>
      <BaseSwitch v-model="needsInvoice" label="Requiere factura" />
    </header>

    <p class="billing__hint">
      <i class="fa-solid fa-circle-info" aria-hidden="true" />
      Anótalos aquí aunque todavía no tengas el número: quien vaya a cobrar necesita la razón
      social y el RUC a mano. El número de factura se puede completar después.
    </p>

    <template v-if="needsInvoice">
      <div class="billing__row">
        <BaseInput
          :model-value="modelValue.legalName ?? ''"
          label="Razón social"
          placeholder="Nombre legal para la factura"
          @update:model-value="set('legalName', String($event))"
        />
        <BaseInput
          :model-value="modelValue.taxId ?? ''"
          label="RUC / Cédula"
          placeholder="Identificación tributaria"
          @update:model-value="set('taxId', String($event))"
        />
      </div>

      <div class="billing__row">
        <BaseInput
          :model-value="modelValue.email ?? ''"
          label="Correo de facturación"
          type="email"
          placeholder="A dónde se envía"
          @update:model-value="set('email', String($event))"
        />
        <BaseInput
          :model-value="modelValue.phone ?? ''"
          label="Teléfono"
          @update:model-value="set('phone', String($event))"
        />
      </div>

      <BaseInput
        :model-value="modelValue.address ?? ''"
        label="Dirección"
        @update:model-value="set('address', String($event))"
      />

      <div class="billing__row">
        <BaseInput
          :model-value="modelValue.invoiceNumber ?? ''"
          label="N.º de factura (si ya se emitió)"
          placeholder="001-001-000000123"
          @update:model-value="set('invoiceNumber', String($event))"
        />
        <BaseDatePicker
          :model-value="modelValue.issuedAt ?? ''"
          label="Fecha de emisión"
          @update:model-value="set('issuedAt', $event || null)"
        />
      </div>

      <BaseTextarea
        :model-value="modelValue.notes ?? ''"
        label="Notas de facturación"
        :rows="2"
        placeholder="Detalle que deba salir en la factura, retenciones, condiciones…"
        @update:model-value="set('notes', String($event))"
      />
    </template>
  </section>
</template>

<style scoped lang="scss">
.billing {
  @include flex-col($sp-3);
  padding: $sp-4;
  border-radius: $radius-sm;
  border: 1px solid $border-color;
}

.billing__head {
  @include flex(row, space-between, center, $sp-3);
  flex-wrap: wrap;
}

.billing__title {
  @include flex(row, flex-start, center, $sp-2);
  font-size: $fs-xs;
  font-weight: 800;
  color: $primary-dark;
  text-transform: uppercase;
  letter-spacing: 0.04em;

  i { color: $primary; }
}

.billing__hint {
  @include flex(row, flex-start, flex-start, $sp-2);
  font-size: $fs-xs;
  line-height: 1.55;
  color: $text-secondary;

  i { color: $alert-info; margin-top: 2px; }
}

.billing__row {
  @include flex(row, flex-start, flex-start, $sp-3);
  flex-wrap: wrap;

  > * { flex: 1 1 200px; min-width: 0; }
}
</style>
